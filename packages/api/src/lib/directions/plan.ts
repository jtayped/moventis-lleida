import { distanceMeters, type DirectionsPoint } from "@moventis/shared";
import { walkMeters, walkSeconds, type Network } from "./network";
import { rangeRaptor, type RaptorJourney, type StopWalk } from "./raptor";

/** Stops this close to an end of the trip are always candidates. */
export const ACCESS_RADIUS_M = 800;
/** When fewer than {@link ACCESS_MIN_STOPS} are that close, look this far for them. */
const ACCESS_FALLBACK_RADIUS_M = 1500;
const ACCESS_MIN_STOPS = 3;

/** Walking the whole way is offered up to this straight-line distance. */
export const WALK_ONLY_MAX_M = 1500;

/** "Leave now" looks this far ahead for departures... */
const WINDOW_S = 60 * 60;
/** ...and this far when the first hour has none (late evening, Sunday lines). */
const WIDE_WINDOW_S = 3 * 60 * 60;

export const MAX_ITINERARIES = 5;

const at = (p: DirectionsPoint): [number, number] => [p.lng, p.lat];

/** Served stops within walking range of a point, nearest first. */
export function nearbyStops(
  network: Network,
  point: DirectionsPoint,
): StopWalk[] {
  const served = network.stops
    .map((s, stop) => ({ stop, d: distanceMeters(at(point), [s.lng, s.lat]) }))
    .filter(({ stop }) => (network.patternsAtStop[stop]?.length ?? 0) > 0)
    .sort((a, b) => a.d - b.d);
  const close = served.filter((s) => s.d <= ACCESS_RADIUS_M);
  const chosen =
    close.length >= ACCESS_MIN_STOPS
      ? close
      : served
          .filter((s) => s.d <= ACCESS_FALLBACK_RADIUS_M)
          .slice(0, ACCESS_MIN_STOPS);
  return chosen.map(({ stop, d }) => ({
    stop,
    seconds: walkSeconds(d),
    meters: walkMeters(d),
  }));
}

export const journeyWalkMeters = (j: RaptorJourney): number =>
  j.legs.reduce((sum, l) => (l.kind === "ride" ? sum : sum + l.meters), 0);

/** Same buses between the same stops, walked the same way. */
function signature(network: Network, j: RaptorJourney): string {
  return j.legs
    .map((l) => {
      if (l.kind === "ride") {
        const trip = network.patterns[l.pattern]!.trips[l.trip]!;
        return `${trip.key}@${l.boardPosition}-${l.alightPosition}`;
      }
      if (l.kind === "transfer") return `w${l.from}-${l.to}`;
      return `${l.kind}${l.stop}`;
    })
    .join("|");
}

/**
 * Drop duplicates and any journey another one beats outright: leaves no
 * earlier, arrives no later, takes no more buses. Ranked by arrival, then
 * fewer buses, then less walking.
 */
export function rankJourneys(
  network: Network,
  journeys: RaptorJourney[],
): RaptorJourney[] {
  const unique = [
    ...new Map(journeys.map((j) => [signature(network, j), j])).values(),
  ];
  const dominated = (j: RaptorJourney) =>
    unique.some(
      (o) =>
        o !== j &&
        o.departAt >= j.departAt &&
        o.arriveAt <= j.arriveAt &&
        o.trips <= j.trips &&
        (o.departAt > j.departAt ||
          o.arriveAt < j.arriveAt ||
          o.trips < j.trips ||
          journeyWalkMeters(o) < journeyWalkMeters(j)),
    );
  return unique
    .filter((j) => !dominated(j))
    .sort(
      (a, b) =>
        a.arriveAt - b.arriveAt ||
        a.trips - b.trips ||
        journeyWalkMeters(a) - journeyWalkMeters(b),
    );
}

export interface PlanInput {
  from: DirectionsPoint;
  to: DirectionsPoint;
  /** Leave no earlier than this, in seconds after the service day's midnight. */
  departAt: number;
}

export interface PlanOutput {
  journeys: RaptorJourney[];
  /** Straight-line distance between the two ends, when walking it is an option. */
  walkOnlyMeters: number | null;
}

export function planJourneys(network: Network, input: PlanInput): PlanOutput {
  const access = nearbyStops(network, input.from);
  const egress = nearbyStops(network, input.to);
  const straight = distanceMeters(at(input.from), at(input.to));
  const walkOnlyMeters = straight <= WALK_ONLY_MAX_M ? straight : null;
  if (access.length === 0 || egress.length === 0)
    return { journeys: [], walkOnlyMeters };

  const search = (window: number) =>
    rangeRaptor(network, {
      access,
      egress,
      earliestDeparture: input.departAt,
      latestDeparture: input.departAt + window,
    });
  let journeys = search(WINDOW_S);
  if (journeys.length === 0) journeys = search(WIDE_WINDOW_S);

  return {
    journeys: rankJourneys(network, journeys).slice(0, MAX_ITINERARIES),
    walkOnlyMeters,
  };
}
