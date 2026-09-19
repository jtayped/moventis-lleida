import z from "zod";
import { TRPCError } from "@trpc/server";
import { type BusPosition, busPositionSchema } from "@moventis/shared";
import type { createTRPCContext } from "../trpc";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { getStopSchedule, normalizeText } from "../lib/stop-schedule";
import {
  locateLineBuses,
  type LocatorVariant,
  type ProbeResult,
} from "../lib/bus-locator";
import { toGeometry, toProbeResult } from "../lib/probe";
import { SettleCache } from "../lib/settle-cache";

/**
 * How long one line's located positions are shared between callers, measured
 * from when the computation *settled*. The locator spends ~7–15 Moventis
 * requests per variant, so every viewer of a line refetching on their own 25 s
 * timer would multiply that by the audience; sharing one computation per line
 * for a few seconds makes the probe budget a per-line cost rather than a
 * per-user one. Shorter than the client's refetch interval, so consecutive
 * refreshes of one client still see fresh reads.
 */
export const LINE_CACHE_TTL_MS = 10_000;

/** 14 lines in the network; the bound is slack, not a working constraint. */
const lineCache = new SettleCache<BusPosition[]>(LINE_CACHE_TTL_MS, 64);

/** Test hook: the module-level cache would otherwise leak between cases. */
export function clearLineBusesCache(): void {
  lineCache.clear();
}

export const busesRouter = createTRPCRouter({
  /**
   * Infer the live (real-time) bus positions for a whole line. Returns one
   * {@link BusPosition} per bus bracketed between two probed stops, each tagged
   * with `lineCode` for colouring; empty when the line has no real-time buses
   * (e.g. a night line in daytime) or no variant matches.
   *
   * A plain query (not a stream): the locator needs its coarse pass before it
   * can place anything, and the client refetches on a timer.
   *
   * Throws `INTERNAL_SERVER_ERROR` when every probe failed: an upstream outage
   * must not be reported to the client as "no bus is reporting its position".
   */
  byLine: publicProcedure
    .input(z.object({ routeCode: z.string() }))
    .query(({ ctx, input }): Promise<BusPosition[]> =>
      lineCache.get(input.routeCode, () => locate(ctx.db, input.routeCode)),
    ),
});

type Db = ReturnType<typeof createTRPCContext>["db"];

async function locate(db: Db, routeCode: string): Promise<BusPosition[]> {
  const route = await db.route.findFirst({
    where: { code: routeCode, deletedAt: null },
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

  // One reference instant for every probe of this call: the locator compares
  // ETAs across stops to the second, and each response's arrival times are
  // absolute, so rebasing them all on the same `now` is exact.
  const now = Date.now();
  let attempted = 0;
  let failed = 0;
  const probe = async (stopExternalId: string): Promise<ProbeResult | null> => {
    attempted++;
    const schedule = await getStopSchedule(stopExternalId, route.externalId);
    if (!schedule) {
      failed++;
      return null;
    }
    return toProbeResult(schedule, route.externalId, now);
  };

  const { positions } = await locateLineBuses({
    lineCode: routeCode,
    variants,
    probe,
  });

  // With every probe failed the locator finds nothing, and resolving `[]` would
  // let the UI state as fact that no bus on the line is reporting its position.
  // An outage is not an empty timetable — say so, and let the client render its
  // error state. A partial failure still returns what it found.
  if (attempted > 0 && failed === attempted) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Moventis unreachable",
    });
  }

  return positions.map((p) => busPositionSchema.parse(p));
}
