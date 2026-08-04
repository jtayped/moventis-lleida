/**
 * Pruning is the only destructive half of a sync: it soft-deletes every route
 * and stop the run did not see, and hard-deletes anything soft-deleted for over
 * four weeks. Because Prisma reads `notIn: []` as "match every row", a run that
 * discovers nothing does not prune nothing — it prunes *everything*.
 *
 * That is not hypothetical. When Moventis dropped the Lleida zone from its line
 * feed on 2026-08-02, three consecutive nightly runs logged a clean
 * "Found 0 Lleida lines / Done." while soft-deleting the entire network, and the
 * 28-day purge would have hard-deleted every stop on 2026-08-30.
 *
 * So pruning is gated on the run being *provably complete*, and the gate is a
 * pure function so the conditions can be tested without a database.
 */

/** A run must see at least this fraction of the known stops before it may prune. */
export const MIN_SEEN_STOP_RATIO = 0.5;

export interface PruneInput {
  /** Lines discovery handed to the sync. */
  discoveredLines: number;
  /** Lines that threw, or that produced no trayectos at all. */
  incompleteLines: number;
  /** Distinct stops the run actually upserted. */
  seenStopCount: number;
  /** Live (non-soft-deleted) stops in the database after the run. */
  knownStopCount: number;
}

export type PruneDecision =
  | { safe: true }
  | { safe: false; reason: string };

/**
 * Decides whether this run's coverage is trustworthy enough to delete with.
 * Refusing costs nothing but a few stale rows until the next run; approving a
 * bad run costs the network.
 */
export function shouldPrune(input: PruneInput): PruneDecision {
  const { discoveredLines, incompleteLines, seenStopCount, knownStopCount } =
    input;

  if (discoveredLines === 0) {
    return { safe: false, reason: "no lines were discovered" };
  }

  if (incompleteLines > 0) {
    return {
      safe: false,
      reason: `${incompleteLines} of ${discoveredLines} line(s) synced incompletely`,
    };
  }

  if (seenStopCount === 0) {
    return { safe: false, reason: "the run upserted no stops" };
  }

  // A partial upstream outage can still return a well-formed but badly thinned
  // response. Losing half the network in one night is a fault, not a timetable
  // change, so make a human look at it.
  if (seenStopCount < knownStopCount * MIN_SEEN_STOP_RATIO) {
    return {
      safe: false,
      reason:
        `only ${seenStopCount} of ${knownStopCount} known stops were seen ` +
        `(under the ${MIN_SEEN_STOP_RATIO * 100}% floor)`,
    };
  }

  return { safe: true };
}
