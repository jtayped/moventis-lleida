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
    const after = expect(
      queue.schedule(() => Promise.resolve("ok")),
    ).resolves.toBe("ok");

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
    const fast = queue
      .schedule(() => Promise.resolve("fast"))
      .then((v) => settled.push(v));

    await vi.advanceTimersByTimeAsync(2000);
    await Promise.all([slow, fast]);

    expect(settled).toEqual(["fast", "slow"]);
  });

  it("exposes the shared 5 req/s gate", () => {
    expect(moventisQueue).toBeInstanceOf(ThrottledQueue);
    expect(typeof moventisQueue.schedule).toBe("function");
  });
});

describe("ThrottledQueue priority lanes", () => {
  it("starts waited-on work before speculative work already queued", async () => {
    vi.useFakeTimers();
    const q = new ThrottledQueue(5);
    const started: string[] = [];
    const task = (name: string) => () => {
      started.push(name);
      return Promise.resolve(name);
    };

    // Three speculative fetches are already queued when a drawer tap lands.
    void q.schedule(task("pin-a"), "low");
    void q.schedule(task("pin-b"), "low");
    void q.schedule(task("pin-c"), "low");
    void q.schedule(task("drawer"));

    await vi.advanceTimersByTimeAsync(1000);

    // The first slot is already spent on pin-a — it was dispatched before the
    // tap existed, and nothing can un-send it. Every slot after belongs to the
    // drawer first. Without lanes the drawer waited for all three.
    expect(started[0]).toBe("pin-a");
    expect(started[1]).toBe("drawer");
    vi.useRealTimers();
  });

  it("defaults to the waited-on lane", async () => {
    vi.useFakeTimers();
    const q = new ThrottledQueue(5);
    const started: string[] = [];
    const task = (name: string) => () => {
      started.push(name);
      return Promise.resolve(name);
    };

    void q.schedule(task("first"));
    void q.schedule(task("low"), "low");
    void q.schedule(task("second"));

    await vi.advanceTimersByTimeAsync(1000);

    // Every existing call site omits the argument and must keep FIFO among
    // themselves — a default of "low" would silently deprioritise the drawer.
    expect(started).toEqual(["first", "second", "low"]);
    vi.useRealTimers();
  });

  it("runs speculative work once nothing is waiting", async () => {
    vi.useFakeTimers();
    const q = new ThrottledQueue(5);
    const done: string[] = [];

    await Promise.all([
      q.schedule(() => Promise.resolve(done.push("high"))),
      q.schedule(() => Promise.resolve(done.push("low")), "low"),
      vi.advanceTimersByTimeAsync(1000),
    ]);

    // Starvation is only acceptable while there is genuinely something ahead.
    expect(done).toEqual(["high", "low"]);
    vi.useRealTimers();
  });
});
