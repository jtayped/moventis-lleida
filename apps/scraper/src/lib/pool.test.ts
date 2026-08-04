import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./pool.js";

describe("mapWithConcurrency", () => {
  it("preserves input order regardless of completion order", async () => {
    const result = await mapWithConcurrency([30, 10, 20], 3, async (ms) => {
      await new Promise((r) => setTimeout(r, ms));
      return ms;
    });

    expect(result).toEqual([30, 10, 20]);
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;

    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
    });

    expect(peak).toBeLessThanOrEqual(4);
  });

  it("handles an empty input", async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });

  it("does not spawn more workers than there are items", async () => {
    let started = 0;

    await mapWithConcurrency([1, 2], 10, async (n) => {
      started++;
      return n;
    });

    expect(started).toBe(2);
  });
});
