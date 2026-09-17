/**
 * Wraps an async task so that only one run of it can be in flight at a time.
 * A call made while a run is in progress is dropped — `onSkip` is invoked and
 * the returned promise resolves immediately, without starting a second run.
 *
 * The scraper needs this because `syncAll` is triggered from two places (boot
 * and the 03:00 cron) and keeps per-run bookkeeping — the set of stops the run
 * has seen — that pruning is measured against. Two overlapping runs would share
 * nothing but the database and would still corrupt each other's view of "what
 * did this run see", which is the number that decides whether the destructive
 * half of the sync is allowed to act.
 *
 * The flag lives in this closure rather than in `sync-all.ts` so the behaviour
 * can be tested without pulling Prisma into the test process.
 */
export function onceAtATime<A extends unknown[]>(
  task: (...args: A) => Promise<void>,
  onSkip: () => void = () => undefined,
): (...args: A) => Promise<void> {
  let running = false;

  return async (...args: A): Promise<void> => {
    if (running) {
      onSkip();
      return;
    }

    running = true;
    try {
      await task(...args);
    } finally {
      running = false;
    }
  };
}
