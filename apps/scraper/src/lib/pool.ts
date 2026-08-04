/**
 * Maps `items` through `fn` with at most `limit` calls in flight at once,
 * preserving input order in the result.
 *
 * The calendar probe fans out one request per candidate date per line, which is
 * an order of magnitude more traffic than the old three-dates-per-line fetch.
 * Unbounded `Promise.all` over that set is what gets an IP rate-limited.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!, index);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);

  return results;
}
