import { describe, expect, it, vi } from "vitest";
import { onceAtATime } from "./once-at-a-time.js";

/** A promise plus the handle to settle it from the test. */
function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("onceAtATime", () => {
  it("drops a call made while a run is in flight", async () => {
    const gate = deferred();
    const task = vi.fn(() => gate.promise);
    const onSkip = vi.fn();
    const guarded = onceAtATime(task, onSkip);

    const first = guarded();
    await guarded();

    expect(task).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);

    gate.resolve();
    await first;
  });

  it("runs again once the previous run has finished", async () => {
    const task = vi.fn(() => Promise.resolve());
    const guarded = onceAtATime(task);

    await guarded();
    await guarded();

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("releases the guard when the run throws", async () => {
    const task = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const guarded = onceAtATime(task);

    await expect(guarded()).rejects.toThrow("boom");
    await guarded();

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("passes arguments through to the wrapped task", async () => {
    const task = vi.fn((_n: number) => Promise.resolve());
    const guarded = onceAtATime(task);

    await guarded(7);

    expect(task).toHaveBeenCalledWith(7);
  });
});
