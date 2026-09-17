import { distanceMeters, type LngLat } from "@moventis/shared";
import type { LocatorStop, LocatorVariant, ProbeFn, ProbeResult } from "../bus-locator";

/**
 * A synthetic fleet, rendered into the per-stop arrival lists the Moventis API
 * would publish for it. Test-only.
 *
 * The rendering follows what the recorded snapshots show
 * (`__fixtures__/line-*-snapshot.json`):
 *   - a bus is listed at every stop still ahead on its current trip, with the
 *     ETA accumulating segment travel time plus a dwell per stop;
 *   - the origin lists the *departures* of future trips, and every stop
 *     downstream carries those trips as projections (departure + scheduled
 *     offset); on a loop the terminal is the origin, so every bus is also
 *     listed at every stop as its next lap (arrival at the terminal plus the
 *     layover, plus the offset), whether or not it has passed that stop;
 *   - lists are ascending and capped (5 by default), from the tail;
 *   - live entries may carry jitter; projections are exact.
 */

export interface SimBus {
  /** Index of the stop segment the bus is on (between stops `segment` and `segment + 1`). */
  segment: number;
  /** Fraction of that segment already travelled, 0..1. */
  fraction: number;
}

export interface SimVariant {
  variant: LocatorVariant;
  /** Journey key published for this variant; defaults to `variant.description`. */
  journey?: string;
  /** Travel time (s) of each stop segment; `stops.length - 1` entries. */
  segmentSeconds: number[];
  dwellSeconds?: number;
  buses: SimBus[];
  /** Seconds until each future departure from the origin (projected trips). */
  departures?: number[];
  /** Loops only: time a bus waits at the terminal before its next lap. */
  layoverSeconds?: number;
}

export interface SimWorldOptions {
  /** List cap per journey and stop (the API's ~5). */
  cap?: number;
  /** Stops (externalIds) whose response omits the journey entirely. */
  missingJourneyAt?: string[];
  /** Stops (externalIds) whose fetch fails. */
  failAt?: string[];
  /** Amplitude (s) of deterministic jitter added to live entries. */
  jitterSeconds?: number;
}

export interface SimWorld {
  probe: ProbeFn;
  /** Every externalId fetched, in call order (duplicates included). */
  calls: string[];
}

const LAT = 41.6;
const LNG = 0.62;

/**
 * `n` stops `spacingM` apart. Linear: due east. Loop: around a circle, with the
 * last stop being the first stop again (same externalId), as the scraper stores
 * loop variants.
 */
export function makeStops(
  n: number,
  opts: { loop?: boolean; spacingM?: number; prefix?: string } = {},
): LocatorStop[] {
  const { loop = false, spacingM = 250, prefix = "s" } = opts;
  const mPerDegLat = 110_540;
  const mPerDegLng = 111_320 * Math.cos((LAT * Math.PI) / 180);
  const stops: LocatorStop[] = [];
  if (!loop) {
    for (let i = 0; i < n; i++) {
      stops.push({ id: `${prefix}id${i}`, externalId: `${prefix}${i}`, lat: LAT, lng: LNG + (i * spacingM) / mPerDegLng });
    }
    return stops;
  }
  const radius = ((n - 1) * spacingM) / (2 * Math.PI);
  for (let i = 0; i < n - 1; i++) {
    const angle = (2 * Math.PI * i) / (n - 1);
    stops.push({
      id: `${prefix}id${i}`,
      externalId: `${prefix}${i}`,
      lat: LAT + (radius * Math.sin(angle)) / mPerDegLat,
      lng: LNG + (radius * Math.cos(angle)) / mPerDegLng,
    });
  }
  stops.push({ ...stops[0]! });
  return stops;
}

export function makeVariant(
  stops: LocatorStop[],
  overrides: Partial<LocatorVariant> = {},
): LocatorVariant {
  return { direction: "I", description: "test line", geometry: null, stops, ...overrides };
}

/** Segment travel times from the stop spacing at a constant speed (m/s). */
export function segmentTimes(stops: LocatorStop[], speedMps: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < stops.length; i++) {
    const a: LngLat = [stops[i - 1]!.lng, stops[i - 1]!.lat];
    const b: LngLat = [stops[i]!.lng, stops[i]!.lat];
    out.push(distanceMeters(a, b) / speedMps);
  }
  return out;
}

export function isLoop(variant: LocatorVariant): boolean {
  const n = variant.stops.length;
  return n > 1 && variant.stops[0]!.externalId === variant.stops[n - 1]!.externalId;
}

/** Scheduled offset from the origin to stop `k` (travel + a dwell per stop passed). */
function offsetTo(sim: SimVariant, k: number): number {
  const dwell = sim.dwellSeconds ?? 0;
  let t = 0;
  for (let i = 0; i < k; i++) t += sim.segmentSeconds[i]! + dwell;
  return t;
}

/** A bus's arrival time at stop `k` on its current trip (`k > segment`). */
function arrivalAt(sim: SimVariant, bus: SimBus, k: number): number {
  const dwell = sim.dwellSeconds ?? 0;
  let t = (1 - bus.fraction) * sim.segmentSeconds[bus.segment]!;
  for (let i = bus.segment + 1; i < k; i++) t += dwell + sim.segmentSeconds[i]!;
  return t;
}

/** Deterministic jitter in [-amp, amp] from a couple of integers. */
function jitter(amp: number, a: number, b: number): number {
  if (!amp) return 0;
  let h = (a * 73856093) ^ (b * 19349663);
  h = (h ^ (h >>> 13)) * 1274126177;
  h = (h ^ (h >>> 16)) >>> 0;
  return ((h % 2001) / 1000 - 1) * amp;
}

/**
 * The uncapped, ascending list a stop publishes for this variant's journey.
 * `k` is the stop index; on a loop the terminal index renders as the origin.
 */
export function listAt(sim: SimVariant, k: number, jitterSeconds = 0): number[] {
  const n = sim.variant.stops.length;
  const loop = isLoop(sim.variant);
  const layover = sim.layoverSeconds ?? 0;
  if (loop && k === n - 1) k = 0;
  const out: number[] = [];

  sim.buses.forEach((bus, b) => {
    if (k > bus.segment) out.push(arrivalAt(sim, bus, k) + jitter(jitterSeconds, k, b));
    if (loop) {
      // On a loop every bus is also listed as its next lap, projected from its
      // departure after the layover — whether or not it has passed this stop
      // (line 2, stop 17: two live entries and three next-lap ones).
      const departure = arrivalAt(sim, bus, n - 1) + layover;
      out.push(departure + offsetTo(sim, k));
    }
  });
  for (const d of sim.departures ?? []) out.push(d + offsetTo(sim, k));
  return out.sort((x, y) => x - y);
}

/** The stop bracket a simulated bus is truly in, as variant stop indices. */
export function trueBracket(bus: SimBus): { fromIndex: number; toIndex: number } {
  return { fromIndex: bus.segment, toIndex: bus.segment + 1 };
}

/**
 * Render the world into a probe. Stops shared between variants publish every
 * journey that serves them, as a real shared stop does.
 */
export function simulateWorld(variants: SimVariant[], opts: SimWorldOptions = {}): SimWorld {
  const { cap = 5, missingJourneyAt = [], failAt = [], jitterSeconds = 0 } = opts;
  const calls: string[] = [];
  const probe: ProbeFn = (externalId) => {
    calls.push(externalId);
    if (failAt.includes(externalId)) return Promise.resolve(null);
    const result: ProbeResult = new Map();
    for (const sim of variants) {
      const journey = sim.journey ?? sim.variant.description;
      const k = sim.variant.stops.findIndex((s) => s.externalId === externalId);
      if (k === -1 || missingJourneyAt.includes(externalId)) continue;
      const merged = [...(result.get(journey) ?? []), ...listAt(sim, k, jitterSeconds)]
        .sort((x, y) => x - y)
        .slice(0, cap);
      result.set(journey, merged);
    }
    return Promise.resolve(result);
  };
  return { probe, calls };
}
