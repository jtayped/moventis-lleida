import { db } from "@moventis/db";
import { Prisma } from "@prisma/client";
import { fetchParadas, parseDateStr } from "../lib/api.js";
import type { ResolvedLine } from "../lib/discovery.js";
import { mapWithConcurrency } from "../lib/pool.js";
import {
  addDays,
  lleidaDate,
  planTimetableWrites,
  timetableDates,
  type TimetableFetch,
} from "../lib/timetables.js";

/**
 * Days of timetable kept ahead, today included. A week is what lets the planner
 * and the timetable pages ride out several failed nightly runs (August 2026 had
 * three in a row) without going blank.
 */
export const TIMETABLE_HORIZON_DAYS = 7;

/** Simultaneous `GetParadas` requests for one line. */
const TIMETABLE_CONCURRENCY = 4;

/**
 * Fetch and store one line's timetable for every segment of every trayecto,
 * for each date it runs inside the horizon. ~7 segments × 7 days for the
 * biggest line; every write for the line lands in one transaction.
 */
export async function syncTimetables(
  routeId: string,
  line: ResolvedLine,
  today: string = lleidaDate(new Date()),
): Promise<void> {
  const horizon = {
    from: today,
    to: addDays(today, TIMETABLE_HORIZON_DAYS - 1),
  };
  const dates = timetableDates(
    line.operatingDates,
    today,
    TIMETABLE_HORIZON_DAYS,
  );
  // GetParadas is keyed by segment: a concatenated variant (line 6 `{2,3}`) is
  // two requests, and its primary id would fetch some other trayecto.
  const segmentIds = [...new Set(line.trayectos.flatMap((t) => t.ID_TRAYECTO))];
  const keys = segmentIds.flatMap((trayectoId) =>
    dates.map((date) => ({ trayectoId, date })),
  );

  const fetches = await mapWithConcurrency(
    keys,
    TIMETABLE_CONCURRENCY,
    async (key): Promise<TimetableFetch> => {
      try {
        const timetable = await fetchParadas(
          line.externalId,
          key.trayectoId,
          key.date,
        );
        return {
          ...key,
          outcome:
            timetable.trips.length > 0
              ? { kind: "trips", timetable }
              : { kind: "empty" },
        };
      } catch (err) {
        console.warn(
          `  [${line.code}] GetParadas ${key.trayectoId}/${key.date} failed:`,
          err instanceof Error ? err.message : err,
        );
        return { ...key, outcome: { kind: "failed" } };
      }
    },
  );

  const writes = planTimetableWrites(fetches, {
    calendarProbed: line.calendarProbed,
    horizon,
  });

  const keyWhere = (k: { trayectoId: number; date: string }) => ({
    trayectoId: k.trayectoId,
    date: parseDateStr(k.date),
  });

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (writes.sweep) {
    // Spelled out instead of `NOT: { OR: [] }`, whose meaning on an empty list
    // is exactly the kind of Prisma edge that once pruned the whole network.
    const range = {
      routeId,
      date: {
        gte: parseDateStr(writes.sweep.from),
        lte: parseDateStr(writes.sweep.to),
      },
    };
    ops.push(
      db.timetable.deleteMany({
        where:
          writes.upserts.length > 0
            ? { ...range, NOT: { OR: writes.upserts.map(keyWhere) } }
            : range,
      }),
    );
  } else if (writes.deletes.length > 0) {
    ops.push(
      db.timetable.deleteMany({
        where: { routeId, OR: writes.deletes.map(keyWhere) },
      }),
    );
  }
  for (const { trayectoId, date, timetable } of writes.upserts) {
    const data = {
      stops: timetable.stops,
      trips: timetable.trips,
      unpaired: timetable.unpaired ?? Prisma.DbNull,
    };
    ops.push(
      db.timetable.upsert({
        where: {
          routeId_trayectoId_date: {
            routeId,
            trayectoId,
            date: parseDateStr(date),
          },
        },
        update: data,
        create: { routeId, trayectoId, date: parseDateStr(date), ...data },
      }),
    );
  }
  if (ops.length > 0) await db.$transaction(ops);

  const failed = fetches.filter((f) => f.outcome.kind === "failed").length;
  console.log(
    `  [${line.code}] timetables: ${writes.upserts.length} day(s) stored, ` +
      `${writes.deletes.length} without service` +
      (failed > 0 ? `, ${failed} failed (kept previous)` : "") +
      (writes.sweep ? "" : " — not swept"),
  );
}

/**
 * Drop timetables that have rolled out of use. Yesterday stays: its trips past
 * midnight (n1 runs to 05:15) are still today's service.
 */
export async function pruneTimetables(
  today: string = lleidaDate(new Date()),
): Promise<void> {
  const { count } = await db.timetable.deleteMany({
    where: { date: { lt: parseDateStr(addDays(today, -1)) } },
  });
  if (count > 0)
    console.log(`[sync-all] Removed ${count} past timetable day(s).`);
}
