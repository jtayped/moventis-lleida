import z from "zod";
import { TRPCError } from "@trpc/server";
import {
  RESTRICTED_BOUNDS,
  type DirectionsPlan,
  type LiveDeparture,
  type Schedules,
} from "@moventis/shared";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { getStopSchedule, normalizeText } from "../lib/stop-schedule";
import { SettleCache } from "../lib/settle-cache";
import { lleidaServiceDate, serviceSecondOf } from "../lib/zoned-time";
import { getNetwork } from "../lib/directions/load";
import { planJourneys } from "../lib/directions/plan";
import { toItinerary, walkOnlyLeg } from "../lib/directions/itinerary";
import { liveIndexFor } from "../lib/directions/live-match";

const pointSchema = z.object({
  lat: z.number().min(RESTRICTED_BOUNDS.south).max(RESTRICTED_BOUNDS.north),
  lng: z.number().min(RESTRICTED_BOUNDS.west).max(RESTRICTED_BOUNDS.east),
});

/** The scraper keeps a week of timetables; nothing further ahead can be planned. */
const MAX_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;
/** A requested departure this far in the past (a client clock behind, a slow tap) is read as now. */
const PAST_TOLERANCE_MS = 5 * 60_000;

/** Scheduled departures considered when matching a live list: already due ones may still be at the stop. */
const LIVE_LOOKBACK_S = 30 * 60;
const LIVE_LOOKAHEAD_S = 3 * 60 * 60;

/**
 * One stop's live listing, shared between the cards of every itinerary that
 * boards there and between viewers for a few seconds. Shorter than the
 * client's 30 s refetch, so each refresh of one client reads afresh.
 */
const LIVE_TTL_MS = 20_000;
const liveCache = new SettleCache<Schedules>(LIVE_TTL_MS, 300);

/** Test hook: the module-level cache would otherwise leak between cases. */
export function clearLiveDepartureCache(): void {
  liveCache.clear();
}

/**
 * The API's journey names and the scraper's variant descriptions spell the
 * same journey with different spacing and accents ("agronoms" / "agrònoms").
 */
const journeyKey = (s: string) =>
  normalizeText(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

export const directionsRouter = createTRPCRouter({
  /**
   * Bus itineraries between two points, leaving now or at `departAt`, from the
   * stored timetable alone — no live request, so it answers in milliseconds.
   * Live predictions for a boarding are `liveDeparture`, asked per card.
   */
  plan: publicProcedure
    .input(
      z.object({
        from: pointSchema,
        to: pointSchema,
        departAt: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<DirectionsPlan> => {
      const now = Date.now();
      if (input.departAt && input.departAt.getTime() < now - PAST_TOLERANCE_MS)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "departure is in the past",
        });
      const leave =
        input.departAt && input.departAt.getTime() > now
          ? input.departAt
          : new Date(now);
      if (leave.getTime() > now + MAX_AHEAD_MS)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "departure is beyond the stored timetable",
        });

      const serviceDate = lleidaServiceDate(leave);
      const network = await getNetwork(ctx.db, serviceDate);
      // Not "no buses": an outage must not reach the UI as an empty city.
      if (network.tripCount === 0)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `no timetable stored for ${serviceDate}`,
        });

      const departAt = serviceSecondOf(serviceDate, leave);
      const { journeys, walkOnlyMeters } = planJourneys(network, {
        from: input.from,
        to: input.to,
        departAt,
      });
      const context = { serviceDate, from: input.from, to: input.to };
      return {
        serviceDate,
        itineraries: journeys.map((j) => toItinerary(network, j, context)),
        walkOnly:
          walkOnlyMeters === null
            ? null
            : walkOnlyLeg(walkOnlyMeters, departAt, context),
        missingLines: network.missingLines,
      };
    }),

  /**
   * The live prediction for one timetabled departure at a stop, or null when
   * the stop does not list it (yet), the listing is unavailable, or the
   * departure is not one the timetable knows. One Moventis request per stop
   * and line, through the high lane: someone is looking at the card.
   */
  liveDeparture: publicProcedure
    .input(
      z.object({
        stopExternalId: z.string().min(1),
        lineCode: z.string().min(1),
        headsign: z.string(),
        scheduledAt: z.date(),
      }),
    )
    .query(async ({ ctx, input }): Promise<LiveDeparture | null> => {
      const route = await ctx.db.route.findFirst({
        where: { code: input.lineCode, deletedAt: null },
        select: { id: true, externalId: true },
      });
      if (!route)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `unknown line ${input.lineCode}`,
        });

      const serviceDate = lleidaServiceDate(input.scheduledAt);
      const network = await getNetwork(ctx.db, serviceDate);
      const stop = network.stopIndex.get(input.stopExternalId);
      if (stop === undefined) return null;

      const key = journeyKey(input.headsign);
      const now = serviceSecondOf(serviceDate, new Date());
      const departure = serviceSecondOf(serviceDate, input.scheduledAt);
      const scheduled = [
        ...new Set(
          (network.patternsAtStop[stop] ?? []).flatMap(
            ({ pattern, position }) =>
              network.patterns[pattern]!.trips.filter(
                (t) => t.routeId === route.id && journeyKey(t.headsign) === key,
              ).map((t) => t.times[position]!),
          ),
        ),
      ]
        .filter(
          (t) =>
            t >= Math.min(now, departure) - LIVE_LOOKBACK_S &&
            t <= now + LIVE_LOOKAHEAD_S,
        )
        .sort((a, b) => a - b);
      if (!scheduled.includes(departure)) return null;

      let schedules: Schedules;
      try {
        // Keyed by line too: asked with a line that is dormant today, the
        // endpoint answers with its no-service stub for the whole stop.
        schedules = await liveCache.get(
          `${input.stopExternalId}:${route.externalId}`,
          async () => {
            const s = await getStopSchedule(
              input.stopExternalId,
              route.externalId,
              "high",
            );
            if (!s) throw new Error("live listing unavailable");
            return s;
          },
        );
      } catch (err) {
        console.warn("[directions] live departure unavailable:", err);
        return null;
      }

      const journey = schedules
        .find((s) => s.externalLineId === route.externalId)
        ?.journeys.find((j) => journeyKey(j.name) === key);
      if (!journey) return null;

      const live = [...journey.scheduledTimes]
        .map((t) => ({
          ...t,
          sec: serviceSecondOf(serviceDate, t.arrivalTime),
        }))
        .sort((a, b) => a.sec - b.sec);
      const index = liveIndexFor(
        departure,
        scheduled,
        live.map((l) => l.sec),
      );
      const match = live[index];
      return match
        ? { predictedAt: match.arrivalTime, isRealTime: match.isRealTime }
        : null;
    }),
});
