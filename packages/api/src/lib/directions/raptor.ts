import type { Network, Pattern } from "./network";

/**
 * Range RAPTOR (Delling, Pajor & Werneck, "Round-Based Public Transit
 * Routing", 2012) over a {@link Network}.
 *
 * Round *k* finds the earliest arrival at every stop using at most *k* trips:
 * it scans each pattern that serves a stop improved in round *k − 1*, rides
 * the earliest catchable trip along it, and then walks one footpath from every
 * stop the round improved. The rounds themselves are the transfer criterion,
 * so one search yields the Pareto set over (arrival, trips) — the "faster, or
 * fewer changes" choice a rider weighs — without a multi-criteria queue.
 *
 * The range part answers "leave in the next hour": one run per distinct
 * departure from the origin in the window, latest first, **without resetting
 * labels** between runs. A label from a later departure is an upper bound for
 * an earlier one, so each run only explores what an earlier start actually
 * improves, and a journey is recorded exactly when a run improves the best
 * known arrival for its trip count. What comes out is the Pareto set over
 * (departure, arrival, trips) inside the window.
 *
 * That carry-over is also why pruning compares a stop's round-*k* label only
 * against round *k* (which already holds the best of the rounds below it),
 * never against a best-over-all-rounds: once labels survive between runs, the
 * latter holds two-bus arrivals from later departures, and those would prune
 * an earlier one-bus journey that is still Pareto-optimal.
 *
 * Footpaths are relaxed once per round, which is exact as long as the
 * footpath graph is transitively closed; straight-line distances under one
 * radius are, up to the radius itself (see `TRANSFER_RADIUS_M`).
 *
 * All times are seconds after the service day's midnight.
 */

/** At most this many buses in one journey (three changes). */
export const MAX_TRIPS = 4;

/**
 * Margin a change needs at the stop: a bus timetabled to arrive at 10:00 does
 * not reliably let anyone catch one leaving at 10:00. Not applied to the first
 * boarding, where the walk from the origin already carries its own margin.
 */
export const TRANSFER_SLACK_S = 60;

export interface StopWalk {
  stop: number;
  seconds: number;
  meters: number;
}

export interface RaptorQuery {
  /** Walks from the origin to nearby stops. */
  access: StopWalk[];
  /** Walks from nearby stops to the destination. */
  egress: StopWalk[];
  /** Leave the origin no earlier than this... */
  earliestDeparture: number;
  /** ...and no later than this (inclusive). */
  latestDeparture: number;
  maxTrips?: number;
  transferSlack?: number;
}

export type RaptorLeg =
  | { kind: "access"; stop: number; seconds: number; meters: number }
  | {
      kind: "ride";
      pattern: number;
      trip: number;
      boardPosition: number;
      alightPosition: number;
    }
  | {
      kind: "transfer";
      from: number;
      to: number;
      seconds: number;
      meters: number;
    }
  | { kind: "egress"; stop: number; seconds: number; meters: number };

export interface RaptorJourney {
  /** When to leave the origin: the first boarding minus the walk to it. */
  departAt: number;
  arriveAt: number;
  trips: number;
  legs: RaptorLeg[];
}

type Label =
  | { kind: "access"; seconds: number; meters: number }
  | {
      kind: "ride";
      pattern: number;
      trip: number;
      boardPosition: number;
      alightPosition: number;
    }
  | { kind: "transfer"; from: number; seconds: number; meters: number }
  /** Same arrival as the round before; follow the chain there. */
  | { kind: "inherit" };

const INHERIT: Label = { kind: "inherit" };

/** Index of the first trip leaving `position` at or after `ready`, or −1. */
export function earliestTrip(
  pattern: Pattern,
  position: number,
  ready: number,
): number {
  let lo = 0;
  let hi = pattern.trips.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pattern.trips[mid]!.times[position]! < ready) lo = mid + 1;
    else hi = mid;
  }
  return lo < pattern.trips.length ? lo : -1;
}

/** Every distinct "leave the origin at" instant that boards some trip in the window. */
function departureCandidates(network: Network, q: RaptorQuery): number[] {
  const set = new Set<number>();
  for (const a of q.access) {
    for (const { pattern, position } of network.patternsAtStop[a.stop] ?? []) {
      for (const trip of network.patterns[pattern]!.trips) {
        const leave = trip.times[position]! - a.seconds;
        if (leave >= q.earliestDeparture && leave <= q.latestDeparture)
          set.add(leave);
      }
    }
  }
  return [...set].sort((a, b) => b - a);
}

export function rangeRaptor(network: Network, q: RaptorQuery): RaptorJourney[] {
  const K = q.maxTrips ?? MAX_TRIPS;
  const slack = q.transferSlack ?? TRANSFER_SLACK_S;
  const n = network.stops.length;

  const tau = Array.from({ length: K + 1 }, () =>
    new Array<number>(n).fill(Infinity),
  );
  const parent = Array.from({ length: K + 1 }, () =>
    new Array<Label | null>(n).fill(null),
  );
  /**
   * The round's arrival *by bus* at each stop (time and label), kept apart
   * from `tau`/`parent` because a footpath may improve the same stop on foot.
   * Every walk after a bus starts from these — a transfer to the next bus and
   * the walk to the destination alike — so a journey never chains two walks.
   * Reading the best label instead once produced "get off, walk to another
   * stop, walk on to the destination", and a stop that walked onwards from its
   * bus arrival and was then itself reached on foot read back as walk → walk.
   * It also keeps the walk from the origin out of the destination check: "walk
   * to a stop, then walk on" is not a bus journey, and as a bound it would
   * prune every real one slower than it.
   */
  const rideTau = Array.from({ length: K + 1 }, () =>
    new Array<number>(n).fill(Infinity),
  );
  const rideLabel = Array.from({ length: K + 1 }, () =>
    new Array<Extract<Label, { kind: "ride" }> | null>(n).fill(null),
  );
  /** Best arrival at the destination per trip count. */
  const target = new Array<number>(K + 1).fill(Infinity);
  const journeys: RaptorJourney[] = [];

  /** Nothing slower than a known journey with no more trips is worth keeping. */
  const bound = (k: number) => {
    let m = Infinity;
    for (let i = 1; i <= k; i++) m = Math.min(m, target[i]!);
    return m;
  };

  const extract = (
    k: number,
    egress: StopWalk,
    arriveAt: number,
  ): RaptorJourney | null => {
    const legs: RaptorLeg[] = [{ kind: "egress", ...egress }];
    let stop = egress.stop;
    let round = k;
    let trips = 0;
    // The destination is always walked to from a bus arrival.
    let pending: Label | null = rideLabel[k]![stop] ?? null;
    // Each step either lowers the round or follows a transfer; a stale chain
    // could in principle cycle on transfers, so bound the walk.
    for (let guard = 0; guard < 4 * (K + 1) + 4; guard++) {
      if (round < 0) return null;
      const label = pending ?? parent[round]![stop];
      pending = null;
      if (!label) return null;
      if (label.kind === "inherit") {
        round--;
        continue;
      }
      if (label.kind === "access") {
        legs.unshift({
          kind: "access",
          stop,
          seconds: label.seconds,
          meters: label.meters,
        });
        const first = legs.find((l) => l.kind === "ride");
        if (first?.kind !== "ride") return null;
        const boardAt =
          network.patterns[first.pattern]!.trips[first.trip]!.times[
            first.boardPosition
          ]!;
        return { departAt: boardAt - label.seconds, arriveAt, trips, legs };
      }
      let ride = label;
      if (label.kind === "transfer") {
        legs.unshift({
          kind: "transfer",
          from: label.from,
          to: stop,
          seconds: label.seconds,
          meters: label.meters,
        });
        stop = label.from;
        const before = rideLabel[round]![stop];
        if (!before) return null;
        ride = before;
      }
      legs.unshift({ ...(ride as Extract<Label, { kind: "ride" }>) });
      trips++;
      stop =
        network.patterns[(ride as Extract<Label, { kind: "ride" }>).pattern]!
          .stops[(ride as Extract<Label, { kind: "ride" }>).boardPosition]!;
      round--;
    }
    return null;
  };

  for (const departure of departureCandidates(network, q)) {
    let marked = new Set<number>();
    for (const a of q.access) {
      const t = departure + a.seconds;
      if (t < tau[0]![a.stop]!) {
        tau[0]![a.stop] = t;
        parent[0]![a.stop] = {
          kind: "access",
          seconds: a.seconds,
          meters: a.meters,
        };
        marked.add(a.stop);
      }
    }

    for (let k = 1; k <= K && marked.size > 0; k++) {
      const prev = tau[k - 1]!;
      const cur = tau[k]!;
      const par = parent[k]!;
      const rides = rideLabel[k]!;
      const byBus = rideTau[k]!;
      for (let s = 0; s < n; s++) {
        if (prev[s]! < cur[s]!) {
          cur[s] = prev[s]!;
          par[s] = INHERIT;
        }
      }

      // Each pattern once, from the earliest position a marked stop has on it.
      const queue = new Map<number, number>();
      for (const s of marked) {
        for (const { pattern, position } of network.patternsAtStop[s] ?? []) {
          const held = queue.get(pattern);
          if (held === undefined || position < held)
            queue.set(pattern, position);
        }
      }
      marked = new Set();
      /** Stops whose bus arrival this round improved: where walks start from. */
      const alighted = new Set<number>();
      const limit = bound(k);

      for (const [p, start] of queue) {
        const pattern = network.patterns[p]!;
        let trip = -1;
        let boardPosition = -1;
        for (let pos = start; pos < pattern.stops.length; pos++) {
          const s = pattern.stops[pos]!;
          if (trip >= 0) {
            const arrival = pattern.trips[trip]!.times[pos]!;
            // Pruned against the best *bus* arrival only: a bus arriving after
            // someone could have walked here is still where a walk onwards (to
            // the destination, or to another stop) can start.
            if (arrival < byBus[s]! && arrival < limit) {
              const label = {
                kind: "ride" as const,
                pattern: p,
                trip,
                boardPosition,
                alightPosition: pos,
              };
              rides[s] = label;
              byBus[s] = arrival;
              alighted.add(s);
              if (arrival < cur[s]!) {
                cur[s] = arrival;
                par[s] = label;
                marked.add(s);
              }
            }
          }
          const ready = prev[s]! + (k > 1 ? slack : 0);
          if (
            ready < Infinity &&
            (trip < 0 || ready <= pattern.trips[trip]!.times[pos]!)
          ) {
            const earlier = earliestTrip(pattern, pos, ready);
            if (earlier >= 0 && (trip < 0 || earlier < trip)) {
              trip = earlier;
              boardPosition = pos;
            }
          }
        }
      }

      for (const s of alighted) {
        for (const f of network.footpaths[s] ?? []) {
          const t = byBus[s]! + f.seconds;
          if (t < cur[f.to]! && t < limit) {
            cur[f.to] = t;
            par[f.to] = {
              kind: "transfer",
              from: s,
              seconds: f.seconds,
              meters: f.meters,
            };
            marked.add(f.to);
          }
        }
      }

      let arrival = Infinity;
      let via: StopWalk | null = null;
      for (const e of q.egress) {
        const t = byBus[e.stop]! + e.seconds;
        if (t < arrival) {
          arrival = t;
          via = e;
        }
      }
      // A k-bus arrival is only a new option if it also beats every known
      // journey with fewer buses; otherwise it is the round below's journey
      // inherited, or dominated by one leaving no earlier.
      const fewer = bound(k - 1);
      if (via && arrival < target[k]!) {
        target[k] = arrival;
        if (arrival < fewer) {
          const journey = extract(k, via, arrival);
          if (journey) journeys.push(journey);
        }
      }
    }
  }

  return journeys;
}
