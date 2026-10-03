import z from "zod";
import { TRPCError } from "@trpc/server";
import { RESTRICTED_BOUNDS, type DirectionsPlan } from "@moventis/shared";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { lleidaServiceDate, serviceSecondOf } from "../lib/zoned-time";
import { getNetwork } from "../lib/directions/load";
import { planLive } from "../lib/directions/live-plan";
import { toItinerary, walkOnlyLeg } from "../lib/directions/itinerary";

const pointSchema = z.object({
  lat: z.number().min(RESTRICTED_BOUNDS.south).max(RESTRICTED_BOUNDS.north),
  lng: z.number().min(RESTRICTED_BOUNDS.west).max(RESTRICTED_BOUNDS.east),
});

/** The scraper keeps a week of timetables; nothing further ahead can be planned. */
const MAX_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;
/** A requested departure this far in the past (a client clock behind, a slow tap) is read as now. */
const PAST_TOLERANCE_MS = 5 * 60_000;

export const directionsRouter = createTRPCRouter({
  /**
   * Bus itineraries between two points, leaving now or at `departAt`. The
   * stored timetable finds the journeys; what Moventis lists at their stops
   * right now times them (`lib/directions/live-plan.ts`), so this costs up to
   * a dozen requests through the queue's batch lane and answers in a second
   * or a few. Leaving more than an hour ahead, or with Moventis unreachable,
   * the times are the timetable's and each bus leg says so.
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
      const { journeys, walkOnlyMeters } = await planLive(network, {
        from: input.from,
        to: input.to,
        departAt,
        serviceDate,
        now: serviceSecondOf(serviceDate, new Date(now)),
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
});
