import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThrottledQueue, moventisQueue } from "./throttle";

/**
 * The property under test is a dispatch-time gate: five calls per second may
 * *start*, and a slow response must never hold back the next start. The previous
 * implementation chained on completion, so these same five calls took
 * 5 × latency instead of 5 × 200 ms — a limit of one concurrent request for the
 * whole process.
 *
 * Ordering contract asserted here: starts are FIFO, settlement is not — each
 * caller's promise settles with its own `fn`, so a rejection stays local.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ThrottledQueue", () => {
  it("starts five one-second calls within ~1 s, not 5 s", async () => {
    const queue = new ThrottledQueue(5);
    const t0 = Date.now();
    const starts: number[] = [];

    const results = Array.from({ length: 5 }, (_, i) =>
      queue.schedule(async () => {
        starts.push(Date.now() - t0);
        await sleep(1000); // a slow response, the case that used to serialize
        return i;
      }),
    );

    // 801 ms is enough for every start; the old queue needed 4 s of responses
    // to have come back before the fifth call could even be sent.
    await vi.advanceTimersByTimeAsync(801);
    expect(starts).toHaveLength(5);

    await vi.advanceTimersByTimeAsync(1000);
    await expect(Promise.all(results)).resolves.toEqual([0, 1, 2, 3, 4]);
  });

  it("leaves at least 200 ms between consecutive starts", async () => {
    const queue = new ThrottledQueue(5);
    const t0 = Date.now();
    const starts: number[] = [];

    const results = Array.from({ length: 6 }, () =>
      queue.schedule(async () => {
        starts.push(Date.now() - t0);
        await sleep(50);
      }),
    );

    await vi.advanceTimersByTimeAsync(2000);
    await Promise.all(results);

    expect(starts).toEqual([0, 200, 400, 600, 800, 1000]);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]! - starts[i - 1]!).toBeGreaterThanOrEqual(200);
    }
  });

  it("does not bank credit while idle", async () => {
    const queue = new ThrottledQueue(5);
    const t0 = Date.now();
    const starts: number[] = [];
    const run = () =>
      queue.schedule(() => {
        starts.push(Date.now() - t0);
        return Promise.resolve();
      });

    const first = run();
    await vi.advanceTimersByTimeAsync(5000);
    await first;

    const rest = [run(), run()];
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all(rest);

    // The second start is immediate (the gate had long expired), the third is a
    // full interval later — an idle minute must not buy 300 instant requests.
    expect(starts).toEqual([0, 5000, 5200]);
  });

  it("does not let a rejected task poison later ones", async () => {
    const queue = new ThrottledQueue(5);

    // Assertions are attached up front: these promises reject while the timers
    // are being advanced, and a handler added afterwards is one tick too late.
    const failed = expect(
      queue.schedule(() => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
    const threwSync = expect(
      queue.schedule(() => {
        throw new Error("sync boom");
      }),
    ).rejects.toThrow("sync boom");
    const after = expect(queue.schedule(() => Promise.resolve("ok"))).resolves.toBe("ok");

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all([failed, threwSync, after]);
  });

  it("settles each caller with its own result, not in start order", async () => {
    const queue = new ThrottledQueue(5);
    const settled: string[] = [];

    const slow = queue
      .schedule(async () => {
        await sleep(1000);
        return "slow";
      })
      .then((v) => settled.push(v));
    const fast = queue.schedule(() => Promise.resolve("fast")).then((v) => settled.push(v));

    await vi.advanceTimersByTimeAsync(2000);
    await Promise.all([slow, fast]);

    expect(settled).toEqual(["fast", "slow"]);
  });

  it("exposes the shared 5 req/s gate", () => {
    expect(moventisQueue).toBeInstanceOf(ThrottledQueue);
    expect(typeof moventisQueue.schedule).toBe("function");
  });
});
