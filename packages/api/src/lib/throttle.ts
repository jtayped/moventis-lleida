const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

class ThrottledQueue {
  private chain = Promise.resolve();
  private lastFireTime = 0;
  private readonly intervalMs: number;

  constructor(ratePerSecond: number) {
    this.intervalMs = 1000 / ratePerSecond;
  }

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(async () => {
      const wait = this.lastFireTime + this.intervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastFireTime = Date.now();
      return fn();
    });
    this.chain = result.then(() => undefined, () => undefined);
    return result;
  }
}

/** Global 5 req/s gate for all outbound Moventis API calls. */
export const moventisQueue = new ThrottledQueue(5);
