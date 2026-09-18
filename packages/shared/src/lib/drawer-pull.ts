/**
 * "Pull past the edge of the content and the sheet moves one snap": down at
 * the top of the list collapses it, up at the bottom grows it.
 *
 * This is driven from raw touch samples rather than through vaul's own
 * `shouldDrag` auto-detection, because that heuristic cannot make this
 * handoff. `shouldDrag` walks up to the nearest scrollable ancestor and only
 * drags the sheet once it finds one sitting at `scrollTop === 0` — but it is
 * guarded by a `scrollLockTimeout` re-arm that re-stamps its own timestamp on
 * every `pointermove` that happens while the content is still scrolling. One
 * continuous finger fires `pointermove` far faster than that 100 ms window can
 * lapse, so from the instant `scrollTop` reaches 0 the guard keeps re-arming
 * and the `scrollTop === 0` branch below it is never reached again for the
 * rest of the gesture. The sheet either does not move at all, or twitches on
 * the rare frame gap over 100 ms and springs back because the accumulated
 * distance was too small for vaul's own release to commit.
 *
 * The other direction was never on offer at all: the moment the browser starts
 * a native scroll it fires `pointercancel` and stops delivering the
 * `pointermove`s vaul's drag is built from, so a drag up at the bottom of the
 * list is gone before vaul could see it.
 *
 * So the gesture is tracked here directly, and the sheet is moved through the
 * same controlled snap-point setter a drag on the handle already uses. This
 * decides only *when* to step, never how the sheet animates.
 */

/** Which way a committed pull moves the sheet. */
export type PullCommit = "collapse" | "expand";

/** One touch sample: the tracked scroller's geometry, and the touch's vertical
 *  position. Any consistent coordinate space works (`clientY`, `pageY`) as
 *  long as one call site does not mix them. */
export interface PullSample {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  y: number;
}

export interface PullState {
  /** The turning point a run of movement is measured from. `null` when no
   *  pull is in progress. */
  readonly anchorY: number | null;
  /** Distance travelled from `anchorY` in the committing direction, `>= 0`. */
  readonly pulled: number;
  /** Sticky once a commit fires, so one continuous gesture steps at most one
   *  snap — lift off and pull again for a second step. */
  readonly committed: boolean;
}

export const INITIAL_PULL_STATE: PullState = {
  anchorY: null,
  pulled: 0,
  committed: false,
};

/** Generous on purpose: this has to lose to an ordinary scroll-and-lift-off
 *  flick and fire only for a deliberate continued pull. */
export const PULL_COMMIT_THRESHOLD_PX = 64;

/** Fractional scroll offsets are normal (zoom, non-integer DPR), so an edge is
 *  a tolerance rather than an exact 0. */
const EDGE_EPSILON_PX = 1;

export interface PullResult {
  state: PullState;
  /** Set on exactly the sample where the pull first crosses the threshold. */
  commit: PullCommit | null;
}

/**
 * Pure transition for one touch sample. No DOM, no timers — the whole decision
 * is a function of the sample sequence, which is what makes the gesture
 * testable without a device.
 */
export function trackDrawerPull(
  state: PullState,
  sample: PullSample,
  threshold: number = PULL_COMMIT_THRESHOLD_PX,
): PullResult {
  const atTop = sample.scrollTop <= EDGE_EPSILON_PX;
  const atBottom =
    sample.scrollTop + sample.clientHeight >=
    sample.scrollHeight - EDGE_EPSILON_PX;

  // Mid-list: there is nothing to hand off, and any run so far is void. This
  // has to precede the `committed` check, or scrolling away from an edge and
  // back could never re-arm the gesture.
  if (!atTop && !atBottom) return { state: INITIAL_PULL_STATE, commit: null };

  // Already stepped once this gesture; wait for a lift-off or for the content
  // to scroll away from its edges.
  if (state.committed) return { state, commit: null };

  // First sample at an edge: anchor here and wait for the next one to know
  // which way the finger is actually going.
  if (state.anchorY === null) {
    return {
      state: { anchorY: sample.y, pulled: 0, committed: false },
      commit: null,
    };
  }

  const delta = sample.y - state.anchorY;
  const movingDown = delta > 0;
  const distance = Math.abs(delta);

  // Content that still has somewhere to go in this direction keeps the
  // gesture: only a pull *past* an exhausted edge moves the sheet.
  const direction: PullCommit | null = movingDown
    ? atTop
      ? "collapse"
      : null
    : atBottom
      ? "expand"
      : null;

  // Either the finger turned around or it is heading into scrollable content.
  // Ratchet the anchor to the turning point rather than cancelling outright,
  // so ordinary jitter on a real digitizer does not keep restarting the count.
  if (direction === null || distance === 0) {
    return {
      state: { anchorY: sample.y, pulled: 0, committed: false },
      commit: null,
    };
  }

  if (distance >= threshold) {
    return {
      state: { anchorY: state.anchorY, pulled: distance, committed: true },
      commit: direction,
    };
  }

  return {
    state: { anchorY: state.anchorY, pulled: distance, committed: false },
    commit: null,
  };
}

/**
 * The snap index a commit moves to, clamped to the ends.
 *
 * Clamped rather than dismissing at the bottom: this drawer's lowest snap is a
 * peek it is meant to rest at, and only the header's X closes it.
 */
export function nextSnapIndex(
  currentIndex: number,
  commit: PullCommit,
  snapCount: number,
): number {
  const target = commit === "expand" ? currentIndex + 1 : currentIndex - 1;
  return Math.min(Math.max(target, 0), snapCount - 1);
}
