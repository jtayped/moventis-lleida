import {
  distanceMeters,
  type LngLat,
  type StoredTimetable,
} from "@moventis/shared";

/**
 * The transit network one service day offers, built from stored timetables
 * into the shape RAPTOR scans: **patterns** (one exact stop sequence each)
 * holding **trips** (one time per stop, never decreasing, and never overtaking
 * the trip before them in the same pattern), plus walking **footpaths**
 * between nearby stops.
 *
 * Stored rows are per Moventis trip id, and those ids are not rides. Two
 * repairs turn them into rides, both verified against live responses (see the
 * `paradas-*` fixtures in `@moventis/shared/fixtures`):
 *
 * - **Split** where time runs backwards or jumps by more than
 *   {@link MAX_HOP_MIN}: on line 2 trip 125 runs positions 0–22 and then
 *   carries a depot pull-in's earlier times at the closing stops.
 * - **Stitch** a fragment onto the one that carries the same bus on: within a
 *   trayecto, the fragment starting at the next stop a few minutes later (125
 *   continues as 181); across the segments of a concatenated variant (line 6
 *   `{2,3}`), the fragment leaving the shared stop in the same few minutes.
 *
 * Unpaired stops (whose times the parser could not assign to trips) are filled
 * in per trip when exactly one of their times fits between the trip's
 * neighbouring stops, so a stop with two trips in one minute stays boardable.
 *
 * Everything here is pure; `load.ts` reads the database.
 */

/** Walking pace for every on-foot leg, conservative on purpose. */
export const WALK_SPEED_MPS = 1.2;
/** Streets are not straight lines: walked distance ≈ straight distance × this. */
export const WALK_DETOUR = 1.3;
/** Two stops this close (straight line) are a walkable transfer. */
export const TRANSFER_RADIUS_M = 400;

/** A ride never goes this long between two consecutive stops; past it, a trip id has moved on to another bus. */
const MAX_HOP_MIN = 20;
/** The same bus continues as another fragment within this. */
const STITCH_MAX_MIN = 5;

const DAY_S = 24 * 60 * 60;

export const walkSeconds = (straightMeters: number): number =>
  Math.ceil((straightMeters * WALK_DETOUR) / WALK_SPEED_MPS);

export const walkMeters = (straightMeters: number): number =>
  Math.round(straightMeters * WALK_DETOUR);

export interface NetworkStop {
  externalId: string;
  name: string;
  lat: number;
  lng: number;
}

export interface NetworkLine {
  routeId: string;
  /** `Route.externalId`, the id Moventis's live endpoint is asked with. */
  externalId: string;
  code: string;
  color: string;
  name: string;
  /** Has an `OperatingDay` on the service date. */
  runsOnServiceDate: boolean;
}

export interface NetworkVariant {
  id: string;
  routeId: string;
  description: string;
  trayectoIds: number[];
  /** Flattened polyline, or null when the variant has none stored. */
  geometry: LngLat[] | null;
}

export interface NetworkTimetable {
  routeId: string;
  trayectoId: number;
  /** 0 for the service date itself, −1 for the day before (its after-midnight tail). */
  dayOffset: 0 | -1;
  timetable: StoredTimetable;
}

export interface NetworkInput {
  stops: NetworkStop[];
  lines: NetworkLine[];
  variants: NetworkVariant[];
  timetables: NetworkTimetable[];
}

export interface Trip {
  /** The Moventis trip ids stitched into this ride, plus their segment. Stable across rebuilds. */
  key: string;
  routeId: string;
  variantId: string | null;
  headsign: string;
  /** Seconds after the service day's midnight, one per pattern stop. */
  times: number[];
}

export interface Pattern {
  /** Indices into `Network.stops`, in travel order. */
  stops: number[];
  /** Ordered by departure; no trip overtakes the one before it at any stop. */
  trips: Trip[];
}

export interface Footpath {
  to: number;
  seconds: number;
  /** Walked metres (straight line × {@link WALK_DETOUR}). */
  meters: number;
}

export interface Network {
  stops: NetworkStop[];
  stopIndex: Map<string, number>;
  /** By `routeId`. */
  lines: Map<string, NetworkLine>;
  variants: Map<string, NetworkVariant>;
  patterns: Pattern[];
  /** Per stop: every (pattern, position) that serves it. */
  patternsAtStop: { pattern: number; position: number }[][];
  footpaths: Footpath[][];
  /** Codes of lines running on the service date with no timetable stored. */
  missingLines: string[];
  tripCount: number;
}

// ─── Unpaired stops ────────────────────────────────────────────────────────

/**
 * Each trip's times with its unpaired stops filled in where exactly one of the
 * stop's own departures lies between the trip's previous and next known times.
 * Trips the stop lists but that do not actually call there find no candidate
 * and stay null.
 */
export function fillUnpaired(t: StoredTimetable): (number | null)[][] {
  const filled = t.trips.map((trip) => [...trip.times]);
  const unpaired = [...(t.unpaired ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  for (const { position, times: candidates } of unpaired) {
    for (const times of filled) {
      let prev: number | null = null;
      for (let i = position - 1; i >= 0 && prev === null; i--)
        prev = times[i] ?? null;
      let next: number | null = null;
      for (let i = position + 1; i < times.length && next === null; i++)
        next = times[i] ?? null;
      if (prev === null || next === null || next < prev) continue;
      const fits = candidates.filter((c) => c >= prev && c <= next);
      if (fits.length === 1) times[position] = fits[0]!;
    }
  }
  return filled;
}

// ─── Fragments and stitching ───────────────────────────────────────────────

interface Fragment {
  tripId: number;
  /** Positions in the row. */
  positions: number[];
  /** Network stop indices. */
  stops: number[];
  minutes: number[];
}

interface Ride {
  keys: string[];
  stops: number[];
  minutes: number[];
}

/** Cut one trip's row into monotone runs over known stops. */
function splitTrip(
  tripId: number,
  times: (number | null)[],
  stopAt: (position: number) => number | undefined,
): Fragment[] {
  const out: Fragment[] = [];
  let cur: Fragment | null = null;
  times.forEach((minute, position) => {
    const stop = stopAt(position);
    if (minute === null || stop === undefined) return;
    const last = cur?.minutes.at(-1);
    if (
      !cur ||
      last === undefined ||
      minute < last ||
      minute - last > MAX_HOP_MIN
    ) {
      cur = { tripId, positions: [], stops: [], minutes: [] };
      out.push(cur);
    }
    cur.positions.push(position);
    cur.stops.push(stop);
    cur.minutes.push(minute);
  });
  return out;
}

/**
 * Pair each fragment with the one carrying the same bus on from the next live
 * position, earliest first, each fragment continuing at most one other.
 */
function stitchWithinRow(fragments: Fragment[], rowLength: number): Ride[] {
  const live = new Array<boolean>(rowLength).fill(false);
  for (const f of fragments) for (const p of f.positions) live[p] = true;
  const nextLive = (p: number) => {
    for (let q = p + 1; q < rowLength; q++) if (live[q]) return q;
    return -1;
  };

  const byFirst = new Map<number, Fragment[]>();
  for (const f of fragments) {
    const list = byFirst.get(f.positions[0]!) ?? [];
    list.push(f);
    byFirst.set(f.positions[0]!, list);
  }

  const next = new Map<Fragment, Fragment>();
  const isTail = new Set<Fragment>();
  const byEnd = [...fragments].sort(
    (a, b) => a.minutes.at(-1)! - b.minutes.at(-1)!,
  );
  for (const a of byEnd) {
    const q = nextLive(a.positions.at(-1)!);
    if (q < 0) continue;
    const end = a.minutes.at(-1)!;
    let best: Fragment | null = null;
    for (const b of byFirst.get(q) ?? []) {
      if (b === a || isTail.has(b)) continue;
      const gap = b.minutes[0]! - end;
      if (gap < 0 || gap > STITCH_MAX_MIN) continue;
      if (!best || b.minutes[0]! < best.minutes[0]!) best = b;
    }
    if (best) {
      next.set(a, best);
      isTail.add(best);
    }
  }

  const rides: Ride[] = [];
  for (const head of fragments) {
    if (isTail.has(head)) continue;
    const ride: Ride = { keys: [], stops: [], minutes: [] };
    for (let f: Fragment | undefined = head; f; f = next.get(f)) {
      ride.keys.push(String(f.tripId));
      ride.stops.push(...f.stops);
      ride.minutes.push(...f.minutes);
    }
    rides.push(ride);
  }
  return rides;
}

/**
 * Join the rides of consecutive segments of one variant where the bus carries
 * on: a ride ending on the stop the next segment starts from, and one leaving
 * that stop within {@link STITCH_MAX_MIN}. The shared stop keeps the later
 * (departure) time.
 */
function stitchSegments(segments: Ride[][]): Ride[] {
  let acc = segments[0] ?? [];
  for (let i = 1; i < segments.length; i++) {
    const following = segments[i]!;
    const used = new Set<Ride>();
    const out: Ride[] = [];
    for (const a of [...acc].sort(
      (x, y) => x.minutes.at(-1)! - y.minutes.at(-1)!,
    )) {
      const end = a.minutes.at(-1)!;
      let best: Ride | null = null;
      for (const b of following) {
        if (used.has(b) || b.stops[0] !== a.stops.at(-1)) continue;
        const gap = b.minutes[0]! - end;
        if (gap < 0 || gap > STITCH_MAX_MIN) continue;
        if (!best || b.minutes[0]! < best.minutes[0]!) best = b;
      }
      if (!best) {
        out.push(a);
        continue;
      }
      used.add(best);
      out.push({
        keys: [...a.keys, ...best.keys],
        stops: [...a.stops, ...best.stops.slice(1)],
        minutes: [...a.minutes.slice(0, -1), ...best.minutes],
      });
    }
    for (const b of following) if (!used.has(b)) out.push(b);
    acc = out;
  }
  return acc;
}

// ─── Assembly ──────────────────────────────────────────────────────────────

export function buildNetwork(input: NetworkInput): Network {
  const stops = input.stops;
  const stopIndex = new Map(stops.map((s, i) => [s.externalId, i]));
  const lines = new Map(input.lines.map((l) => [l.routeId, l]));
  const variants = new Map(input.variants.map((v) => [v.id, v]));

  const variantOf = (routeId: string, trayectoId: number) =>
    input.variants.find(
      (v) => v.routeId === routeId && v.trayectoIds.includes(trayectoId),
    ) ?? null;

  const rowRides = (row: NetworkTimetable): Ride[] => {
    const { stops: rowStops } = row.timetable;
    const stopAt = (p: number) => stopIndex.get(rowStops[p]!);
    const filled = fillUnpaired(row.timetable);
    const fragments = row.timetable.trips.flatMap((trip, i) =>
      splitTrip(trip.id, filled[i]!, stopAt),
    );
    return stitchWithinRow(fragments, rowStops.length).map((r) => ({
      ...r,
      keys: r.keys.map((k) => `${row.trayectoId}.${k}`),
    }));
  };

  // Rows grouped by (route, day, variant); a variant's segments are stitched in
  // `trayectoIds` order, and a row no variant claims stands on its own.
  const trips: { trip: Trip; stops: number[] }[] = [];
  const groups = new Map<
    string,
    { variant: NetworkVariant | null; row: NetworkTimetable; rides: Ride[] }[]
  >();
  for (const row of input.timetables) {
    const variant = variantOf(row.routeId, row.trayectoId);
    const groupKey = `${row.routeId}|${row.dayOffset}|${variant?.id ?? `t${row.trayectoId}`}`;
    const group = groups.get(groupKey) ?? [];
    group.push({ variant, row, rides: rowRides(row) });
    groups.set(groupKey, group);
  }

  for (const group of groups.values()) {
    const { variant, row } = group[0]!;
    const ordered = variant
      ? [...group].sort(
          (a, b) =>
            variant.trayectoIds.indexOf(a.row.trayectoId) -
            variant.trayectoIds.indexOf(b.row.trayectoId),
        )
      : group;
    const rides = stitchSegments(ordered.map((g) => g.rides));
    const line = lines.get(row.routeId);
    const shift = row.dayOffset * DAY_S;
    for (const ride of rides) {
      if (ride.stops.length < 2) continue;
      const times = ride.minutes.map((m) => m * 60 + shift);
      // Yesterday's rows only contribute what is still running after midnight.
      if (times.at(-1)! < 0) continue;
      trips.push({
        stops: ride.stops,
        trip: {
          key: `${row.routeId}:${row.dayOffset}:${ride.keys.join("+")}`,
          routeId: row.routeId,
          variantId: variant?.id ?? null,
          headsign: variant?.description ?? line?.name ?? "",
          times,
        },
      });
    }
  }

  // Patterns: group by exact stop sequence, then split any group whose trips
  // would overtake one another, because RAPTOR's "earliest trip" scan relies
  // on trip order being the same at every stop.
  const bySequence = new Map<string, { stops: number[]; trips: Trip[] }>();
  for (const { trip, stops: seq } of trips) {
    const key = seq.join(",");
    const entry = bySequence.get(key) ?? { stops: seq, trips: [] };
    entry.trips.push(trip);
    bySequence.set(key, entry);
  }
  const patterns: Pattern[] = [];
  for (const { stops: seq, trips: group } of bySequence.values()) {
    group.sort(
      (a, b) => a.times[0]! - b.times[0]! || a.key.localeCompare(b.key),
    );
    const copies: Pattern[] = [];
    for (const trip of group) {
      const fits = copies.find((p) => {
        const last = p.trips.at(-1)!;
        return trip.times.every((t, i) => t >= last.times[i]!);
      });
      if (fits) fits.trips.push(trip);
      else copies.push({ stops: seq, trips: [trip] });
    }
    patterns.push(...copies);
  }

  const patternsAtStop: Network["patternsAtStop"] = stops.map(() => []);
  patterns.forEach((p, pattern) =>
    p.stops.forEach((stop, position) =>
      patternsAtStop[stop]!.push({ pattern, position }),
    ),
  );

  const footpaths: Footpath[][] = stops.map(() => []);
  for (let a = 0; a < stops.length; a++) {
    for (let b = a + 1; b < stops.length; b++) {
      const d = distanceMeters(
        [stops[a]!.lng, stops[a]!.lat],
        [stops[b]!.lng, stops[b]!.lat],
      );
      if (d > TRANSFER_RADIUS_M) continue;
      const seconds = walkSeconds(d);
      const meters = walkMeters(d);
      footpaths[a]!.push({ to: b, seconds, meters });
      footpaths[b]!.push({ to: a, seconds, meters });
    }
  }

  const withToday = new Set(
    input.timetables.filter((t) => t.dayOffset === 0).map((t) => t.routeId),
  );
  const missingLines = input.lines
    .filter((l) => l.runsOnServiceDate && !withToday.has(l.routeId))
    .map((l) => l.code)
    .sort();

  return {
    stops,
    stopIndex,
    lines,
    variants,
    patterns,
    patternsAtStop,
    footpaths,
    missingLines,
    tripCount: trips.length,
  };
}
