import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { Stop } from "@moventis/db";
import { getStopSchedule } from "../lib/stop-schedule";
import { TRPCError } from "@trpc/server";
import { SettleCache } from "../lib/settle-cache";
import { utcStartOfLocalDay } from "../lib/zoned-time";
import type { createTRPCContext } from "../trpc";

/** The soonest bus of one line at one stop. */
export interface NextArrival {
  lineCode: string;
  arrivalTime: Date;
  isRealTime: boolean;
}

/** Every line at one stop with a bus still due, soonest first. */
export interface NextArrivals {
  externalId: string;
  lines: NextArrival[];
}

/**
 * How long one stop's next arrivals are shared between callers, measured from
 * settlement. Half the client's 60 s refetch interval, so a client's own
 * refresh always crosses a boundary and sees a fresh read, while several
 * viewers looking at the same street share one upstream request.
 */
export const NEXT_ARRIVALS_TTL_MS = 30_000;

/** ~500 stops in the network, and the viewport moves across them. */
const nextArrivalsCache = new SettleCache<NextArrivals>(
  NEXT_ARRIVALS_TTL_MS,
  600,
);

/** Test hook: the module-level cache would otherwise leak between cases. */
export function clearNextArrivalsCache(): void {
  nextArrivalsCache.clear();
}

type Db = ReturnType<typeof createTRPCContext>["db"];

export const stopsRouter = createTRPCRouter({
  getByRoute: publicProcedure
    .input(z.object({ routeCode: z.string() }))
    .query(async ({ ctx, input }): Promise<Stop[]> => {
      return ctx.db.stop.findMany({
        where: { routes: { some: { code: input.routeCode } }, deletedAt: null },
      });
    }),
  getMany: publicProcedure
    .input(
      z.object({
        routeCodes: z.string().array(),
        query: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<Stop[]> => {
      const { routeCodes, query } = input;
      // If no routes are selected AND there is no search query, return nothing.
      if (routeCodes.length === 0 && !query) {
        return []; // Return an empty array immediately
      }

      const stops = await ctx.db.stop.findMany({
        where: {
          deletedAt: null,
          ...(routeCodes.length > 0 && {
            routes: {
              some: {
                code: {
                  in: routeCodes,
                },
              },
            },
          }),
          ...(query && {
            name: {
              contains: query,
              mode: "insensitive",
            },
          }),
        },
      });

      return stops;
    }),
  /**
   * Bare stops for the saved-stops list (`preferides`), which the client holds as
   * `externalId`s in localStorage and has to resolve to coordinates on every load.
   *
   * Deliberately database-only. `get` fires one live Moventis request per route
   * serving the stop, so resolving N saved stops through it would push ~3N calls
   * through the 5 req/s outbound throttle before the map can draw a single pin.
   *
   * Soft-deleted stops are included, unlike every other stop query here: a saved
   * stop that leaves the network still has to render, or its pin becomes
   * unremovable — the unsave control lives in the drawer that pin opens.
   */
  getByExternalIds: publicProcedure
    .input(z.object({ externalIds: z.string().array().max(200) }))
    .query(async ({ ctx, input }): Promise<Stop[]> => {
      if (input.externalIds.length === 0) return [];
      return ctx.db.stop.findMany({
        // `deletedAt: undefined` is not a no-op here: the client extension in
        // `packages/db/index.ts` spreads `{ deletedAt: null, ...where }` into every
        // `stop.findMany`, so an omitted key silently means "live rows only". The
        // explicit `undefined` overrides the injected null and restores "no filter".
        where: { deletedAt: undefined, externalId: { in: input.externalIds } },
      });
    }),
  /**
   * Keyed by `externalId` rather than the internal cuid: this id is what the
   * frontend puts in the `?stop=` URL param, so it has to stay stable across
   * database rebuilds (the scraper upserts stops by `externalId`).
   *
   * `failedRoutes` carries the `code` of every route whose live fetch came back
   * unavailable, so the client can say which lines are missing instead of showing
   * a short timetable as if it were complete; if *every* route failed this throws
   * instead, because an outage is not an empty timetable.
   */
  get: publicProcedure
    .input(z.object({ externalId: z.string() }))
    .query(async ({ input, ctx }) => {
      const stop = await ctx.db.stop.findUnique({
        where: { externalId: input.externalId },
        // The `deletedAt: null` extension only covers `findMany`, so an included
        // relation comes back unfiltered: without this, a withdrawn route is still
        // probed against Moventis on every open of the stop.
        include: { routes: { where: { deletedAt: null } } },
      });

      if (!stop) throw new TRPCError({ code: "NOT_FOUND" });

      // Skip the live schedule fetch for a soft-deleted stop — it no longer exists
      // in the Moventis API and the request would fail or return stale data. A stop
      // whose every route has been withdrawn is the same case with a different
      // cause, so it takes the same exit rather than throwing: the stop still
      // renders (it may be saved), just with nothing to show.
      if (stop.deletedAt || stop.routes.length === 0) {
        return { ...stop, schedules: [], failedRoutes: [] as string[] };
      }

      const scheduleResults = await Promise.all(
        stop.routes.map((route) =>
          getStopSchedule(stop.externalId, route.externalId),
        ),
      );
      const failedRoutes = stop.routes
        .filter((_, i) => scheduleResults[i] === null)
        .map((route) => route.code);
      if (failedRoutes.length === stop.routes.length) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Moventis unreachable",
        });
      }

      const allSchedules = scheduleResults
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .flat();

      // Keep only schedules for routes this stop belongs to — the Moventis API
      // returns schedules for all cities it operates in (e.g. Palma de Mallorca
      // lines 107, 123), and also deduplicates overlapping entries from fetching
      // multiple routes at the same stop.
      const validCodes = new Set(stop.routes.map((r) => r.code));
      const schedules = [
        ...new Map(allSchedules.map((s) => [s.externalLineId, s])).values(),
      ].filter((s) => validCodes.has(s.lineCode));

      return { ...stop, schedules, failedRoutes };
    }),
  /**
   * The soonest bus of each line at one stop — what the map pin shows once the
   * user has zoomed in far enough to read it.
   *
   * **One upstream request per stop, not one per route.** `GetTiemposParada`
   * answers with every line serving the stop whatever route id it is asked
   * about (pinned by `schedule-contract.test.ts` against the recorded
   * snapshots), so unlike `get` — which fans out over the stop's routes and
   * merges — this asks once and reads the whole thing out of that one answer.
   * The pin layer spends one of these per visible stop, so that difference is
   * the feature's entire budget against the 5 req/s gate.
   *
   * Deliberately not parameterised by the lines the caller cares about: keying
   * the cache on the stop alone lets every viewer share an entry whatever they
   * have selected, and leaves the client to pick which of these lines to show.
   */
  nextArrivals: publicProcedure
    .input(z.object({ externalId: z.string() }))
    .query(({ ctx, input }): Promise<NextArrivals> =>
      nextArrivalsCache.get(input.externalId, () =>
        loadNextArrivals(ctx.db, input.externalId),
      ),
    ),
});

async function loadNextArrivals(
  db: Db,
  externalId: string,
): Promise<NextArrivals> {
  const now = new Date();
  const today = utcStartOfLocalDay(now);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const stop = await db.stop.findUnique({
    where: { externalId },
    include: {
      // `findUnique` is outside the `deletedAt: null` extension and an included
      // relation is unfiltered either way, so a withdrawn route would otherwise
      // be a candidate to probe against Moventis. Same filter as `get`.
      routes: {
        where: { deletedAt: null },
        select: {
          code: true,
          externalId: true,
          operatingDays: { where: { date: { gte: today, lt: tomorrow } } },
        },
        orderBy: { externalId: "asc" },
      },
    },
  });

  if (!stop) throw new TRPCError({ code: "NOT_FOUND" });

  // A soft-deleted stop no longer exists upstream, and one whose every route
  // has been withdrawn is the same case with a different cause. Neither is an
  // error: the pin still renders (it may be saved), it just has nothing to say.
  if (stop.deletedAt || stop.routes.length === 0)
    return { externalId, lines: [] };

  // Any of the stop's route ids returns the same list, so the choice only
  // matters for the one way it can fail: a line that is dormant today answers
  // the `{"idLinea":"N"}` sentinel, which parses to nothing at all. Prefer a
  // route with an operating day in Lleida's calendar today — `orderBy` above
  // makes the fallback deterministic rather than whatever the join returned.
  const route =
    stop.routes.find((r) => r.operatingDays.length > 0) ?? stop.routes[0]!;

  // `"low"`: nobody asked for this stop, the map is guessing they might glance
  // at it. It must never be the reason a drawer someone actually tapped waits —
  // which, before the lane existed, it measurably was.
  const schedules = await getStopSchedule(externalId, route.externalId, "low");
  // Unreachable, not empty. A pin saying "no bus is coming" because Moventis
  // timed out is worse than a pin saying nothing — the client renders neither,
  // and the rejection evicts the cache entry so the next caller retries.
  if (!schedules)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Moventis unreachable",
    });

  // The upstream response carries lines from every city Moventis operates in
  // (Palma de Mallorca 107, 123 turn up in Lleida stops), so the stop's own
  // routes are the allowlist — the same guard `get` applies to its merge.
  const validCodes = new Set(stop.routes.map((r) => r.code));

  const soonest = new Map<string, NextArrival>();
  for (const schedule of schedules) {
    if (!validCodes.has(schedule.lineCode)) continue;
    for (const journey of schedule.journeys) {
      for (const time of journey.scheduledTimes) {
        if (time.arrivalTime.getTime() <= now.getTime()) continue;
        const best = soonest.get(schedule.lineCode);
        if (best && best.arrivalTime.getTime() <= time.arrivalTime.getTime())
          continue;
        soonest.set(schedule.lineCode, {
          lineCode: schedule.lineCode,
          arrivalTime: time.arrivalTime,
          isRealTime: time.isRealTime,
        });
      }
    }
  }

  const lines = [...soonest.values()].sort(
    (a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime(),
  );

  return { externalId, lines };
}
