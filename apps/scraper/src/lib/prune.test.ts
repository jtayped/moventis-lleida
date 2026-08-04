import { describe, expect, it } from "vitest";
import { shouldPrune, MIN_SEEN_STOP_RATIO } from "./prune.js";

/** A run that saw the whole network and would be safe to prune with. */
const healthyRun = {
  discoveredLines: 12,
  incompleteLines: 0,
  seenStopCount: 400,
  knownStopCount: 400,
};

describe("shouldPrune", () => {
  it("approves a run that resolved every line and saw every stop", () => {
    expect(shouldPrune(healthyRun)).toEqual({ safe: true });
  });

  it("refuses when discovery found no lines at all", () => {
    // The 2026-08-02 regression: the feed dropped the Lleida zone, discovery
    // returned nothing, and `notIn: []` soft-deleted every route and stop.
    const decision = shouldPrune({
      discoveredLines: 0,
      incompleteLines: 0,
      seenStopCount: 0,
      knownStopCount: 400,
    });

    expect(decision.safe).toBe(false);
  });

  it("refuses when any line failed to sync", () => {
    const decision = shouldPrune({ ...healthyRun, incompleteLines: 1 });

    expect(decision).toEqual({
      safe: false,
      reason: "1 of 12 line(s) synced incompletely",
    });
  });

  it("refuses when the run upserted no stops despite resolving lines", () => {
    const decision = shouldPrune({
      ...healthyRun,
      seenStopCount: 0,
      knownStopCount: 0,
    });

    expect(decision).toEqual({
      safe: false,
      reason: "the run upserted no stops",
    });
  });

  it("refuses when coverage falls under the ratio floor", () => {
    const decision = shouldPrune({ ...healthyRun, seenStopCount: 199 });

    expect(decision.safe).toBe(false);
  });

  it("approves a run sitting exactly on the ratio floor", () => {
    const seenStopCount = healthyRun.knownStopCount * MIN_SEEN_STOP_RATIO;

    expect(shouldPrune({ ...healthyRun, seenStopCount })).toEqual({
      safe: true,
    });
  });

  it("approves genuine network growth", () => {
    // More stops seen than stored is a new stop appearing, not a fault.
    expect(
      shouldPrune({ ...healthyRun, seenStopCount: 410, knownStopCount: 400 }),
    ).toEqual({ safe: true });
  });

  it("approves the first run against an empty database", () => {
    expect(
      shouldPrune({ ...healthyRun, seenStopCount: 400, knownStopCount: 0 }),
    ).toEqual({ safe: true });
  });
});
