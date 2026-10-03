import type { Schedules } from "@moventis/shared";
import { serviceSecondOf } from "../zoned-time";
import { alignLive, LIVE_EARLY_S } from "./live-match";
import type { Network, Trip } from "./network";
import { TRANSFER_SLACK_S, type RaptorJourney, type RaptorLeg } from "./raptor";

/**
 * Live times for a plan. The timetable finds the shape of each journey (which
 * lines, boarded and left where); what Moventis lists at those stops right now
 * sets every time shown.
 *
 * Moventis names no trip, so a listed time is tied to a timetabled trip by
 * aligning the stop's list with the trips due there ({@link alignLive}): buses
 * on one journey do not overtake, so the two lists match in order at the least
 * total deviation. That identity is what lets a bus be followed from the stop
 * it is boarded at to the stop it is left at, and what makes a missed
 * connection visible.
 */

/**
 * Moventis's journey names and the scraper's variant descriptions spell the
 * same journey with different spacing, accents and punctuation ("agronoms" /
 * "agrònoms", "antonivilaplana_alacantgarrigues" / "antoni vilaplana alacant
 * garrigues"), so only letters and digits are compared.
 */
export const journeyKey = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");

export interface LiveEntry {
  /** Seconds after the service day's midnight. */
  sec: number;
  /** A real-time prediction (`real:"S"`), not a printed time. */
  isRealTime: boolean;
}

/** One stop's board, per `${routeId}|${journeyKey}`, ascending. */
export type LiveListing = Map<string, LiveEntry[]>;

/** Read a stop's board onto the network: its lines by `routeId`, its times in service seconds. */
export function readBoard(
  network: Network,
  serviceDate: string,
  schedules: Schedules,
): LiveListing {
  const routeOf = new Map(
    [...network.lines.values()].map((l) => [l.externalId, l.routeId]),
  );
  const listing: LiveListing = new Map();
  for (const line of schedules) {
    // Boards carry lines from every city Moventis runs (Palma's 107 and 123
    // turn up at Lleida stops); only the network's own are read.
    const routeId = routeOf.get(line.externalLineId);
    if (!routeId) continue;
    for (const journey of line.journeys) {
      const key = `${routeId}|${journeyKey(journey.name)}`;
      const entries = journey.scheduledTimes.map((t) => ({
        sec: serviceSecondOf(serviceDate, t.arrivalTime),
        isRealTime: t.isRealTime,
      }));
      listing.set(
        key,
        [...(listing.get(key) ?? []), ...entries].sort((a, b) => a.sec - b.sec),
      );
    }
  }
  return listing;
}

/**
 * Trips due this long ago may still be listed, running late; any earlier one
 * is gone whatever the listing says. Longer than `LIVE_LATE_S`, the latest a
 * listed time is still matched to its trip.
 */
const LOOKBACK_S = 30 * 60;

type Role = "board" | "alight";

/** What a stop's listing says about one trip there. */
export type TripStatus =
  | { kind: "listed"; entry: LiveEntry }
  /**
   * Due before the last time the stop lists for its journey, and not among
   * them: gone already, or not running. Lists are cut from the tail only, so
   * inside the listed span a missing bus is a bus that will not come.
   */
  | { kind: "gone" }
  /** The stop's board is unavailable, does not list the journey, or the trip is due after its last entry. */
  | { kind: "unknown" };

interface Alignment {
  /** Listed entry per `${pattern}:${trip}:${position}`. */
  matched: Map<string, LiveEntry>;
  /** The last listed time; a trip due by then and unmatched is gone. */
  horizon: number;
}

/** The boards of one plan, aligned with the network's trips on demand. */
export class LiveTimes {
  private readonly alignments = new Map<string, Alignment | null>();
  private readonly journeys = new Map<string, string>();

  constructor(
    private readonly network: Network,
    /** Per stop index; a stop without one is unknown, never empty. */
    private readonly listings: Map<number, LiveListing>,
    /** Now, in service seconds. */
    private readonly now: number,
  ) {}

  journeyOf(trip: Trip): string {
    let key = this.journeys.get(trip.headsign);
    if (key === undefined) {
      key = journeyKey(trip.headsign);
      this.journeys.set(trip.headsign, key);
    }
    return key;
  }

  status(
    pattern: number,
    trip: number,
    position: number,
    role: Role,
  ): TripStatus {
    const p = this.network.patterns[pattern]!;
    const t = p.trips[trip]!;
    const aligned = this.alignment(
      p.stops[position]!,
      t.routeId,
      this.journeyOf(t),
      role,
    );
    if (!aligned) return { kind: "unknown" };
    const entry = aligned.matched.get(`${pattern}:${trip}:${position}`);
    if (entry) return { kind: "listed", entry };
    const due = t.times[position]!;
    return due < this.now - LOOKBACK_S || due <= aligned.horizon
      ? { kind: "gone" }
      : { kind: "unknown" };
  }

  /**
   * The stop's list for one line and journey, aligned with every trip of it
   * due there. A trip is boarded anywhere but its last stop and left anywhere
   * but its first, which keeps a loop's arrival back at its terminal apart
   * from the next lap's departure, listed at the same stop.
   */
  private alignment(
    stop: number,
    routeId: string,
    journey: string,
    role: Role,
  ): Alignment | null {
    const key = `${stop}|${routeId}|${journey}|${role}`;
    const held = this.alignments.get(key);
    if (held !== undefined) return held;

    const live = this.listings.get(stop)?.get(`${routeId}|${journey}`);
    let aligned: Alignment | null = null;
    if (live) {
      // Every trip one of the listed times could be: from the latest a late
      // bus is still matched, to just past the last listed time. A night
      // line's list starts hours ahead, so no fixed lookahead will do.
      const horizon = live.at(-1)?.sec ?? -Infinity;
      const from = this.now - LOOKBACK_S;
      const to = horizon + LIVE_EARLY_S;
      const due: { key: string; time: number }[] = [];
      for (const { pattern, position } of this.network.patternsAtStop[stop] ??
        []) {
        const p = this.network.patterns[pattern]!;
        if (role === "board" ? position === p.stops.length - 1 : position === 0)
          continue;
        p.trips.forEach((t, i) => {
          if (t.routeId !== routeId || this.journeyOf(t) !== journey) return;
          const time = t.times[position]!;
          if (time < from || time > to) return;
          due.push({ key: `${pattern}:${i}:${position}`, time });
        });
      }
      due.sort((a, b) => a.time - b.time || (a.key < b.key ? -1 : 1));
      const matches = alignLive(
        due.map((d) => d.time),
        live.map((l) => l.sec),
      );
      const matched = new Map<string, LiveEntry>();
      matches.forEach((i, j) => {
        if (i >= 0) matched.set(due[i]!.key, live[j]!);
      });
      aligned = { matched, horizon };
    }
    this.alignments.set(key, aligned);
    return aligned;
  }
}

export interface Timing {
  /** Seconds after the service day's midnight. */
  sec: number;
  /** From Moventis's real-time listing, or carried forward from it; false is the printed timetable. */
  live: boolean;
}

export interface RideTiming {
  board: Timing;
  alight: Timing;
}

export interface TimedJourney extends RaptorJourney {
  /** One per ride leg, in order. */
  rides: RideTiming[];
}

/**
 * A listed time at the alighting stop is the boarded bus only when the ride
 * it implies is close to the timetabled one: no more than this much faster...
 */
const RIDE_FASTER_S = 2 * 60;
/** ...nor this much slower. Otherwise the board's time is carried forward instead. */
const RIDE_SLOWER_S = 15 * 60;

type RideLeg = Extract<RaptorLeg, { kind: "ride" }>;
type RideOption = Omit<RideLeg, "kind">;

/** Every trip of the ride's line and journey that serves its two stops in order. */
function rideOptions(
  network: Network,
  live: LiveTimes,
  ride: RideLeg,
): RideOption[] {
  const shape = network.patterns[ride.pattern]!;
  const sample = shape.trips[ride.trip]!;
  const journey = live.journeyOf(sample);
  const board = shape.stops[ride.boardPosition]!;
  const alight = shape.stops[ride.alightPosition]!;

  const options: RideOption[] = [];
  for (const { pattern, position } of network.patternsAtStop[board] ?? []) {
    const p = network.patterns[pattern]!;
    const alightPosition = p.stops.indexOf(alight, position + 1);
    if (alightPosition < 0) continue;
    p.trips.forEach((t, trip) => {
      if (t.routeId === sample.routeId && live.journeyOf(t) === journey)
        options.push({
          pattern,
          trip,
          boardPosition: position,
          alightPosition,
        });
    });
  }
  return options;
}

/**
 * When one trip leaves the boarding stop and reaches the alighting one, by the
 * listings where they have it and the timetable where they do not; null when
 * the boarding stop's listing shows the bus will not come.
 */
function timeRide(
  network: Network,
  live: LiveTimes,
  o: RideOption,
): RideTiming | null {
  const trip = network.patterns[o.pattern]!.trips[o.trip]!;
  const scheduledBoard = trip.times[o.boardPosition]!;
  const ride = trip.times[o.alightPosition]! - scheduledBoard;

  const b = live.status(o.pattern, o.trip, o.boardPosition, "board");
  if (b.kind === "gone") return null;
  const board: Timing =
    b.kind === "listed"
      ? { sec: b.entry.sec, live: b.entry.isRealTime }
      : { sec: scheduledBoard, live: false };

  const a = live.status(o.pattern, o.trip, o.alightPosition, "alight");
  if (a.kind === "listed") {
    const listedRide = a.entry.sec - board.sec;
    if (
      listedRide >= ride - RIDE_FASTER_S &&
      listedRide <= ride + RIDE_SLOWER_S
    )
      return {
        board,
        alight: { sec: a.entry.sec, live: a.entry.isRealTime },
      };
  }
  // Moventis projects a bus's later stops by the timetable's offsets, so
  // carrying the boarding delay forward is what it would have listed.
  return { board, alight: { sec: board.sec + ride, live: board.live } };
}

export interface RetimeQuery {
  earliestDeparture: number;
  latestDeparture: number;
  transferSlack?: number;
}

/**
 * Every journey of each shape that leaves the origin inside the window, timed
 * from the listings: one per bus of the first ride, each followed by the
 * earliest bus of every later ride that can still be caught. A bus the
 * listings show will not come is never offered, and a connection it would
 * miss is not either; the next bus takes its place.
 *
 * `shapes` are timetable journeys, read only for their stops, lines and walks.
 */
export function retimeJourneys(
  network: Network,
  shapes: RaptorJourney[],
  live: LiveTimes,
  q: RetimeQuery,
): TimedJourney[] {
  const slack = q.transferSlack ?? TRANSFER_SLACK_S;
  const journeys: TimedJourney[] = [];

  for (const shape of shapes) {
    const access = shape.legs[0];
    const egress = shape.legs.at(-1);
    if (access?.kind !== "access" || egress?.kind !== "egress") continue;

    // Each ride with the walking that precedes it (a transfer, or nothing
    // when the next bus leaves from the stop the last one stopped at).
    const steps: { ride: RideLeg; walk: number }[] = [];
    let walk = 0;
    for (const leg of shape.legs) {
      if (leg.kind === "transfer") walk += leg.seconds;
      if (leg.kind !== "ride") continue;
      steps.push({ ride: leg, walk });
      walk = 0;
    }
    const options = steps.map(({ ride }) =>
      rideOptions(network, live, ride)
        .map((option) => ({ option, timing: timeRide(network, live, option) }))
        .filter(
          (o): o is { option: RideOption; timing: RideTiming } =>
            o.timing !== null,
        )
        .sort((a, b) => a.timing.board.sec - b.timing.board.sec),
    );

    for (const first of options[0] ?? []) {
      const leave = first.timing.board.sec - access.seconds;
      if (leave < q.earliestDeparture) continue;
      if (leave > q.latestDeparture) break;

      const chosen = [first];
      let t = first.timing.alight.sec;
      for (let i = 1; i < steps.length; i++) {
        const ready = t + steps[i]!.walk + slack;
        const next = options[i]!.find((o) => o.timing.board.sec >= ready);
        if (!next) break;
        chosen.push(next);
        t = next.timing.alight.sec;
      }
      if (chosen.length < steps.length) continue;

      let r = 0;
      journeys.push({
        departAt: leave,
        arriveAt: t + egress.seconds,
        trips: steps.length,
        legs: shape.legs.map((leg) =>
          leg.kind === "ride" ? { kind: "ride", ...chosen[r++]!.option } : leg,
        ),
        rides: chosen.map((c) => c.timing),
      });
    }
  }
  return journeys;
}

/**
 * The distinct shapes among timetable journeys, in the order given: the same
 * lines boarded and left at the same stops, walked the same way. Which trip a
 * journey took does not matter here; the listings choose that.
 */
export function journeyShapes(
  network: Network,
  journeys: RaptorJourney[],
): RaptorJourney[] {
  const seen = new Map<string, RaptorJourney>();
  for (const j of journeys) {
    const key = j.legs
      .map((leg) => {
        if (leg.kind !== "ride")
          return leg.kind === "transfer"
            ? `w${leg.from}>${leg.to}`
            : `${leg.kind}${leg.stop}`;
        const p = network.patterns[leg.pattern]!;
        const t = p.trips[leg.trip]!;
        return `${t.routeId}:${journeyKey(t.headsign)}:${p.stops[leg.boardPosition]}>${p.stops[leg.alightPosition]}`;
      })
      .join("|");
    if (!seen.has(key)) seen.set(key, j);
  }
  return [...seen.values()];
}

/**
 * The stops whose boards a set of shapes needs, each with a line that serves
 * it: every boarding stop first, since without one the bus cannot be told
 * apart, then every alighting stop.
 */
export function boardsNeeded(
  network: Network,
  shapes: RaptorJourney[],
): { stop: number; routeId: string }[] {
  const boarding = new Map<number, string>();
  const alighting = new Map<number, string>();
  for (const shape of shapes)
    for (const leg of shape.legs) {
      if (leg.kind !== "ride") continue;
      const p = network.patterns[leg.pattern]!;
      const routeId = p.trips[leg.trip]!.routeId;
      const board = p.stops[leg.boardPosition]!;
      const alight = p.stops[leg.alightPosition]!;
      if (!boarding.has(board)) boarding.set(board, routeId);
      if (!alighting.has(alight)) alighting.set(alight, routeId);
    }
  for (const stop of boarding.keys()) alighting.delete(stop);
  return [...boarding, ...alighting].map(([stop, routeId]) => ({
    stop,
    routeId,
  }));
}
