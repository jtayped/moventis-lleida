/**
 * How many stops in frame get their next bus fetched at once.
 *
 * One Moventis request each, against the same process-wide 5 req/s FIFO gate
 * the stop drawer and the live locator queue on — so a burst here is latency
 * someone else's drawer tap pays for, on their device. Fifteen clears the queue
 * in ~3 s and covers a zoomed-in viewport; the stops past the cap simply show
 * no pill rather than an empty one.
 *
 * The same reasoning as {@link MAX_PREDICTED_LINES}, one surface further out.
 */
export const MAX_ETA_STOPS = 15;

/**
 * Deliberately slower than the drawer's 30 s and the locator's 25 s. A pill is
 * glanceable context, not the timetable — the drawer is one tap away and is
 * what someone actually reads a departure off. Paying 15 requests a minute for
 * it is already the largest standing cost on the queue.
 */
export const ETA_REFETCH_MS = 60_000;
