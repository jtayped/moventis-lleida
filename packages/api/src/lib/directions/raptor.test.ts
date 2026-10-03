import { describe, expect, it } from "vitest";
import type { NetworkStop } from "./network";
import type { Network } from "./network";
import {
  rangeRaptor,
  TRANSFER_SLACK_S,
  type RaptorJourney,
  type RaptorQuery,
  type StopWalk,
} from "./raptor";
import {
  hm,
  streetStops,
  syntheticNetwork,
  type SyntheticLine,
} from "./testing";

const at = (net: ReturnType<typeof syntheticNetwork>, id: string) =>
  net.stopIndex.get(id)!;

const walk = (stop: number, seconds = 0): StopWalk => ({
  stop,
  seconds,
  meters: Math.round(seconds * 1.2),
});

const summary = (j: RaptorJourney) => ({
  departAt: j.departAt,
  arriveAt: j.arriveAt,
  trips: j.trips,
});

/** Keep journeys no other one beats on departure, arrival and trips at once. */
function pareto(journeys: ReturnType<typeof summary>[]) {
  const unique = [
    ...new Map(
      journeys.map((j) => [`${j.departAt}|${j.arriveAt}|${j.trips}`, j]),
    ).values(),
  ];
  return unique
    .filter(
      (j) =>
        !unique.some(
          (o) =>
            o !== j &&
            o.departAt >= j.departAt &&
            o.arriveAt <= j.arriveAt &&
            o.trips <= j.trips,
        ),
    )
    .sort((a, b) => a.departAt - b.departAt || a.trips - b.trips);
}

const m = (h: number, min: number) => h * 60 + min;

describe("rangeRaptor", () => {
  it("lists each departure in the window as its own option", () => {
    const net = syntheticNetwork(streetStops(["a", "b", "c"]), [
      {
        code: "1",
        stops: ["a", "b", "c"],
        trips: [
          [m(8, 0), m(8, 5), m(8, 10)],
          [m(8, 15), m(8, 20), m(8, 25)],
          [m(9, 30), m(9, 35), m(9, 40)], // outside the window
        ],
      },
    ]);
    const journeys = rangeRaptor(net, {
      access: [walk(at(net, "a"))],
      egress: [walk(at(net, "c"))],
      earliestDeparture: hm(7, 55),
      latestDeparture: hm(8, 55),
    });
    expect(pareto(journeys.map(summary))).toEqual([
      { departAt: hm(8, 0), arriveAt: hm(8, 10), trips: 1 },
      { departAt: hm(8, 15), arriveAt: hm(8, 25), trips: 1 },
    ]);
    const ride = journeys[0]!.legs.find((l) => l.kind === "ride");
    expect(ride).toMatchObject({ boardPosition: 0, alightPosition: 2 });
  });

  it("returns both the slow direct bus and the faster change, and respects the change margin", () => {
    const lines: SyntheticLine[] = [
      { code: "1", stops: ["a", "b"], trips: [[m(8, 0), m(8, 5)]] },
      {
        code: "2",
        stops: ["b", "c"],
        // 08:05 leaves as line 1 arrives: not catchable with a 60 s margin.
        trips: [
          [m(8, 5), m(8, 9)],
          [m(8, 8), m(8, 12)],
        ],
      },
      { code: "3", stops: ["a", "c"], trips: [[m(8, 0), m(8, 18)]] },
    ];
    const net = syntheticNetwork(streetStops(["a", "b", "c"]), lines);
    const journeys = rangeRaptor(net, {
      access: [walk(at(net, "a"))],
      egress: [walk(at(net, "c"))],
      earliestDeparture: hm(8, 0),
      latestDeparture: hm(8, 0),
    });
    expect(pareto(journeys.map(summary))).toEqual([
      { departAt: hm(8, 0), arriveAt: hm(8, 18), trips: 1 },
      { departAt: hm(8, 0), arriveAt: hm(8, 12), trips: 2 },
    ]);
  });

  it("changes buses on foot between two nearby stops", () => {
    // b and b2 300 m apart; everything else 1 km.
    const base = streetStops(["a", "b", "x", "c"]);
    const b = base[1]!;
    const b2: NetworkStop = {
      ...b,
      externalId: "b2",
      lng: b.lng + 300 / (111_320 * Math.cos((b.lat * Math.PI) / 180)),
    };
    const net = syntheticNetwork(
      [base[0]!, b, b2, base[3]!],
      [
        { code: "1", stops: ["a", "b"], trips: [[m(8, 0), m(8, 10)]] },
        {
          code: "2",
          stops: ["b2", "c"],
          trips: [
            [m(8, 13), m(8, 20)], // too soon: the walk is ~5.5 min plus margin
            [m(8, 25), m(8, 32)],
          ],
        },
      ],
    );
    const [journey] = rangeRaptor(net, {
      access: [walk(at(net, "a"))],
      egress: [walk(at(net, "c"))],
      earliestDeparture: hm(8, 0),
      latestDeparture: hm(8, 0),
    });
    expect(journey).toBeDefined();
    expect(journey!.arriveAt).toBe(hm(8, 32));
    expect(journey!.legs.map((l) => l.kind)).toEqual([
      "access",
      "ride",
      "transfer",
      "ride",
      "egress",
    ]);
  });

  it("never offers walking to a stop and on to the destination as a journey", () => {
    const net = syntheticNetwork(streetStops(["a", "b"]), [
      { code: "1", stops: ["a", "b"], trips: [[m(8, 0), m(8, 15)]] },
    ]);
    const a = at(net, "a");
    const journeys = rangeRaptor(net, {
      // The destination is a short walk from `a` itself.
      access: [walk(a, 60)],
      egress: [walk(a, 60), walk(at(net, "b"), 0)],
      earliestDeparture: hm(7, 50),
      latestDeparture: hm(8, 50),
    });
    expect(journeys.map(summary)).toEqual([
      { departAt: hm(7, 59), arriveAt: hm(8, 15), trips: 1 },
    ]);
  });
});

// ─── Range = one RAPTOR per departure ──────────────────────────────────────

/**
 * Replay a journey leg by leg and say what a rider could not do: board a bus
 * already gone (or without the change margin), walk twice in a row, or end at
 * a time that does not add up. Plain checks rather than `expect`s, because this
 * runs on thousands of journeys and per-call assertion overhead is what made
 * the property test slow.
 */
function unrideable(
  net: Network,
  q: RaptorQuery,
  j: RaptorJourney,
): string | null {
  const [first, ...rest] = j.legs;
  if (first?.kind !== "access") return "does not start on foot";
  if (
    !q.access.some(
      (a) =>
        a.stop === first.stop &&
        a.seconds === first.seconds &&
        a.meters === first.meters,
    )
  )
    return "starts with a walk the query did not offer";
  if (j.departAt < q.earliestDeparture) return "leaves before the window";
  let stop = first.stop;
  let t = j.departAt + first.seconds;
  let rides = 0;
  let previous = "access";
  for (const leg of rest) {
    if (leg.kind === "ride") {
      const pattern = net.patterns[leg.pattern]!;
      const trip = pattern.trips[leg.trip]!;
      if (pattern.stops[leg.boardPosition] !== stop)
        return "boards away from where it stands";
      if (leg.alightPosition <= leg.boardPosition) return "rides backwards";
      const margin = rides > 0 ? TRANSFER_SLACK_S : 0;
      if (trip.times[leg.boardPosition]! < t + margin)
        return `boards a bus already gone (${trip.times[leg.boardPosition]} < ${t + margin})`;
      t = trip.times[leg.alightPosition]!;
      stop = pattern.stops[leg.alightPosition]!;
      rides++;
    } else if (leg.kind === "transfer") {
      if (previous !== "ride") return "walks twice in a row";
      if (leg.from !== stop) return "walks from the wrong stop";
      if (
        !net.footpaths[stop]!.some(
          (f) =>
            f.to === leg.to &&
            f.seconds === leg.seconds &&
            f.meters === leg.meters,
        )
      )
        return "walks a footpath that does not exist";
      t += leg.seconds;
      stop = leg.to;
    } else if (leg.kind === "egress") {
      if (previous !== "ride") return "walks to the destination from a walk";
      if (leg.stop !== stop) return "walks to the destination from elsewhere";
      t += leg.seconds;
    }
    previous = leg.kind;
  }
  if (t !== j.arriveAt) return `arrives at ${t}, reports ${j.arriveAt}`;
  if (rides !== j.trips) return `rides ${rides}, reports ${j.trips}`;
  return null;
}

/** Small deterministic PRNG (mulberry32), so a failure reproduces. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomCity(seed: number) {
  const r = rng(seed);
  const ids = Array.from({ length: 9 }, (_, i) => `s${i}`);
  // Spacing 350 m puts neighbours within walking range and others not.
  const stops = streetStops(ids, 350);
  const lines: SyntheticLine[] = Array.from({ length: 5 }, (_, li) => {
    const len = 3 + Math.floor(r() * 4);
    const seq: string[] = [];
    while (seq.length < len) {
      const id = ids[Math.floor(r() * ids.length)]!;
      if (seq.at(-1) !== id) seq.push(id);
    }
    const first = 7 * 60 + Math.floor(r() * 20);
    const headway = 8 + Math.floor(r() * 15);
    const trips = Array.from({ length: 6 }, (_, ti) => {
      let t = first + ti * headway;
      return seq.map((_, si) => {
        if (si > 0) t += 1 + Math.floor(r() * 6);
        return t;
      });
    });
    return { code: String(li), stops: seq, trips };
  });
  const net = syntheticNetwork(stops, lines);
  const pick = () => {
    const n = 1 + Math.floor(r() * 2);
    return Array.from({ length: n }, () =>
      walk(Math.floor(r() * ids.length), Math.floor(r() * 300)),
    );
  };
  return { net, access: pick(), egress: pick() };
}

describe("rangeRaptor against independent single-departure runs", () => {
  it("finds the same Pareto set on 500 random cities, every journey rideable", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const { net, access, egress } = randomCity(seed);
      const window = {
        earliestDeparture: hm(7, 0),
        latestDeparture: hm(8, 30),
      };
      const query = { access, egress, ...window };
      const found = rangeRaptor(net, query);
      const problems = found
        .map((j) => unrideable(net, query, j))
        .filter((x) => x !== null);
      const ranged = pareto(found.map(summary));

      const departures = new Set<number>();
      for (const a of access)
        for (const { pattern, position } of net.patternsAtStop[a.stop]!)
          for (const trip of net.patterns[pattern]!.trips) {
            const d = trip.times[position]! - a.seconds;
            if (d >= window.earliestDeparture && d <= window.latestDeparture)
              departures.add(d);
          }
      const single = pareto(
        [...departures].flatMap((d) => {
          const q = {
            access,
            egress,
            earliestDeparture: d,
            latestDeparture: d,
          };
          const js = rangeRaptor(net, q);
          for (const j of js) {
            const problem = unrideable(net, q, j);
            if (problem) problems.push(problem);
          }
          return js.map(summary);
        }),
      );

      expect(problems, `seed ${seed}`).toEqual([]);
      expect(ranged, `seed ${seed}`).toEqual(single);
    }
  });
});
