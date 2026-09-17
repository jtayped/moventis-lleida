import z from "zod";
import { TRPCError } from "@trpc/server";
import { type BusPosition, busPositionSchema } from "@moventis/shared";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { getStopSchedule, normalizeText } from "../lib/stop-schedule";
import {
  locateLineBuses,
  type LocatorVariant,
  type ProbeResult,
} from "../lib/bus-locator";
import { toGeometry, toProbeResult } from "../lib/probe";

export const busesRouter = createTRPCRouter({
  /**
   * Infer the live (real-time) bus positions for a whole line, anchored on each
   * variant's destination terminal. Returns one {@link BusPosition} per located
   * bus, each tagged with `lineCode` for colouring; empty when the line has no
   * real-time buses (e.g. a night line in daytime) or no variant matches.
   *
   * A plain query (not a stream): calibration needs ≥2 probes before placing, and
   * the client refetches on a timer — per-bus streaming would add no value here.
   *
   * Throws `INTERNAL_SERVER_ERROR` when every probe failed: an upstream outage
   * must not be reported to the client as "no bus is reporting its position".
   */
  byLine: publicProcedure
    .input(z.object({ routeCode: z.string() }))
    .query(async ({ ctx, input }): Promise<BusPosition[]> => {
      const route = await ctx.db.route.findFirst({
        where: { code: input.routeCode, deletedAt: null },
        select: {
          externalId: true,
          variants: {
            select: {
              direction: true,
              description: true,
              geometry: true,
              stops: {
                orderBy: { sequence: "asc" },
                select: {
                  stop: {
                    select: {
                      id: true,
                      externalId: true,
                      latitude: true,
                      longitude: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!route) return [];

      const variants: LocatorVariant[] = route.variants.map((v) => ({
        direction: v.direction === "V" ? "V" : "I",
        description: normalizeText(v.description),
        geometry: toGeometry(v.geometry),
        stops: v.stops.map((s) => ({
          id: s.stop.id,
          externalId: s.stop.externalId,
          lat: s.stop.latitude,
          lng: s.stop.longitude,
        })),
      }));

      // Per-request cache: a stop shared between variants (or used as both anchor
      // and a neighbour's calibration point) is fetched from Moventis only once.
      const cache = new Map<string, Promise<ProbeResult>>();
      let attempted = 0;
      let failed = 0;
      const probe = (stopExternalId: string): Promise<ProbeResult> => {
        let pending = cache.get(stopExternalId);
        if (!pending) {
          attempted++;
          pending = getStopSchedule(stopExternalId, route.externalId).then(
            (schedule) => {
              if (!schedule) {
                failed++;
                return new Map() as ProbeResult;
              }
              // Resolve each probe against *its own* fetch time. A single `now`
              // captured at the top of the resolver ages by the queue delay
              // between probes, inflating every later ETA — which the locator
              // reads as metres of extra distance and a skewed calibrated speed.
              return toProbeResult(schedule, route.externalId, Date.now());
            },
          );
          cache.set(stopExternalId, pending);
        }
        return pending;
      };

      const positions = await locateLineBuses({
        lineCode: input.routeCode,
        variants,
        probe,
      });

      // A failed probe reads exactly like "no bus is running here": an empty map.
      // With every probe failed, the locator finds nothing and this would resolve
      // `[]`, and the UI would state as fact that no bus on the line is reporting
      // its position. An outage is not an empty timetable — say so, and let the
      // client render its error state. A partial failure still returns what it found.
      if (attempted > 0 && failed === attempted) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Moventis unreachable",
        });
      }

      return positions.map((p) => busPositionSchema.parse(p));
    }),
});
