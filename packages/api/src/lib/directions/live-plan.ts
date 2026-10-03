import { fetchStopBoard, recentStopBoard } from "../stop-boards";
import {
  boardsNeeded,
  journeyShapes,
  LiveTimes,
  readBoard,
  retimeJourneys,
  type LiveListing,
  type TimedJourney,
} from "./live";
import type { Network } from "./network";
import {
  MAX_ITINERARIES,
  PLAN_WINDOWS_S,
  rankJourneys,
  searchJourneys,
  walkOnlyMetersFor,
  type PlanInput,
} from "./plan";
import type { RaptorJourney } from "./raptor";

/**
 * A plan leaving further ahead than this is the timetable's alone: listings
 * reach one to two and a half hours ahead, so asking would only spend
 * requests on boards that cannot list the buses yet.
 */
export const LIVE_PLAN_HORIZON_S = 60 * 60;

/** Distinct journey shapes re-timed from listings, best by the timetable first. */
const MAX_SHAPES = 8;

/**
 * Boards asked per plan: about 2.4 s of the 5 req/s gate when it is idle. The
 * boarding stops come first, so a cut only costs some arrivals their own
 * listing, and those are carried forward from the boarding stop instead.
 */
const MAX_BOARDS = 12;

/**
 * How long a plan waits for its boards. Past it, a stop with a board from the
 * last couple of minutes uses that one, and any other is read from the
 * timetable; a request still queued finishes anyway and is there for the
 * next refresh.
 */
export const LIVE_DEADLINE_MS = 4_000;

export interface LivePlanInput extends PlanInput {
  /** `YYYY-MM-DD`, the day the network's seconds count from. */
  serviceDate: string;
  /** Now, in service seconds. */
  now: number;
}

export interface LivePlan {
  journeys: (RaptorJourney | TimedJourney)[];
  walkOnlyMeters: number | null;
}

/**
 * Plan with live times: the timetable proposes the journey shapes, the
 * boards of the stops they use set the times, and the ranking runs on those.
 * Leaving later than {@link LIVE_PLAN_HORIZON_S}, the timetable answers alone.
 */
export async function planLive(
  network: Network,
  input: LivePlanInput,
  { deadlineMs = LIVE_DEADLINE_MS }: { deadlineMs?: number } = {},
): Promise<LivePlan> {
  const walkOnlyMeters = walkOnlyMetersFor(input);
  const live = input.departAt - input.now <= LIVE_PLAN_HORIZON_S;

  for (const window of PLAN_WINDOWS_S) {
    const found = searchJourneys(network, input, window);
    if (found.length === 0) continue;
    if (!live)
      return {
        journeys: rankJourneys(network, found).slice(0, MAX_ITINERARIES),
        walkOnlyMeters,
      };

    // Best by the timetable first, then the rest, so the shapes a cut keeps
    // are the ones most likely to win once timed.
    const ranked = rankJourneys(network, found);
    const shapes = journeyShapes(network, [
      ...ranked,
      ...[...found].sort((a, b) => a.arriveAt - b.arriveAt),
    ]).slice(0, MAX_SHAPES);
    const listings = await loadListings(
      network,
      input.serviceDate,
      boardsNeeded(network, shapes).slice(0, MAX_BOARDS),
      deadlineMs,
    );
    const timed = retimeJourneys(
      network,
      shapes,
      new LiveTimes(network, listings, input.now),
      {
        earliestDeparture: input.departAt,
        latestDeparture: input.departAt + window,
      },
    );
    // Nothing the listings let through in this window: try the wider one,
    // as the timetable would.
    if (timed.length > 0)
      return {
        journeys: rankJourneys(network, timed).slice(0, MAX_ITINERARIES),
        walkOnlyMeters,
      };
  }
  return { journeys: [], walkOnlyMeters };
}

async function loadListings(
  network: Network,
  serviceDate: string,
  stops: { stop: number; routeId: string }[],
  deadlineMs: number,
): Promise<Map<number, LiveListing>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<"expired">((resolve) => {
    timer = setTimeout(() => resolve("expired"), deadlineMs);
  });
  try {
    const boards = await Promise.all(
      stops.map(async ({ stop, routeId }) => {
        const externalId = network.stops[stop]!.externalId;
        const line = network.lines.get(routeId)!;
        const board = await Promise.race([
          fetchStopBoard(externalId, line.externalId, "batch"),
          expired,
        ]);
        return {
          stop,
          board:
            board === "expired" || board === null
              ? recentStopBoard(externalId)
              : board,
        };
      }),
    );
    const listings = new Map<number, LiveListing>();
    for (const { stop, board } of boards)
      if (board)
        listings.set(stop, readBoard(network, serviceDate, board.schedules));
    return listings;
  } finally {
    clearTimeout(timer);
  }
}
