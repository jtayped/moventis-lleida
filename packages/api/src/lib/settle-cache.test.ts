import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettleCache } from "./settle-cache";

/** Advance both the clock `Date.now()` reads and any pending timers. */
function advance(ms: number) {
  vi.advanceTimersByTime(ms);
}

/** A promise with its resolvers exposed, so a test can hold work in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("SettleCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shares one in-flight computation between callers", async () => {
    const cache = new SettleCache<string>(10_000, 64);
    const d = deferred<string>();
    const factory = vi.fn(() => d.promise);

    const a = cache.get("k", factory);
    const b = cache.get("k", factory);

    expect(factory).toHaveBeenCalledTimes(1);
    d.resolve("v");
    await expect(a).resolves.toBe("v");
    await expect(b).resolves.toBe("v");
  });

  it("serves an entry for the whole time it is in flight, however long", async () => {
    const cache = new SettleCache<string>(10_000, 64);
    const d = deferred<string>();
    const factory = vi.fn(() => d.promise);

    void cache.get("k", factory);
    // The TTL is not a deadline on the work — this is the load case the class
    // exists for. Timing from the *start* would let a fresh, complete
    // computation begin every 10 s and pile onto the queue that is already the
    // reason the first one is slow.
    advance(90_000);
    void cache.get("k", factory);

    expect(factory).toHaveBeenCalledTimes(1);
    d.resolve("v");
    await d.promise;
  });

  it("measures the TTL from settlement, not from the start", async () => {
    const cache = new SettleCache<string>(10_000, 64);
    const d = deferred<string>();
    const factory = vi.fn(() => d.promise);

    void cache.get("k", factory);
    advance(5_000);
    d.resolve("v");
    await d.promise;

    // 5 s of work + 9 s idle = 14 s since the start, still inside the TTL.
    advance(9_000);
    void cache.get("k", factory);
    expect(factory).toHaveBeenCalledTimes(1);

    advance(1_001);
    void cache.get("k", factory);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("never shares a rejection", async () => {
    const cache = new SettleCache<string>(10_000, 64);
    const first = deferred<string>();
    const factory = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce("v");

    const failed = cache.get("k", factory);
    first.reject(new Error("upstream down"));
    await expect(failed).rejects.toThrow("upstream down");

    // A failure is worth nothing to the next caller, so it does not hold the key
    // for the TTL — the retry goes straight back out.
    await expect(cache.get("k", factory)).resolves.toBe("v");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("caches the entry that replaces a failed one", async () => {
    const cache = new SettleCache<string>(10_000, 64);
    const failing = deferred<string>();
    const factory = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(failing.promise)
      .mockResolvedValue("second");

    const first = cache.get("k", factory);
    failing.reject(new Error("x"));
    await expect(first).rejects.toThrow("x");

    await expect(cache.get("k", factory)).resolves.toBe("second");
    // The replacement is a normal entry, not a hole the failure left behind —
    // the old rejection's eviction is identity-checked, so it cannot land late
    // and take this one with it.
    await expect(cache.get("k", factory)).resolves.toBe("second");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("drops settled entries once past the bound", async () => {
    const cache = new SettleCache<string>(10_000, 2);
    const factory = vi.fn((v: string) => () => Promise.resolve(v));

    await cache.get("a", factory("a"));
    await cache.get("b", factory("b"));
    await cache.get("c", factory("c"));

    // "a" was evicted to make room, so asking again recomputes it; "c" is still
    // held. Without a bound the map only ever grows — the stop keyspace is ~500
    // and the viewport walks across all of it.
    const again = vi.fn(() => Promise.resolve("a2"));
    await expect(cache.get("a", again)).resolves.toBe("a2");
    await expect(cache.get("c", again)).resolves.toBe("c");
  });

  it("never evicts an entry that is still in flight", async () => {
    const cache = new SettleCache<string>(10_000, 1);
    const slow = deferred<string>();
    const slowFactory = vi.fn(() => slow.promise);

    void cache.get("slow", slowFactory);
    await cache.get("fast", () => Promise.resolve("fast"));

    // Evicting the in-flight entry would not stop the work — it would only lose
    // the handle that lets the next caller share it, which is the one thing this
    // class exists to prevent.
    void cache.get("slow", slowFactory);
    expect(slowFactory).toHaveBeenCalledTimes(1);
    slow.resolve("v");
    await slow.promise;
  });
});
