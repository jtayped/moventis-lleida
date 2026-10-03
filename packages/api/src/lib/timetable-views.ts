import type { StoredTimetable } from "@moventis/shared";

/**
 * What the line and stop pages show from stored `Timetable` rows.
 *
 * Rows are one trayecto segment on one service date, read back through
 * `readStoredTimetable`. Everything here is pure: the router loads rows and
 * passes them in, so the rules below are tested against recorded fixtures
 * rather than a database.
 *
 * The pages answer "when does it leave", so they read a stop's column and never
 * trust trip ids, which on a loop can carry another bus's times at the closing
 * stops (see `StoredTimetable`). Times stay in the stored footing: minutes after
 * the service day's midnight, past 1440 after midnight.
 */

export const DAY_TYPES = ["weekday", "saturday", "sunday"] as const;
export type DayType = (typeof DAY_TYPES)[number];

/** One stored service date (`YYYY-MM-DD`) per day type. Absent when the stored window has none. */
export type ServiceDays = Partial<Record<DayType, string>>;

/** Minutes after the service day's midnight, ascending, per day type that runs. */
export type DayDepartures = Partial<Record<DayType, number[]>>;

export function dayTypeOf(date: string): DayType {
  // A bare calendar date: read it at UTC midnight, where it means itself.
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (weekday === 6) return "saturday";
  if (weekday === 0) return "sunday";
  return "weekday";
}

/**
 * Pick the date each day type is shown from.
 *
 * The scraper keeps a rolling week, so there is one Saturday, one Sunday and up
 * to five weekdays. The weekday with the most rows wins: a public holiday runs
 * fewer lines (9, 10 and 16 are weekday-only) and would otherwise stand in for
 * every weekday. Ties go to the earliest date.
 */
export function pickServiceDays(
  counts: { date: string; rows: number }[],
): ServiceDays {
  const days: ServiceDays = {};
  const best: Partial<Record<DayType, number>> = {};
  const byDate = [...counts].sort((a, b) => a.date.localeCompare(b.date));
  for (const { date, rows } of byDate) {
    const type = dayTypeOf(date);
    const current = best[type];
    if (current === undefined || rows > current) {
      days[type] = date;
      best[type] = rows;
    }
  }
  return days;
}

/** Every time listed at these positions, from paired trips and `unpaired` alike. */
function timesAt(timetable: StoredTimetable, positions: number[]): number[] {
  const times = new Set<number>();
  for (const position of positions) {
    for (const trip of timetable.trips) {
      const time = trip.times[position];
      if (time !== null && time !== undefined) times.add(time);
    }
    for (const entry of timetable.unpaired ?? []) {
      if (entry.position === position) entry.times.forEach((t) => times.add(t));
    }
  }
  return [...times].sort((a, b) => a - b);
}

/**
 * When buses leave `stopId` on this segment, ascending, each minute once.
 *
 * Reads every position the stop holds, because a loop passes some stops twice.
 * The segment's last position is left out: a bus there is arriving to finish,
 * and whatever it runs next (the return, the next lap, a concatenated variant's
 * second segment) lists the same stop again as its first position.
 */
export function departuresAt(
  timetable: StoredTimetable,
  stopId: string,
): number[] {
  const last = timetable.stops.length - 1;
  const positions = timetable.stops.flatMap((id, position) =>
    id === stopId && position !== last ? [position] : [],
  );
  return timesAt(timetable, positions);
}

/** When buses leave the segment's first stop. */
export function originDepartures(timetable: StoredTimetable): number[] {
  return timetable.stops.length > 1 ? timesAt(timetable, [0]) : [];
}

/**
 * The usual gap between departures, in whole minutes: the median, so a midday
 * gap or the first bus of the morning does not drag it. Null under three
 * departures, where a frequency means nothing.
 */
export function typicalHeadway(departures: number[]): number | null {
  if (departures.length < 3) return null;
  const gaps = departures
    .slice(1)
    .map((t, i) => t - departures[i]!)
    .sort((a, b) => a - b);
  return gaps[Math.floor((gaps.length - 1) / 2)]!;
}

export interface VariantInput {
  description: string;
  direction: string;
  isPrincipal: boolean;
  /** `RouteVariant.trayectoIds`, in the variant's order. */
  trayectoIds: number[];
}

export interface TimetableRowInput {
  trayectoId: number;
  /** Service date, `YYYY-MM-DD`. */
  date: string;
  timetable: StoredTimetable;
}

export interface LineSegment {
  trayectoId: number;
  /** The variant's name from Moventis. A concatenated variant's segments share it. */
  description: string;
  direction: string;
  isPrincipal: boolean;
  /** `Stop.externalId` in order. The first is where the departures are from. */
  stops: string[];
  departures: DayDepartures;
}

/**
 * One entry per trayecto segment that runs on any of the service days, in the
 * variants' order.
 *
 * A segment rather than a variant, because that is what a timetable row is and
 * what a trip actually runs: line 6's "pla d'urgell - agrònoms" is two segments,
 * out and back, each with its own first stop and its own departures.
 */
export function lineSegments(
  variants: VariantInput[],
  rows: TimetableRowInput[],
  days: ServiceDays,
): LineSegment[] {
  const rowFor = new Map(
    rows.map((row) => [`${row.trayectoId}/${row.date}`, row.timetable]),
  );
  const seen = new Set<number>();
  const segments: LineSegment[] = [];

  for (const variant of variants) {
    for (const trayectoId of variant.trayectoIds) {
      if (seen.has(trayectoId)) continue;
      seen.add(trayectoId);

      let stops: string[] | undefined;
      const departures: DayDepartures = {};
      for (const type of DAY_TYPES) {
        const date = days[type];
        const timetable = date && rowFor.get(`${trayectoId}/${date}`);
        if (!timetable) continue;
        const times = originDepartures(timetable);
        if (times.length === 0) continue;
        departures[type] = times;
        stops ??= timetable.stops;
      }
      if (!stops) continue;

      segments.push({
        trayectoId,
        description: variant.description,
        direction: variant.direction,
        isPrincipal: variant.isPrincipal,
        stops,
        departures,
      });
    }
  }

  return segments;
}

export interface DaySummary {
  /** Earliest departure from any segment's first stop. */
  first: number;
  /** Latest departure from any segment's first stop. */
  last: number;
  /** {@link typicalHeadway} of the busiest segment. */
  headway: number | null;
}

/**
 * First bus, last bus and frequency for each day type the line runs.
 *
 * The frequency comes from one segment, the one with the most departures that
 * day: gaps between departures from different first stops measure nothing.
 */
export function lineSummary(
  segments: LineSegment[],
): Partial<Record<DayType, DaySummary>> {
  const summary: Partial<Record<DayType, DaySummary>> = {};
  for (const type of DAY_TYPES) {
    const lists = segments.flatMap((s) => {
      const times = s.departures[type];
      return times ? [times] : [];
    });
    if (lists.length === 0) continue;
    const busiest = lists.reduce((a, b) => (b.length > a.length ? b : a));
    summary[type] = {
      first: Math.min(...lists.map((times) => times[0]!)),
      last: Math.max(...lists.map((times) => times[times.length - 1]!)),
      headway: typicalHeadway(busiest),
    };
  }
  return summary;
}

export interface StopRowInput extends TimetableRowInput {
  /** `Route.code` of the row's line. */
  lineCode: string;
}

export interface StopDepartureGroup {
  lineCode: string;
  /**
   * `Stop.externalId` of the last stop of the segments in this group: where
   * the bus is heading. Equal to the stop itself on a loop's terminal.
   */
  destination: string;
  departures: DayDepartures;
}

/**
 * What leaves one stop, per line and destination, per day type.
 *
 * Segments that share a line and a last stop are merged: someone at the stop
 * wants "the next 2 towards the hospital", not one list per Moventis variant
 * (line 2 runs two loops from the same terminal). Groups come out by line
 * code, then destination id, so the order is stable.
 */
export function stopDepartures(
  stopId: string,
  rows: StopRowInput[],
  days: ServiceDays,
): StopDepartureGroup[] {
  const dateType = new Map<string, DayType>();
  for (const type of DAY_TYPES) {
    const date = days[type];
    if (date) dateType.set(date, type);
  }

  const groups = new Map<string, StopDepartureGroup>();
  const times = new Map<string, Set<number>>();
  for (const row of rows) {
    const type = dateType.get(row.date);
    if (!type) continue;
    const departures = departuresAt(row.timetable, stopId);
    if (departures.length === 0) continue;

    const destination = row.timetable.stops[row.timetable.stops.length - 1]!;
    const key = `${row.lineCode}/${destination}`;
    if (!groups.has(key)) {
      groups.set(key, { lineCode: row.lineCode, destination, departures: {} });
    }
    const timesKey = `${key}/${type}`;
    const set = times.get(timesKey) ?? new Set<number>();
    departures.forEach((t) => set.add(t));
    times.set(timesKey, set);
  }

  for (const [key, group] of groups) {
    for (const type of DAY_TYPES) {
      const set = times.get(`${key}/${type}`);
      if (set) group.departures[type] = [...set].sort((a, b) => a - b);
    }
  }

  return [...groups.values()].sort(
    (a, b) =>
      a.lineCode.localeCompare(b.lineCode, undefined, { numeric: true }) ||
      a.destination.localeCompare(b.destination),
  );
}
