import {
  type BusPosition,
  type LngLat,
  cumulativeArcLengths,
  distanceMeters,
  pointAtArc,
  projectToPolyline,
} from "@moventis/shared";

/**
 * Live bus positions, bracketed between the stops that do and do not list them.
 *
 * The Moventis API exposes no vehicle ids or GPS. What it does expose, per stop
 * and journey, is an ascending list of `real:"S"` arrivals — and one physical
 * bus shows up in that list at every stop it has still to reach on its current
 * trip, with an ETA that grows by the scheduled inter-stop offset from one stop
 * to the next. It is absent from the stops it has already passed. So for two
 * probed stops A then B (travel order):
 *
 *   - every entry at A reappears at B, later by the A→B travel time (unless the
 *     API's ~5-entry cap cut it at B), and
 *   - an entry at B with no such counterpart at A is a bus between A and B.
 *
 * That is the whole locator: {@link alignLists} pairs the two lists by order
 * and proximity and reports the unpaired leading entries at B as buses
 * bracketed in (A, B]. Each pair also measures the real A→B travel time, which
 * places a bracketed bus inside the bracket by its ETA to B.
 *
 * Two facts about the lists, both recorded in `__fixtures__/line-*-snapshot.json`
 * and easy to get wrong:
 *
 *   1. An origin stop lists the *departures* of the next few trips, and every
 *      downstream stop carries those same trips as projections (still
 *      `real:"S"`, since a vehicle is assigned) — a bus on its way to the
 *      terminal is listed there once as itself and again as its next trip.
 *      A loop's terminal is its origin, so the list there is entirely
 *      projections, a lap apart per vehicle. None of these are buses between
 *      stops: they align with the origin's entries like any other trip, which
 *      is why the origin is always probed and why nothing at the first probed
 *      stop is ever emitted.
 *   2. Lists are capped (usually at 5, some stops more), from the tail. The
 *      alignment therefore only trusts *leading* unpaired entries, and trusts
 *      trailing ones only when the upstream list was short enough to be
 *      complete.
 *
 * Everything here is pure: I/O comes in through the injected {@link ProbeFn}
 * and every ETA is relative to one reference instant chosen by the caller.
 */

/** ETA lists are assumed capped at this size; a shorter list is complete. */
export const REALTIME_LIST_CAP = 5;

/**
 * How far *behind* an upstream entry a downstream entry may sit and still be
 * read as the same trip (the API quantises to the second and two probes land a
 * second or two apart), and how far a "0 min 00 s" arrival may already be in
 * the past. Also the tolerance the consistency check allows.
 */
export const SAME_TRIP_SLACK_S = 30;

/**
 * Bound on the travel time across a bracket: the slowest plausible urban
 * crawl, plus a dwell allowance per stop segment. Deliberately generous — a
 * bracketed bus is only recognised when its ETA is under this bound, so a tight
 * bound loses buses; a loose one merely widens the window in which two trips
 * could be confused, which the greedy pairing already resolves toward "fewer
 * buses". The live loop segment into a hospital measured 236 s for 278 m.
 */
const MIN_SPEED_MPS = 1;
const DWELL_SLACK_S = 90;

export function maxTravelSeconds(distanceM: number, segments: number): number {
  return distanceM / MIN_SPEED_MPS + DWELL_SLACK_S * Math.max(1, segments);
}

/** Speed used to place a bus inside a bracket whose travel time was not measured. */
const FALLBACK_SPEED_MPS = 4;

/** A route is a loop when its polyline returns within this of its start. */
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

/**
 * Per-journey real-time ETAs (seconds) observed at a stop, all relative to the
 * one reference instant the caller chose for the whole request. A "0 min 00 s"
 * arrival fetched a few seconds after that instant is slightly negative and
 * must be kept: it is the bus standing at the stop.
 */
export type ProbeResult = Map<string, number[]>;

/**
 * Reads the real-time arrivals at a stop (by Moventis externalId) for the line
 * being located; `null` when the fetch failed. The distinction matters: an
 * unavailable stop is left out of the chain (its neighbours bracket across it),
 * whereas an empty list is a stop that lists no bus.
 */
export type ProbeFn = (stopExternalId: string) => Promise<ProbeResult | null>;

/**
 * Probe budget per variant. The coarse pass splits the variant into about
 * `coarseSegments` brackets of at most `maxBracketStops` stop segments (plus the
 * origin and terminal); refinement then bisects occupied brackets, widest first,
 * until they are single stop segments or `refineProbes` more probes are spent.
 * A 28-stop loop with three buses costs 7 + ~6 probes; a variant with no bus
 * costs the coarse pass only.
 */
export interface ProbeBudget {
  coarseSegments: number;
  maxBracketStops: number;
  refineProbes: number;
}

export const DEFAULT_PROBE_BUDGET: ProbeBudget = {
  coarseSegments: 6,
  maxBracketStops: 6,
  refineProbes: 8,
};

export interface LineLocatorInput {
  /** Line code stamped onto every emitted position (drives marker colour). */
  lineCode: string;
  variants: LocatorVariant[];
  probe: ProbeFn;
  budget?: Partial<ProbeBudget>;
}

/** One probed stop of a variant, as the locator saw it. */
export interface ProbedStop {
  /** Index into the variant's stop list. */
  index: number;
  stopId: string;
  externalId: string;
  /**
   * This variant's journey ETAs at the stop (ascending). Null when the stop is
   * unavailable: the fetch failed, or the response does not list the journey at
   * all. Both leave the stop out of the chain — an unlisted journey is not "no
   * bus", and reading it that way would turn the next stop's projections into
   * phantoms.
   */
  etas: number[] | null;
}

/** Everything the locator used for one variant — enough to re-check its output. */
export interface VariantTrace {
  direction: "I" | "V";
  description: string;
  /** The journey key the variant matched at some probed stop, if any. */
  journeyName: string | null;
  loop: boolean;
  stopCount: number;
  /** Straight-line/polyline arc of each stop (metres), travel order. */
  stopArcs: number[];
  /** Polyline length (metres). */
  totalArc: number;
  probed: ProbedStop[];
  /**
   * Each emitted position with its bracket as stop *indices*: on a loop the
   * origin and terminal are one stop row, so `segment`'s ids alone cannot tell
   * the first bracket from the closing one.
   */
  placed: PlacedBus[];
}

export interface PlacedBus {
  position: BusPosition;
  fromIndex: number;
  toIndex: number;
}

export interface LineLocatorResult {
  positions: BusPosition[];
  variants: VariantTrace[];
  /** Distinct stops fetched through `probe` for this call. */
  probeCount: number;
}

const asc = (a: number, b: number) => a - b;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Strip combining diacritics for an accent-insensitive comparison. */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Match an API journey key to a stored variant by `description`. Exact match
 * first, then an accent-insensitive fallback (the scraper's `normalizeName`
 * fixes diacritics that the parser's `normalizeText` leaves alone). Returns null
 * when no variant matches.
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

/**
 * The API keys journeys by description, so two stored variants with the same
 * direction and description (line 9 stores two "polígons") would each claim the
 * same entries and every bus would be drawn twice. Keep the longest per key.
 */
export function dedupeVariants(variants: LocatorVariant[]): LocatorVariant[] {
  const byKey = new Map<string, LocatorVariant>();
  for (const v of variants) {
    const key = `${v.direction}|${fold(v.description)}`;
    const held = byKey.get(key);
    if (!held || v.stops.length > held.stops.length) byKey.set(key, v);
  }
  return [...byKey.values()];
}

/** Find the journey in a probe result that belongs to `variant`. */
function pickJourney(
  probe: ProbeResult,
  variant: LocatorVariant,
): { name: string; etas: number[] } | null {
  for (const [name, etas] of probe) {
    if (matchVariant(name, [variant])) return { name, etas: [...etas].sort(asc) };
  }
  return null;
}

// ─── Alignment ─────────────────────────────────────────────────────────────

export interface Alignment {
  /** ETAs (to the downstream stop) of the buses bracketed between the two stops. */
  between: number[];
  /** Same-trip pairs, `downstream − upstream` being that trip's travel time. */
  pairs: { upstream: number; downstream: number }[];
  /** Downstream entries explained neither way (cap tail, or a trip missing upstream). */
  ignored: number[];
}

/**
 * Pair the ETA list at an upstream stop with the list at a downstream one and
 * pick out the buses that sit between them.
 *
 * Both lists are ascending and buses do not overtake, so the same trips appear
 * in the same order at both stops; walking the two lists together, a downstream
 * entry is the current upstream entry's trip when it is later by at most
 * `maxTravel` (and not earlier by more than the probe slack). A downstream
 * entry that is *earlier* than every remaining upstream entry cannot be any of
 * them — it is a bus that has already passed the upstream stop, provided its
 * ETA fits within the bracket's travel-time bound; otherwise it is a trip the
 * upstream stop failed to list and is ignored rather than drawn. An upstream
 * entry with no downstream counterpart within the bound is skipped the same
 * way. Once the upstream list is exhausted, leftover downstream entries are
 * buses only if the upstream list was short enough to be complete; a list at
 * the cap may simply have been cut.
 *
 * Ties break toward *fewer* buses: an entry is paired with the first upstream
 * trip that could explain it. Two buses closer together than the bracket's
 * travel time may therefore merge into one until refinement narrows the
 * bracket — the locator would rather miss a bunched bus than draw one the stop
 * lists contradict.
 */
export function alignLists(
  upstream: number[],
  downstream: number[],
  maxTravel: number,
): Alignment {
  const a = [...upstream].sort(asc);
  const b = [...downstream].sort(asc);
  const between: number[] = [];
  const pairs: Alignment["pairs"] = [];
  const ignored: number[] = [];
  let i = 0;
  let j = 0;
  while (j < b.length) {
    const eta = b[j]!;
    if (i >= a.length) {
      if (a.length < REALTIME_LIST_CAP && eta <= maxTravel) between.push(eta);
      else ignored.push(eta);
      j++;
      continue;
    }
    const diff = eta - a[i]!;
    if (diff < -SAME_TRIP_SLACK_S) {
      if (eta <= maxTravel) between.push(eta);
      else ignored.push(eta);
      j++;
    } else if (diff <= maxTravel) {
      pairs.push({ upstream: a[i]!, downstream: eta });
      i++;
      j++;
    } else {
      i++;
    }
  }
  return { between, pairs, ignored };
}

/** Median of a non-empty list. */
function median(xs: number[]): number {
  const s = [...xs].sort(asc);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

// ─── Geometry ──────────────────────────────────────────────────────────────

interface VariantGeometry {
  path: LngLat[];
  cum: number[];
  total: number;
  loop: boolean;
  /** Arc-length of each stop projected onto the polyline (travel order). */
  stopArcs: number[];
}

function buildGeometry(variant: LocatorVariant): VariantGeometry {
  const n = variant.stops.length;
  const hasGeom = !!variant.geometry && variant.geometry.length >= 2;
  const path: LngLat[] = hasGeom
    ? variant.geometry!
    : variant.stops.map((s) => [s.lng, s.lat] as LngLat);
  const cum = cumulativeArcLengths(path);
  const total = cum[cum.length - 1]!;
  const first = variant.stops[0]!;
  const last = variant.stops[n - 1]!;
  const loop =
    first.externalId === last.externalId ||
    (path.length > 2 && distanceMeters(path[0]!, path[path.length - 1]!) < LOOP_TOLERANCE_M);
  const stopArcs = variant.stops.map(
    (s) => projectToPolyline([s.lng, s.lat], path, cum).arc,
  );
  // A loop's terminal is its origin: projecting that shared point can land on
  // arc≈0 for both, which would make the closing bracket zero-length. Pin the
  // terminal to the end of the polyline.
  if (loop && n >= 2 && stopArcs[n - 1]! <= stopArcs[n - 2]!) stopArcs[n - 1] = total;
  return { path, cum, total, loop, stopArcs };
}

/** Arc distance travelling forward from stop `a` to stop `b`, wrapping on loops. */
export function bracketDistance(
  stopArcs: number[],
  total: number,
  loop: boolean,
  a: number,
  b: number,
): number {
  const raw = stopArcs[b]! - stopArcs[a]!;
  return loop && raw < 0 ? raw + total : Math.max(0, raw);
}

// ─── Chain analysis ────────────────────────────────────────────────────────

export interface Bracket {
  from: ProbedStop;
  to: ProbedStop;
  distanceM: number;
  maxTravel: number;
  alignment: Alignment;
  /** Measured travel time across the bracket (median of pairs), or null. */
  travel: number | null;
}

/** Align every consecutive pair of *available* probed stops along the variant. */
export function analyseChain(
  probed: ProbedStop[],
  geom: { stopArcs: number[]; total: number; loop: boolean },
): Bracket[] {
  const chain = probed
    .filter((p): p is ProbedStop & { etas: number[] } => p.etas !== null)
    .sort((x, y) => x.index - y.index);
  const out: Bracket[] = [];
  for (let k = 1; k < chain.length; k++) {
    const from = chain[k - 1]!;
    const to = chain[k]!;
    const distanceM = bracketDistance(geom.stopArcs, geom.total, geom.loop, from.index, to.index);
    const maxTravel = maxTravelSeconds(distanceM, to.index - from.index);
    const alignment = alignLists(from.etas, to.etas, maxTravel);
    const diffs = alignment.pairs.map((p) => p.downstream - p.upstream);
    const t = diffs.length ? median(diffs) : null;
    out.push({ from, to, distanceM, maxTravel, alignment, travel: t !== null && t > 1 ? t : null });
  }
  return out;
}

function placeInBracket(
  geom: VariantGeometry,
  bracket: Bracket,
  eta: number,
): { lat: number; lng: number; fraction: number } {
  const { distanceM, travel, to } = bracket;
  const remaining =
    travel !== null
      ? clamp(eta / travel, 0, 1)
      : distanceM > 0
        ? clamp((eta * FALLBACK_SPEED_MPS) / distanceM, 0, 1)
        : 0;
  let arc = geom.stopArcs[to.index]! - distanceM * remaining;
  if (geom.loop && arc < 0) arc += geom.total;
  const point = pointAtArc(geom.path, geom.cum, arc);
  return { lat: point[1], lng: point[0], fraction: 1 - remaining };
}

function confidenceFor(bracket: Bracket): BusPosition["confidence"] {
  if (bracket.to.index - bracket.from.index === 1) return "high";
  return bracket.travel !== null ? "medium" : "low";
}

// ─── Probe plan ────────────────────────────────────────────────────────────

/** Coarse-pass stop indices: origin, every `stride`, terminal. */
export function coarseIndices(stopCount: number, budget: ProbeBudget): number[] {
  const last = stopCount - 1;
  const stride = clamp(Math.ceil(last / budget.coarseSegments), 1, budget.maxBracketStops);
  const idx = new Set<number>([0]);
  for (let i = stride; i < last; i += stride) idx.add(i);
  idx.add(last);
  return [...idx].sort(asc);
}

// ─── Locate ────────────────────────────────────────────────────────────────

/** The unprobed stop nearest the midpoint of (from, to), or -1 when none is left. */
function nearestUnprobed(from: number, to: number, probed: Map<number, unknown>): number {
  const mid = Math.floor((from + to) / 2);
  for (let d = 0; d < to - from; d++) {
    for (const k of [mid + d, mid - d]) {
      if (k > from && k < to && !probed.has(k)) return k;
    }
  }
  return -1;
}

/**
 * Locate the real-time buses on each variant of a line.
 *
 * Per variant: probe the coarse plan, align consecutive probed stops, then
 * bisect the widest bracket that holds a bus and repeat while the refinement
 * budget lasts. Stops shared between variants (and a loop's origin/terminal)
 * are fetched once per call. See the module doc for the model.
 */
export async function locateLineBuses(input: LineLocatorInput): Promise<LineLocatorResult> {
  const { lineCode, probe } = input;
  const budget: ProbeBudget = { ...DEFAULT_PROBE_BUDGET, ...input.budget };
  const variants = dedupeVariants(input.variants);

  // Memoised per call so the plan can snap onto stops another variant fetched.
  const fetched = new Map<string, Promise<ProbeResult | null>>();
  const fetch = (externalId: string) => {
    let p = fetched.get(externalId);
    if (!p) {
      p = probe(externalId);
      fetched.set(externalId, p);
    }
    return p;
  };

  const positions: BusPosition[] = [];
  const traces: VariantTrace[] = [];

  for (const variant of variants) {
    const n = variant.stops.length;
    if (n < 2) continue;
    const geom = buildGeometry(variant);
    const probed = new Map<number, ProbedStop>();
    let journeyName: string | null = null;

    const probeIndex = async (index: number) => {
      const stop = variant.stops[index]!;
      const result = await fetch(stop.externalId);
      let etas: number[] | null = null;
      if (result) {
        const journey = pickJourney(result, variant);
        journeyName ??= journey?.name ?? null;
        etas = journey?.etas ?? null;
      }
      probed.set(index, { index, stopId: stop.id, externalId: stop.externalId, etas });
    };

    // Coarse pass. An interior index snaps to a neighbour already fetched for
    // another variant of this line, which keeps sibling variants that share a
    // trunk from paying twice.
    const plan = coarseIndices(n, budget).map((index) => {
      if (index === 0 || index === n - 1) return index;
      for (const candidate of [index, index - 1, index + 1]) {
        if (candidate > 0 && candidate < n - 1 && fetched.has(variant.stops[candidate]!.externalId)) {
          return candidate;
        }
      }
      return index;
    });
    await Promise.all([...new Set(plan)].map(probeIndex));

    // Refinement: bisect every occupied bracket, widest first, one round at a
    // time (the probes of a round run concurrently through the throttle) until
    // every bus sits in a single stop segment or the budget is spent. A mid
    // stop that turns out unavailable is not retried; the bracket stays wide
    // and honest.
    let refineLeft = budget.refineProbes;
    while (refineLeft > 0) {
      const targets = analyseChain([...probed.values()], geom)
        .filter((b) => b.alignment.between.length > 0 && b.to.index - b.from.index > 1)
        .sort((x, y) => y.to.index - y.from.index - (x.to.index - x.from.index))
        .map((b) => nearestUnprobed(b.from.index, b.to.index, probed))
        .filter((k): k is number => k !== -1)
        .slice(0, refineLeft);
      if (targets.length === 0) break;
      refineLeft -= targets.length;
      await Promise.all(targets.map(probeIndex));
    }

    const trace: VariantTrace = {
      direction: variant.direction,
      description: variant.description,
      journeyName,
      loop: geom.loop,
      stopCount: n,
      stopArcs: geom.stopArcs,
      totalArc: geom.total,
      probed: [...probed.values()].sort((x, y) => x.index - y.index),
      placed: [],
    };

    for (const bracket of analyseChain(trace.probed, geom)) {
      for (const eta of bracket.alignment.between) {
        const p = placeInBracket(geom, bracket, eta);
        const position: BusPosition = {
          lineCode,
          journeyName: journeyName ?? variant.description,
          direction: variant.direction,
          lat: p.lat,
          lng: p.lng,
          segment: { fromStopId: bracket.from.stopId, toStopId: bracket.to.stopId },
          spanStops: bracket.to.index - bracket.from.index,
          fraction: clamp(p.fraction, 0, 1),
          etaSeconds: Math.max(0, eta),
          confidence: confidenceFor(bracket),
        };
        trace.placed.push({ position, fromIndex: bracket.from.index, toIndex: bracket.to.index });
        positions.push(position);
      }
    }
    traces.push(trace);
  }

  return { positions, variants: traces, probeCount: fetched.size };
}

// ─── Consistency check ─────────────────────────────────────────────────────

export interface ConsistencyVerdict {
  position: BusPosition;
  ok: boolean;
  /** Human-readable reasons for a failure; empty when ok. */
  problems: string[];
  /** Soft observations that do not fail the verdict (e.g. downstream cap cut). */
  notes: string[];
}

/**
 * Re-derive, from a trace, which stop lists each emitted bus must and must not
 * appear in, and check that against the lists the locator was given. This is
 * the locator's promise stated independently of how it pairs entries:
 *
 *   - **present downstream**: the bus's ETA is in the bracket's downstream
 *     list, and no larger than that bracket's travel-time bound;
 *   - **absent upstream**: every entry at the bracket's upstream stop that
 *     could be this bus (within the bound of its ETA) is accounted for by a
 *     *distinct* earlier entry at the downstream stop — i.e. it is some other
 *     trip that has been listed at both. If any such entry has no earlier
 *     downstream entry to explain it, the upstream stop is listing this bus
 *     and the bracket is wrong;
 *   - **still listed further on** (note only): at every later available
 *     probed stop the bus should reappear, later by the measured travel time,
 *     unless that list is at the cap and ends before it.
 *
 * Also runs against extra stops a script may have probed beyond the locator's
 * plan, because the check needs only the trace shape.
 */
export function checkConsistency(trace: VariantTrace): ConsistencyVerdict[] {
  const geom = { stopArcs: trace.stopArcs, total: trace.totalArc, loop: trace.loop };
  const brackets = analyseChain(trace.probed, geom);
  const byIndex = new Map(trace.probed.map((p) => [p.index, p]));
  const verdicts: ConsistencyVerdict[] = [];

  for (const { position, fromIndex, toIndex } of trace.placed) {
    const problems: string[] = [];
    const notes: string[] = [];
    const from = byIndex.get(fromIndex);
    const to = byIndex.get(toIndex);
    if (!from?.etas || !to?.etas) {
      verdicts.push({ position, ok: false, problems: ["bracket stops were not probed"], notes });
      continue;
    }
    const bracket = brackets.find((b) => b.from.index === fromIndex && b.to.index === toIndex);
    if (!bracket) {
      verdicts.push({ position, ok: false, problems: ["bracket is not a consecutive pair of probed stops"], notes });
      continue;
    }
    const eta = position.etaSeconds;
    const near = (x: number, y: number) => Math.abs(x - y) <= SAME_TRIP_SLACK_S;

    // Present downstream, within the bracket's reach. The matched entry's
    // index (not its value) delimits the entries "earlier" than this bus, so a
    // duplicate entry or a slightly negative "at stop" ETA cannot explain itself.
    const downstream = [...to.etas].sort(asc);
    const at = downstream.findIndex((x) => near(Math.max(0, x), eta));
    if (at === -1) {
      problems.push(`not listed at downstream stop #${to.index} (${to.externalId})`);
    }
    if (eta > bracket.maxTravel) {
      problems.push(`ETA ${eta.toFixed(0)}s exceeds the bracket bound ${bracket.maxTravel.toFixed(0)}s`);
    }

    // Absent upstream: greedy injective assignment of the suspects to earlier
    // downstream entries, in order (both sorted, windows monotone).
    const suspects = from.etas.filter(
      (y) => y >= eta - bracket.maxTravel && y <= eta + SAME_TRIP_SLACK_S,
    );
    const earlier = at === -1 ? [] : downstream.slice(0, at);
    let cursor = 0;
    for (const y of [...suspects].sort(asc)) {
      while (cursor < earlier.length && earlier[cursor]! - y < -SAME_TRIP_SLACK_S) cursor++;
      if (cursor < earlier.length && earlier[cursor]! - y <= bracket.maxTravel) {
        cursor++;
      } else {
        problems.push(
          `upstream stop #${from.index} (${from.externalId}) lists ${y.toFixed(0)}s, which could be this bus and matches no earlier entry downstream`,
        );
        break;
      }
    }

    // Still listed further on (soft). A loop's terminal is its origin and
    // lists departures, not this trip's arrival, so the walk stops before it.
    let expected = eta;
    for (const b of brackets) {
      if (b.from.index < to.index) continue;
      if (b.travel === null) break;
      if (trace.loop && b.to.index === trace.stopCount - 1) break;
      expected += b.travel;
      const list = b.to.etas!;
      const found = list.some((x) => Math.abs(x - expected) <= Math.max(SAME_TRIP_SLACK_S, 0.15 * expected));
      if (found) continue;
      const capped = list.length >= REALTIME_LIST_CAP && (list[list.length - 1] ?? 0) < expected;
      notes.push(
        capped
          ? `beyond the cap at stop #${b.to.index}`
          : `expected around ${expected.toFixed(0)}s at stop #${b.to.index} (${b.to.externalId}), not listed`,
      );
      break;
    }

    verdicts.push({ position, ok: problems.length === 0, problems, notes });
  }
  return verdicts;
}
