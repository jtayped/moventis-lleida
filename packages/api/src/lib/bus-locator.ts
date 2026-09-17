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

/**
 * The API documentedly caps real-time (`real:"S"`) arrivals at ~5 buses per
 * journey — so this isn't a design choice, it's what the API itself never
 * exceeds in normal operation. A journey bucket with more than this is not
 * extra buses: live testing (`validate-bus-positions.ts`) found a handful of
 * stops whose journey merges in a long, evenly-spaced tail (a schedule, not
 * GPS-tracked vehicles) under the same name, up to 300+ minutes out — and
 * because `pickJourney` fed that straight into placement, those showed up as
 * real bus markers. `pickJourney` keeps only the nearest `REALTIME_BUS_CAP`
 * arrivals for exactly this reason: the near-term ones look like a normal,
 * clean progression in every case seen live, so trimming the tail recovers
 * the real fleet instead of discarding the whole reading.
 */
const REALTIME_BUS_CAP = 5;

/** A route is treated as a loop when its polyline returns within this of its start. */
const LOOP_TOLERANCE_M = 80;

/**
 * How far upstream of the anchor to look for calibration stops, in metres and
 * in stop count. Kept short deliberately — see {@link calibCandidates}.
 */
const CALIB_MIN_VIABLE_DISTANCE_M = 50;
const CALIB_MAX_STOPS_BACK = 6;

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

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

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
 * name and real-time ETAs — capped to the nearest {@link REALTIME_BUS_CAP} and
 * sorted ascending, dropping anything beyond that as corrupted (see its doc).
 * A shared terminal can list several journeys (failure mode #6); `matchVariant`
 * keeps us on this variant's own journey.
 */
function pickJourney(
  probe: ProbeResult,
  variant: LocatorVariant,
): { name: string; etas: number[] } | null {
  for (const [name, etas] of probe) {
    if (etas.length && matchVariant(name, [variant])) {
      const capped = [...etas].sort((a, b) => a - b).slice(0, REALTIME_BUS_CAP);
      return { name, etas: capped };
    }
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

/**
 * List calibration-stop candidates upstream of the anchor, nearest first,
 * rather than reaching for one far away (e.g. the route's midpoint, as this
 * used to do). A distant calibration point reliably breaks on loop variants —
 * where the anchor (a variant's terminal) is the *same physical stop* as its
 * origin, confirmed empirically across most of the Lleida network via
 * `validate-bus-positions.ts` — because a bus that has already passed a
 * distant calibration point this lap won't be seen there again until its
 * *next* lap, while its ETA to the (very close) terminal is small. That
 * inverts the `eta_anchor > eta_calib` relationship {@link calibrateSpeed}
 * assumes, so every diff came out negative and calibration silently fell back
 * to the fixed speed on every request. Staying within a few hundred metres of
 * the anchor keeps both probes looking at (nearly) the same handful of buses,
 * avoiding the ambiguity entirely — this mirrors how
 * `validate-bus-positions.ts`'s adjacent-stop ground-truth check derives real
 * segment times, which held up cleanly in live testing where the old
 * distant-anchor calibration did not.
 *
 * Returns *every* viable stop within {@link CALIB_MAX_STOPS_BACK} stops that
 * clears the minimum baseline (skipping near-duplicate stops a few metres
 * apart), not just the nearest one: the caller tries them in order and moves
 * on if one doesn't pan out (no matching journey, too few buses, or an
 * implausible speed), so a single bad stop doesn't block calibration for the
 * whole variant.
 */
/**
 * Arc-distance travelling upstream from `anchorArc` back to `candidateArc`,
 * wrapping on loops. Needed because a loop variant's terminal typically
 * *coincides* with its origin stop (found live via `list-loop-variants.ts` —
 * true for most of the network), and projecting that shared point onto the
 * polyline can tie-break to arc≈0 instead of arc≈total; the two are the same
 * physical point on a loop, so a plain `anchorArc − candidateArc` goes deeply
 * negative for every candidate in that case even though every one of them is
 * genuinely upstream. Unwrapping here keeps distance (and hence candidate
 * selection) correct regardless of which of the two equivalent arc values
 * `projectToPolyline` happened to pick.
 */
function upstreamDistance(
  geom: VariantGeometry,
  anchorArc: number,
  candidateArc: number,
): number {
  const raw = anchorArc - candidateArc;
  return geom.loop && raw < 0 ? raw + geom.total : raw;
}

function calibCandidates(geom: VariantGeometry, anchorIdx: number): number[] {
  const anchorArc = geom.stopArcs[anchorIdx]!;
  const minIdx = Math.max(0, anchorIdx - CALIB_MAX_STOPS_BACK);
  const candidates: number[] = [];
  for (let idx = anchorIdx - 1; idx >= minIdx; idx--) {
    if (
      upstreamDistance(geom, anchorArc, geom.stopArcs[idx]!) >=
      CALIB_MIN_VIABLE_DISTANCE_M
    ) {
      candidates.push(idx);
    }
  }
  return candidates;
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
      return {
        from: i - 1,
        to: i,
        fraction: span <= 0 ? 0 : clamp((arc - lo) / span, 0, 1),
      };
    }
  }
  // Past the last stop's arc: only reachable on a wrapped loop (closing segment).
  if (loop) {
    const lo = stopArcs[n - 1]!;
    const span = total - lo + stopArcs[0]!;
    return {
      from: n - 1,
      to: 0,
      fraction: span <= 0 ? 0 : clamp((arc - lo) / span, 0, 1),
    };
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
 * Derive a variant's real speed (m/s) from two nearby probes (see
 * {@link chooseCalibIdx} for why `A₂` is now close to `A` rather than far
 * upstream). Buses at `A₂` are a subset of those at the primary anchor `A`
 * (only the ones not yet past `A₂`). For a bus seen at both, `eta_A − eta_{A₂}
 * = T(A₂→A)` is constant, so `speed = arcBetween(A₂,A) / median(T)`. Aligning
 * the two ascending ETA lists at their tails pairs the same buses. Returns
 * null (→ fixed-speed fallback) when fewer than two buses match or the
 * recovered speed is nonsense.
 */
function calibrateSpeed(
  geom: VariantGeometry,
  anchorIdx: number,
  anchorEtas: number[],
  calibIdx: number,
  calibEtas: number[],
): number | null {
  const arcBetween = upstreamDistance(
    geom,
    geom.stopArcs[anchorIdx]!,
    geom.stopArcs[calibIdx]!,
  );
  if (arcBetween <= 0) return null;

  // Both lists are already capped to REALTIME_BUS_CAP by pickJourney.
  const a = [...anchorEtas].sort((x, y) => x - y);
  const b = [...calibEtas].sort((x, y) => x - y);
  const pairs = Math.min(a.length, b.length);
  // Require at least 3 matched buses: with exactly 2, the "median" is just
  // their average and one bad pairing (a mismatched bus, not a genuine
  // outlier) skews it directly with nothing to reject it against — found live
  // when a 2-pair calibration averaged one plausible reading with one
  // physically-impossible one (191 km/h) into a merely-too-fast result that
  // passed the sanity clamp undetected.
  if (pairs < 3) return null;

  // Align tails: the largest-ETA (farthest) buses are the ones reaching A₂.
  const diffs: number[] = [];
  for (let j = 0; j < pairs; j++) {
    const d = a[a.length - 1 - j]! - b[b.length - 1 - j]!;
    if (d > 0) diffs.push(d);
  }
  if (diffs.length < 3) return null;

  const t = median(diffs);
  if (t <= 0) return null;
  const speed = arcBetween / t;
  if (process.env.DEBUG_BUS_LOCATOR) {
    console.error(
      `[calibrateSpeed] arc=${arcBetween.toFixed(0)}m anchorEtas=[${a.map((x) => x.toFixed(0)).join(",")}] ` +
        `calibEtas=[${b.map((x) => x.toFixed(0)).join(",")}] diffs=[${diffs.map((x) => x.toFixed(0)).join(",")}] ` +
        `median=${t.toFixed(0)}s speed=${speed.toFixed(2)}m/s (${(speed * 3.6).toFixed(1)}km/h) ` +
        `${speed < MIN_SPEED_MPS || speed > MAX_SPEED_MPS ? "REJECTED (out of range)" : "accepted"}`,
    );
  }
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
 * per variant from a probe a few stops upstream of the anchor, trying the
 * nearest few candidates until one works (see {@link calibCandidates}; else a
 * fixed fallback). Typical cost is ~2–3 probes per variant regardless of stop
 * count, occasionally more when a nearby calibration stop doesn't pan out.
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

    // Step B — calibrate speed from a nearby upstream probe, trying candidates
    // nearest-first and moving on if one doesn't pan out (missing journey, too
    // few buses, or a corrupted bucket) rather than giving up on the first.
    let speed = AVG_SPEED_MPS;
    let calibrated = false;
    if (process.env.DEBUG_BUS_LOCATOR) {
      console.error(
        `[candidates] anchorIdx=${anchorIdx} stopArcs=[${geom.stopArcs.map((a) => a.toFixed(0)).join(",")}] ` +
          `candidates=[${calibCandidates(geom, anchorIdx).join(",")}]`,
      );
    }
    for (const calibIdx of calibCandidates(geom, anchorIdx)) {
      const calib = pickJourney(
        await probe(variant.stops[calibIdx]!.externalId),
        variant,
      );
      if (process.env.DEBUG_BUS_LOCATOR) {
        console.error(
          `[locate] variant=${variant.direction} "${variant.description}" anchorIdx=${anchorIdx} ` +
            `calibIdx=${calibIdx} anchorEtas=[${anchor.etas.map((x) => x.toFixed(0)).join(",")}] ` +
            `calibJourney=${calib ? `"${calib.name}" etas=[${calib.etas.map((x) => x.toFixed(0)).join(",")}]` : "NONE (no matching journey at calib stop)"}`,
        );
      }
      if (!calib) continue;
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
        break;
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
