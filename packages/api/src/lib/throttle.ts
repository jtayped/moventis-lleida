const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Rate limiter that gates on *dispatch* time, not completion.
 *
 * Tasks are started in the order `schedule()` was called, at most `ratePerSecond`
 * starts per second (≥ `intervalMs` between two starts), and then run
 * concurrently. Chaining on the previous task's completion instead — which is
 * what this used to do — collapses the limit to a serial queue: throughput
 * becomes 1/latency for the whole server process, and one slow (or hung)
 * response stalls every other visitor's request behind it.
 *
 * Ordering semantics: **starts** are FIFO; **settlement** is not. Each returned
 * promise settles when its own `fn` settles, so a fast call queued behind a slow
 * one still resolves first, and a rejection only rejects its own caller — it
 * never blocks or poisons the tasks queued after it.
 */
export class ThrottledQueue {
  private readonly intervalMs: number;
  private readonly pending: (() => void)[] = [];
  /** Earliest timestamp at which the next task may start. */
  private nextStartTime = 0;
  private dispatching = false;

  constructor(ratePerSecond: number) {
    this.intervalMs = 1000 / ratePerSecond;
  }

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push(() => {
        // Settle the caller from the task itself, so the dispatch loop never
        // awaits `fn` and the next start is not held back by this one.
        try {
          void Promise.resolve(fn()).then(resolve, reject);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
      void this.dispatch();
    });
  }

  private async dispatch(): Promise<void> {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      while (this.pending.length > 0) {
        const wait = this.nextStartTime - Date.now();
        if (wait > 0) await sleep(wait);
        const start = this.pending.shift();
        if (!start) break;
        // Anchor on `now` when the queue has been idle, so an idle period does
        // not bank credit for a burst of immediate starts.
        this.nextStartTime =
          Math.max(Date.now(), this.nextStartTime) + this.intervalMs;
        start();
      }
    } finally {
      this.dispatching = false;
    }
  }
}

/** Global 5 req/s gate for all outbound Moventis API calls. */
export const moventisQueue = new ThrottledQueue(5);
