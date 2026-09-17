/**
 * Arrival drift: how far a bus's predicted arrival has moved since we first
 * showed it.
 *
 * Moventis gives no vehicle id. Each refresh of a stop's timetable is a bare
 * list of arrival times per journey, so to say "this bus is now two minutes
 * later than it said" the list has to be matched against the previous one by
 * position and proximity alone. That matching is the whole problem, and it is
 * kept here as pure functions over plain numbers so it can be tested without a
 * component, a clock or the network.
 *
 * The model, per journey (one direction of one line at one stop):
 *
 * - A **track** is one bus we believe we have been following. It remembers
 *   the arrival it first predicted (`baselineMs`, "supposed to get here at"),
 *   whether that first prediction was live GPS or the printed timetable, and
 *   the arrival it predicted most recently (`lastMs`).
 * - On each refresh the new arrivals are **aligned** to the tracks, one to
 *   one and order-preserving (buses on one journey do not overtake each
 *   other), matching a track's `lastMs` — not its baseline — because drift
 *   accumulates and a bus twelve minutes late is still a match against where
 *   it stood thirty seconds ago.
 * - A matched arrival's **delta** is `arrival − baseline`: positive means
 *   later than first promised, negative means earlier.
 * - An unmatched arrival starts a new track. An unmatched track is dropped:
 *   the bus arrived, or the API stopped listing it.
 *
 * The timetable case falls out of the same rule and is the one that matters
 * most: an arrival first seen as `real:"N"` has the printed time as its
 * baseline, so when the bus starts reporting and the time turns live, the
 * delta reads as "live prediction minus timetable" — the gap the person at
 * the stop actually wants to know.
 */

export interface DriftTrack {
  /** Arrival first predicted for this bus. Never changes once set. */
  baselineMs: number;
  /** Whether that first prediction was a live one (`real:"S"`). */
  baselineIsRealTime: boolean;
  /** Most recent prediction; what the next refresh is aligned against. */
  lastMs: number;
  /** How many refreshes have listed this bus, this one included. */
  seenCount: number;
}

export interface ArrivalSample {
  arrivalMs: number;
  isRealTime: boolean;
}

export interface ArrivalDrift {
  /** `arrival − baseline`, in milliseconds. Positive = later than first promised. */
  deltaMs: number;
  baselineMs: number;
  baselineIsRealTime: boolean;
  /** How many refreshes this bus has been followed for, this one included. */
  seenCount: number;
}

/**
 * How far apart two predictions of the *same* bus may sit across one refresh.
 *
 * Refreshes are ~30 s apart, so genuine drift between two consecutive
 * observations is seconds to a couple of minutes; the tolerance only has to
 * absorb that plus the fetch-time jitter that live offsets carry. Lleida
 * headways are rarely under ten minutes, so five keeps consecutive buses on
 * the same journey from being confused even when order alone cannot decide.
 */
export const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Align `current` to `previous`, both sorted ascending, one to one and
 * order-preserving, allowing a pair only when the two are within `tolerance`.
 *
 * Classic sequence alignment: a pair costs its distance, leaving an element
 * unmatched costs `tolerance`. Because a legal pair never costs more than
 * `tolerance` and skipping both sides costs `2 × tolerance`, the optimum always
 * pairs what can be paired and only skips when a bus genuinely appeared or
 * disappeared. Inputs are tiny (the API lists at most a handful of arrivals),
 * so the O(n·m) table is nothing.
 *
 * @returns for each index of `current`, the index in `previous` it matched, or
 * `null` when it is new.
 */
export function alignArrivals(
  previous: readonly number[],
  current: readonly number[],
  tolerance: number = DEFAULT_TOLERANCE_MS,
): (number | null)[] {
  const n = previous.length;
  const m = current.length;
  if (m === 0) return [];
  if (n === 0) return current.map(() => null);

  // cost[i][j]: best cost aligning previous[0..i) with current[0..j).
  const cost: number[][] = [];
  // choice[i][j]: 0 = pair (i-1, j-1); 1 = skip previous[i-1]; 2 = skip current[j-1].
  const choice: number[][] = [];
  for (let i = 0; i <= n; i++) {
    cost.push(new Array<number>(m + 1).fill(0));
    choice.push(new Array<number>(m + 1).fill(0));
  }
  for (let i = 1; i <= n; i++) {
    cost[i]![0] = i * tolerance;
    choice[i]![0] = 1;
  }
  for (let j = 1; j <= m; j++) {
    cost[0]![j] = j * tolerance;
    choice[0]![j] = 2;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const gap = Math.abs(previous[i - 1]! - current[j - 1]!);
      const skipPrev = cost[i - 1]![j]! + tolerance;
      const skipCurr = cost[i]![j - 1]! + tolerance;
      let best = skipPrev;
      let via = 1;
      if (skipCurr < best) {
        best = skipCurr;
        via = 2;
      }
      if (gap <= tolerance) {
        const pair = cost[i - 1]![j - 1]! + gap;
        // `<=` so a legal pair wins ties against a skip: we would rather keep
        // following a bus than restart its history over a coin flip.
        if (pair <= best) {
          best = pair;
          via = 0;
        }
      }
      cost[i]![j] = best;
      choice[i]![j] = via;
    }
  }

  const result: (number | null)[] = new Array<number | null>(m).fill(null);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const via = choice[i]![j]!;
    if (via === 0) {
      result[j - 1] = i - 1;
      i--;
      j--;
    } else if (via === 1) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

/**
 * Fold one refresh of a journey's arrivals into its tracks.
 *
 * `samples` need not be sorted; they are sorted by arrival here and the drifts
 * come back in the caller's original order, so a component can zip them
 * straight onto the list it renders.
 *
 * Pure: returns the next tracks rather than mutating the given ones.
 */
export function advanceTracks(
  tracks: readonly DriftTrack[],
  samples: readonly ArrivalSample[],
  tolerance: number = DEFAULT_TOLERANCE_MS,
): { tracks: DriftTrack[]; drifts: ArrivalDrift[] } {
  const order = samples
    .map((s, index) => ({ s, index }))
    .sort((a, b) => a.s.arrivalMs - b.s.arrivalMs);
  const previous = tracks.map((t) => t.lastMs);
  const matches = alignArrivals(
    previous,
    order.map((o) => o.s.arrivalMs),
    tolerance,
  );

  const nextTracks: DriftTrack[] = [];
  const drifts: ArrivalDrift[] = new Array<ArrivalDrift>(samples.length);

  order.forEach(({ s, index }, k) => {
    const matched = matches[k];
    const track: DriftTrack =
      matched === null || matched === undefined
        ? {
            baselineMs: s.arrivalMs,
            baselineIsRealTime: s.isRealTime,
            lastMs: s.arrivalMs,
            seenCount: 1,
          }
        : {
            ...tracks[matched]!,
            lastMs: s.arrivalMs,
            seenCount: tracks[matched]!.seenCount + 1,
          };
    nextTracks.push(track);
    drifts[index] = {
      deltaMs: s.arrivalMs - track.baselineMs,
      baselineMs: track.baselineMs,
      baselineIsRealTime: track.baselineIsRealTime,
      seenCount: track.seenCount,
    };
  });

  return { tracks: nextTracks, drifts };
}

/** Tracks per journey, keyed by whatever identifies a journey to the caller. */
export type DriftState = Record<string, DriftTrack[]>;

/**
 * Advance every journey of one stop at once. Journeys absent from `byJourney`
 * are dropped: the line stopped listing that direction, so there is nothing
 * left to follow.
 */
export function advanceDriftState(
  state: DriftState,
  byJourney: Record<string, readonly ArrivalSample[]>,
  tolerance: number = DEFAULT_TOLERANCE_MS,
): { state: DriftState; drifts: Record<string, ArrivalDrift[]> } {
  const nextState: DriftState = {};
  const drifts: Record<string, ArrivalDrift[]> = {};
  for (const [key, samples] of Object.entries(byJourney)) {
    const result = advanceTracks(state[key] ?? [], samples, tolerance);
    nextState[key] = result.tracks;
    drifts[key] = result.drifts;
  }
  return { state: nextState, drifts };
}

/**
 * Whole minutes for display, rounding half away from zero so +90 s reads as
 * +2 and −90 s as −2: the sign is the message, and a rounding rule that
 * shrank it towards zero would understate exactly the cases worth flagging.
 * Anything under a minute is 0 — noise from fetch-time jitter, not drift.
 */
export function driftMinutes(deltaMs: number): number {
  const minutes = deltaMs / 60_000;
  const rounded = minutes < 0 ? -Math.round(-minutes) : Math.round(minutes);
  // `-Math.round(0.4)` is -0, which `Object.is` and a `toBe(0)` both reject.
  return rounded === 0 ? 0 : rounded;
}
