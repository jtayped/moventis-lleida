/**
 * A promise cache whose TTL is measured from **settlement**, not from the start
 * of the work, and which serves an entry for as long as it is in flight.
 *
 * Timing the TTL from the start instead deduplicates nothing under load. A
 * computation that takes 90 s because the 5 req/s outbound queue is backed up
 * would let a fresh, *complete* one start every `ttlMs`, so several duplicates
 * of the same work pile into the same queue and lengthen it further. That is
 * the wrong way round: the queue being slow is precisely the moment to stop
 * adding to it.
 *
 * Gating on flight instead makes the refresh period self-regulating — it floats
 * to `work duration + ttlMs`, so a healthy key still refreshes promptly and a
 * struggling one backs off on its own without a tuned constant.
 *
 * A rejection is never shared: the entry is dropped so the next caller tries
 * again. That drop is identity-checked, so a retry that already replaced the
 * entry is not evicted by the old one's rejection landing afterwards.
 */
export class SettleCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  /**
   * @param ttlMs How long a settled value keeps being served.
   * @param maxEntries Upper bound on retained keys. Unlike the 14-line keyspace
   * this policy started life on, a per-stop cache spans ~500 keys and would
   * otherwise only ever grow — entries are replaced lazily on access, never
   * removed.
   */
  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  get(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && this.isUsable(cached)) return cached.value;

    const entry: Entry<T> = { settledAt: null, value: factory() };
    this.entries.set(key, entry);
    entry.value.then(
      () => {
        entry.settledAt = Date.now();
      },
      () => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
      },
    );
    this.evictOverflow();
    return entry.value;
  }

  /** Test hook: a module-level cache would otherwise leak between cases. */
  clear(): void {
    this.entries.clear();
  }

  private isUsable(entry: Entry<T>): boolean {
    if (entry.settledAt === null) return true;
    return Date.now() - entry.settledAt < this.ttlMs;
  }

  /**
   * Drops settled entries in insertion order until the bound is met. In-flight
   * entries are never dropped — evicting one would not stop the work, it would
   * only lose the handle that lets the next caller share it, which is the one
   * thing this class exists to prevent.
   */
  private evictOverflow(): void {
    if (this.entries.size <= this.maxEntries) return;
    for (const [key, entry] of this.entries) {
      if (this.entries.size <= this.maxEntries) return;
      if (entry.settledAt !== null) this.entries.delete(key);
    }
  }
}

interface Entry<T> {
  /** When the work settled; null while it is still in flight. */
  settledAt: number | null;
  value: Promise<T>;
}
