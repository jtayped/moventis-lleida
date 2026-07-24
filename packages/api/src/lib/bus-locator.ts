import {
  type BusPosition,
  type LngLat,
  cumulativeArcLengths,
  distanceMeters,
  pointAtArc,
  projectToPolyline,
} from "@moventis/shared";

/**
 * Fallback urban-bus speed (m/s) used when two-probe calibration can't recover a
 * real speed for a variant (≈14 km/h, conservative for city traffic). When this
 * is used the affected positions are marked `confidence:"medium"`.
 */
const AVG_SPEED_MPS = 4;

/** Calibrated speeds are clamped to this sane urban range (m/s). */
const MIN_SPEED_MPS = 1.5;
const MAX_SPEED_MPS = 12;

/** A route is treated as a loop when its polyline returns within this of its start. */
const LOOP_TOLERANCE_M = 80;

export interface LocatorStop {
  /** DB cuid (used in the emitted segment). */
  id: string;
  /** Moventis stop id. */
  externalId: string;
  lat: number;
  lng: number;
}

export interface LocatorVariant {
  direction: "I" | "V";
  /** `normalizeText`-normalized variant description — the journey match key. */
  description: string;
  /** Stops in travel order. */
  stops: LocatorStop[];
  /** Flattened route polyline `[lng, lat][]`, or null when geometry is missing. */
  geometry: LngLat[] | null;
}

/** Per-journey real-time ETAs (seconds) observed at a stop. */
export type ProbeResult = Map<string, number[]>;

/**
 * Reads the real-time arrivals at a stop (by Moventis externalId) for the line
 * being located. Injected so the locator stays pure I/O-free and testable; the
 * router supplies a per-request-cached probe backed by `getStopSchedule`.
 */
export type ProbeFn = (stopExternalId: string) => Promise<ProbeResult>;

export interface LineLocatorInput {
  /** Line code stamped onto every emitted position (drives marker colour). */
  lineCode: string;
  variants: LocatorVariant[];
  probe: ProbeFn;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Strip combining diacritics for an accent-insensitive comparison. */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Match an API journey key to a stored variant by `description`. Exact match
 * first, then an accent-insensitive fallback (the scraper's `normalizeName`
 * fixes diacritics that the parser's `normalizeText` leaves alone). Returns null
 * when no variant matches — the journey belongs to a deduped/filtered sub-variant
 * and is skipped (failure mode #3).
 */
export function matchVariant(
  journeyName: string,
  variants: LocatorVariant[],
): LocatorVariant | null {
  const exact = variants.find((v) => v.description === journeyName);
  if (exact) return exact;
  const folded = fold(journeyName);
  return variants.find((v) => fold(v.description) === folded) ?? null;
}

/** True when the polyline is (approximately) closed — i.e. a circular line. */
function isClosedLoop(path: LngLat[]): boolean {
  return (
    path.length > 2 &&
    distanceMeters(path[0]!, path[path.length - 1]!) < LOOP_TOLERANCE_M
  );
}

/**
 * Find the journey in a probe result that belongs to `variant`, returning its
 * name and real-time ETAs. A shared terminal can list several journeys (failure
 * mode #6); `matchVariant` keeps us on this variant's own journey.
 */
function pickJourney(
  probe: ProbeResult,
  variant: LocatorVariant,
): { name: string; etas: number[] } | null {
  for (const [name, etas] of probe) {
    if (etas.length && matchVariant(name, [variant])) return { name, etas };
  }
  return null;
}

/** Geometry context for a variant: the polyline, cumulative arcs, and stop arcs. */
interface VariantGeometry {
  path: LngLat[];
  cum: number[];
  total: number;
  loop: boolean;
  hasGeom: boolean;
  /** Arc-length of each stop projected onto the polyline (travel order). */
  stopArcs: number[];
}

function buildGeometry(variant: LocatorVariant): VariantGeometry {
  const hasGeom = !!variant.geometry && variant.geometry.length >= 2;
  const path: LngLat[] = hasGeom
    ? variant.geometry!
    : variant.stops.map((s) => [s.lng, s.lat] as LngLat);
  const cum = cumulativeArcLengths(path);
  const total = cum[cum.length - 1]!;
  const loop = isClosedLoop(path);
  const stopArcs = variant.stops.map(
    (s) => projectToPolyline([s.lng, s.lat], path, cum).arc,
  );
  return { path, cum, total, loop, hasGeom, stopArcs };
}

/**
 * Find the stop segment containing `arc`, cyclically for loops. Returns the two
 * bounding stop indices (travel order) and the fraction travelled between them.
 */
function segmentAtArc(
  stopArcs: number[],
  arc: number,
  total: number,
  loop: boolean,
): { from: number; to: number; fraction: number } {
  const n = stopArcs.length;
  for (let i = 1; i < n; i++) {
    if (arc <= stopArcs[i]!) {
      const lo = stopArcs[i - 1]!;
      const span = stopArcs[i]! - lo;
      return { from: i - 1, to: i, fraction: span <= 0 ? 0 : clamp((arc - lo) / span, 0, 1) };
    }
  }
  // Past the last stop's arc: only reachable on a wrapped loop (closing segment).
  if (loop) {
    const lo = stopArcs[n - 1]!;
    const span = total - lo + stopArcs[0]!;
    return { from: n - 1, to: 0, fraction: span <= 0 ? 0 : clamp((arc - lo) / span, 0, 1) };
  }
  return { from: Math.max(0, n - 2), to: n - 1, fraction: 1 };
}

interface Placement {
  lat: number;
  lng: number;
  fromIdx: number;
  toIdx: number;
  fraction: number;
  confidence: BusPosition["confidence"];
}

/**
 * Place a bus `etaSeconds` of travel-time back from the anchor stop along the
 * route. We know the bus reaches the anchor (the variant terminal, or a midpoint
 * on loops) in `etaSeconds`, so it sits that distance — at `speed` — earlier on
 * the polyline. On a loop this wraps; on a linear line it clamps to the origin.
 */
function placeBus(
  geom: VariantGeometry,
  anchorIdx: number,
  etaSeconds: number,
  speed: number,
  calibrated: boolean,
): Placement {
  const { path, cum, total, loop, hasGeom, stopArcs } = geom;
  const anchorArc = stopArcs[anchorIdx]!;
  const backDist = etaSeconds * speed;

  const clampedAtOrigin = !loop && anchorArc - backDist <= 0;
  const targetArc =
    loop && total > 0
      ? (((anchorArc - backDist) % total) + total) % total
      : Math.max(0, anchorArc - backDist);

  const point = pointAtArc(path, cum, targetArc);
  const seg = segmentAtArc(stopArcs, targetArc, total, loop);

  const confidence: BusPosition["confidence"] = clampedAtOrigin
    ? "low"
    : calibrated && hasGeom
      ? "high"
      : "medium";

  return {
    lat: point[1],
    lng: point[0],
    fromIdx: seg.from,
    toIdx: seg.to,
    fraction: seg.fraction,
    confidence,
  };
}

/** Median of a non-empty list. */
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Derive a variant's real speed (m/s) from two probes. Buses at the upstream
 * anchor `A₂` are a subset of those at the primary anchor `A` (only the ones not
 * yet past `A₂`). For a bus seen at both, `eta_A − eta_{A₂} = T(A₂→A)` is constant,
 * so `speed = arcBetween(A₂,A) / median(T)`. Aligning the two ascending ETA lists
 * at their tails pairs the same buses. Returns null (→ fixed-speed fallback) when
 * fewer than two buses match or the recovered speed is nonsense.
 */
function calibrateSpeed(
  geom: VariantGeometry,
  anchorIdx: number,
  anchorEtas: number[],
  calibIdx: number,
  calibEtas: number[],
): number | null {
  const arcBetween = Math.abs(geom.stopArcs[anchorIdx]! - geom.stopArcs[calibIdx]!);
  if (arcBetween <= 0) return null;

  const a = [...anchorEtas].sort((x, y) => x - y);
  const b = [...calibEtas].sort((x, y) => x - y);
  const pairs = Math.min(a.length, b.length);
  if (pairs < 2) return null;

  // Align tails: the largest-ETA (farthest) buses are the ones reaching A₂.
  const diffs: number[] = [];
  for (let j = 0; j < pairs; j++) {
    const d = a[a.length - 1 - j]! - b[b.length - 1 - j]!;
    if (d > 0) diffs.push(d);
  }
  if (diffs.length < 2) return null;

  const t = median(diffs);
  if (t <= 0) return null;
  const speed = arcBetween / t;
  if (speed < MIN_SPEED_MPS || speed > MAX_SPEED_MPS) return null;
  return speed;
}

/**
 * Locate the real-time buses running each variant of a line and return a
 * {@link BusPosition} for every one.
 *
 * The Moventis API gives no GPS, but probing a variant's destination terminal
 * returns the real-time (`real:"S"`) ETAs of the buses heading toward it — each
 * ETA back-projects to a point along the route geometry. Loop variants whose
 * terminal reports nothing fall back to a midpoint anchor; speed is calibrated
 * per variant from a second upstream probe (else a fixed fallback). Cost is
 * ~2–3 probes per variant regardless of stop count.
 */
export async function locateLineBuses(
  input: LineLocatorInput,
): Promise<BusPosition[]> {
  const { lineCode, variants, probe } = input;
  const out: BusPosition[] = [];

  for (const variant of variants) {
    const n = variant.stops.length;
    if (n < 2) continue;

    const geom = buildGeometry(variant);

    // Step A — primary anchor is the destination terminal; loops may report 0
    // there, so fall back to a midpoint.
    let anchorIdx = n - 1;
    let anchor = pickJourney(
      await probe(variant.stops[anchorIdx]!.externalId),
      variant,
    );
    if ((!anchor || anchor.etas.length === 0) && geom.loop) {
      anchorIdx = Math.floor(n / 2);
      anchor = pickJourney(
        await probe(variant.stops[anchorIdx]!.externalId),
        variant,
      );
    }
    if (!anchor || anchor.etas.length === 0) continue;

    // Step B — calibrate speed from an upstream second probe.
    const calibIdx =
      anchorIdx === n - 1 ? Math.floor(n / 2) : Math.floor(n / 4);
    let speed = AVG_SPEED_MPS;
    let calibrated = false;
    if (calibIdx > 0 && calibIdx < anchorIdx) {
      const calib = pickJourney(
        await probe(variant.stops[calibIdx]!.externalId),
        variant,
      );
      if (calib) {
        const s = calibrateSpeed(
          geom,
          anchorIdx,
          anchor.etas,
          calibIdx,
          calib.etas,
        );
        if (s !== null) {
          speed = s;
          calibrated = true;
        }
      }
    }

    // Step C — place every bus (API already caps the list at ~5 nearest).
    for (const etaSeconds of anchor.etas) {
      const p = placeBus(geom, anchorIdx, etaSeconds, speed, calibrated);
      const from = variant.stops[p.fromIdx]!;
      const to = variant.stops[p.toIdx]!;
      out.push({
        lineCode,
        journeyName: anchor.name,
        direction: variant.direction,
        lat: p.lat,
        lng: p.lng,
        segment: { fromStopId: from.id, toStopId: to.id },
        fraction: clamp(p.fraction, 0, 1),
        etaSeconds,
        confidence: p.confidence,
      });
    }
  }

  return out;
}
