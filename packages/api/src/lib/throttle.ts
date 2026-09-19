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
 * Ordering semantics: **starts** are FIFO within a lane; **settlement** is not.
 * Each returned promise settles when its own `fn` settles, so a fast call queued
 * behind a slow one still resolves first, and a rejection only rejects its own
 * caller — it never blocks or poisons the tasks queued after it.
 *
 * Two lanes, because FIFO alone is not enough once a background feature can
 * enqueue in bulk. Work someone is *waiting on* — a stop drawer they just
 * tapped, a line they just selected — goes in `"high"` (the default, so every
 * existing call site keeps today's behaviour). Speculative work goes in
 * `"low"` and only starts when nothing is waiting.
 *
 * Without this, the map's next-bus prefetch put ~15 requests in front of the
 * next drawer tap, and 7 of 11 drawer opens took over three seconds — up to
 * 8.9 s — for a feature whose whole purpose is a glanceable number. A cap on
 * how much the prefetch enqueues cannot fix that on its own: the requests are
 * legitimate, they just must never be the reason someone waits.
 *
 * `"low"` can be starved indefinitely by sustained `"high"` traffic. That is the
 * intended trade: the thing starved is a pin that shows no time for a while,
 * and it is retried on the caller's own timer.
 */
export type QueuePriority = "high" | "low";

export class ThrottledQueue {
  private readonly intervalMs: number;
  private readonly lanes: Record<QueuePriority, (() => void)[]> = {
    high: [],
    low: [],
  };
  /** Earliest timestamp at which the next task may start. */
  private nextStartTime = 0;
  private dispatching = false;

  constructor(ratePerSecond: number) {
    this.intervalMs = 1000 / ratePerSecond;
  }

  schedule<T>(
    fn: () => Promise<T>,
    priority: QueuePriority = "high",
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.lanes[priority].push(() => {
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
      while (this.lanes.high.length > 0 || this.lanes.low.length > 0) {
        const wait = this.nextStartTime - Date.now();
        if (wait > 0) await sleep(wait);
        // Re-read the lanes *after* the wait: something high-priority may have
        // arrived while this slot was ticking down, and it should take the slot
        // rather than watch a speculative fetch take it.
        const start = this.lanes.high.shift() ?? this.lanes.low.shift();
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
