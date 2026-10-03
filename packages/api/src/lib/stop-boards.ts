import type { Schedules } from "@moventis/shared";
import { getStopSchedule } from "./stop-schedule";
import type { QueuePriority } from "./throttle";

/**
 * What Moventis lists at one stop: every line serving it, each journey's next
 * arrivals as absolute instants. One request answers for every line at the
 * stop whatever route id it names (see `stops.nextArrivals`), so a board is
 * keyed by the stop alone and any caller can read any line out of it.
 */
export interface StopBoard {
  fetchedAt: number;
  schedules: Schedules;
}

/**
 * A board this recent is served without asking again. Shorter than the
 * directions panel's 30 s refetch, so each refresh of one client reads afresh,
 * while everyone planning from the same street inside that window shares one
 * request.
 */
export const BOARD_FRESH_MS = 20_000;

/**
 * A board this old can still stand in when a fresh one does not arrive in
 * time. Its arrivals are absolute instants, so age only means the predictions
 * have not been updated, not that they have shifted; a couple of minutes of
 * that is better than falling back to the printed timetable.
 */
export const BOARD_STALE_MS = 2 * 60_000;

/** ~250 stops in the network; the bound only guards against a runaway key. */
const MAX_BOARDS = 600;

const latest = new Map<string, StopBoard>();
const inflight = new Map<string, Promise<StopBoard | null>>();

/**
 * The stop's board, fresh or from the last {@link BOARD_FRESH_MS}; null when
 * Moventis did not answer. A request already in flight for the stop is shared,
 * not repeated.
 *
 * `routeExternalId` only has to be a line that runs at the stop today: asked
 * with a dormant one, the endpoint answers its no-service stub for the whole
 * stop.
 */
export function fetchStopBoard(
  stopExternalId: string,
  routeExternalId: string,
  priority: QueuePriority,
): Promise<StopBoard | null> {
  const held = latest.get(stopExternalId);
  if (held && Date.now() - held.fetchedAt < BOARD_FRESH_MS)
    return Promise.resolve(held);
  const pending = inflight.get(stopExternalId);
  if (pending) return pending;

  const request = getStopSchedule(stopExternalId, routeExternalId, priority)
    // A changed response shape throws; for a board that is the same as no
    // answer, and the caller falls back the same way.
    .catch(() => null)
    .then((schedules) => {
      inflight.delete(stopExternalId);
      if (!schedules) return null;
      const board = { fetchedAt: Date.now(), schedules };
      latest.delete(stopExternalId);
      latest.set(stopExternalId, board);
      if (latest.size > MAX_BOARDS) latest.delete(latest.keys().next().value!);
      return board;
    });
  inflight.set(stopExternalId, request);
  return request;
}

/** The last board held for the stop, if it is within {@link BOARD_STALE_MS}. */
export function recentStopBoard(stopExternalId: string): StopBoard | null {
  const held = latest.get(stopExternalId);
  return held && Date.now() - held.fetchedAt < BOARD_STALE_MS ? held : null;
}

/** Test hook: the module-level boards would otherwise leak between cases. */
export function clearStopBoards(): void {
  latest.clear();
  inflight.clear();
}
