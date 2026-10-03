import { TIME_ZONE, type StoredTimetable } from "@moventis/shared";
import { parseDateStr, toYyyymmdd } from "./api.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const lleidaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The Lleida calendar date of an instant, as `YYYYMMDD`. Not `toYyyymmdd`,
 * which answers in UTC: between 22:00 and midnight UTC in summer, Lleida is
 * already on the next day, and "today's timetable" has to mean Lleida's.
 */
export function lleidaDate(instant: Date): string {
  const parts = Object.fromEntries(
    lleidaDay.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}`;
}

/** `YYYYMMDD` shifted by whole days (calendar arithmetic, no zone involved). */
export function addDays(date: string, days: number): string {
  return toYyyymmdd(new Date(parseDateStr(date).getTime() + days * DAY_MS));
}

/**
 * The operating dates inside `[today, today + horizonDays)`, ascending. Only
 * dates the line runs are fetched; `GetParadas` would answer the rest with an
 * empty day anyway.
 */
export function timetableDates(
  operatingDates: readonly string[],
  today: string,
  horizonDays: number,
): string[] {
  const last = addDays(today, horizonDays - 1);
  return [...new Set(operatingDates)]
    .filter((d) => d >= today && d <= last)
    .sort();
}

export interface TimetableKey {
  trayectoId: number;
  /** `YYYYMMDD`. */
  date: string;
}

export type TimetableFetch = TimetableKey & {
  outcome:
    | { kind: "trips"; timetable: StoredTimetable }
    | { kind: "empty" }
    | { kind: "failed" };
};

export interface TimetableWrites {
  upserts: (TimetableKey & { timetable: StoredTimetable })[];
  /** Rows the API answered for with no service that day. */
  deletes: TimetableKey[];
  /**
   * When set, every row of the line dated inside this range that is not among
   * `upserts` goes too: the run saw the line's whole horizon, so a row it did
   * not rewrite belongs to a trayecto or a date the line no longer has.
   */
  sweep: { from: string; to: string } | null;
}

/**
 * What one line's timetable fetches allow us to write. The same rule as the
 * rest of the sync: a row is replaced only by an answer, never by a failure,
 * and anything is removed for being *absent* only when the run saw everything —
 * a complete calendar and every fetch answered.
 */
export function planTimetableWrites(
  fetches: readonly TimetableFetch[],
  opts: { calendarProbed: boolean; horizon: { from: string; to: string } },
): TimetableWrites {
  const upserts: TimetableWrites["upserts"] = [];
  const deletes: TimetableKey[] = [];
  let failed = false;
  for (const { trayectoId, date, outcome } of fetches) {
    if (outcome.kind === "trips")
      upserts.push({ trayectoId, date, timetable: outcome.timetable });
    else if (outcome.kind === "empty") deletes.push({ trayectoId, date });
    else failed = true;
  }
  const complete = opts.calendarProbed && !failed;
  return { upserts, deletes, sweep: complete ? opts.horizon : null };
}
