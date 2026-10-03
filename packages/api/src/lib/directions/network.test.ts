import { paradasFixtures } from "@moventis/shared/fixtures";
import { describe, expect, it } from "vitest";
import {
  buildNetwork,
  fillUnpaired,
  TRANSFER_RADIUS_M,
  walkSeconds,
  type Network,
} from "./network";
import {
  hm,
  stopsFromParadas,
  streetStops,
  syntheticNetwork,
  uniqueStops,
} from "./testing";

const allTrips = (net: Network) =>
  net.patterns.flatMap((p) => p.trips.map((t) => ({ pattern: p, trip: t })));

const stopsOf = (net: Network, stops: number[]) =>
  stops.map((i) => net.stops[i]!.externalId);

describe("fillUnpaired", () => {
  it("places a trip's time at an unpaired stop when exactly one fits between its neighbours", () => {
    const filled = fillUnpaired({
      stops: ["a", "b", "c"],
      trips: [
        { id: 1, times: [480, null, 484] },
        { id: 2, times: [490, null, 494] },
        // Listed at b by id but never calls there: nothing fits its window.
        { id: 3, times: [500, null, 501] },
      ],
      unpaired: [{ position: 1, times: [482, 492] }],
    });
    expect(filled).toEqual([
      [480, 482, 484],
      [490, 492, 494],
      [500, null, 501],
    ]);
  });

  it("leaves the slot empty when two of the stop's times fit", () => {
    expect(
      fillUnpaired({
        stops: ["a", "b", "c"],
        trips: [{ id: 1, times: [480, null, 490] }],
        unpaired: [{ position: 1, times: [482, 485] }],
      }),
    ).toEqual([[480, null, 490]]);
  });
});

describe("buildNetwork on recorded timetables", () => {
  it("stitches line 2's trip 125 onto 181, where the same bus carries on round the loop", () => {
    const f = paradasFixtures.line2Loop;
    const net = buildNetwork({
      stops: uniqueStops(stopsFromParadas(f.raw)),
      lines: [
        {
          routeId: "r2",
          code: "2",
          color: "#f00",
          name: "2",
          runsOnServiceDate: true,
        },
      ],
      variants: [
        {
          id: "v2",
          routeId: "r2",
          description: "ronda hospitals",
          trayectoIds: [4],
          geometry: null,
        },
      ],
      timetables: [
        { routeId: "r2", trayectoId: 4, dayOffset: 0, timetable: f.parsed },
      ],
    });

    const stitched = allTrips(net).find(({ trip }) =>
      trip.key.endsWith(":4.125+4.181"),
    );
    expect(stitched).toBeDefined();
    const { pattern, trip } = stitched!;
    expect(pattern.stops).toHaveLength(28);
    expect(trip.times[0]).toBe(hm(6, 53));
    expect(trip.times[22]).toBe(hm(7, 34));
    expect(trip.times[23]).toBe(hm(7, 36));
    expect(trip.headsign).toBe("ronda hospitals");

    // No ride anywhere goes backwards in time.
    for (const { trip: t } of allTrips(net))
      for (let i = 1; i < t.times.length; i++)
        expect(t.times[i]!).toBeGreaterThanOrEqual(t.times[i - 1]!);
  });

  it("joins line 6's two segments into rides through the shared stop", () => {
    const s1 = paradasFixtures.line6Segment1;
    const s2 = paradasFixtures.line6Segment2;
    const net = buildNetwork({
      stops: uniqueStops([
        ...stopsFromParadas(s1.raw),
        ...stopsFromParadas(s2.raw),
      ]),
      lines: [
        {
          routeId: "r6",
          code: "6",
          color: "#0f0",
          name: "6",
          runsOnServiceDate: true,
        },
      ],
      variants: [
        {
          id: "v6",
          routeId: "r6",
          description: "pla d'urgell - agrònoms",
          trayectoIds: [2, 3],
          geometry: null,
        },
      ],
      timetables: [
        // Out of order on purpose: the variant's trayectoIds decide.
        { routeId: "r6", trayectoId: 3, dayOffset: 0, timetable: s2.parsed },
        { routeId: "r6", trayectoId: 2, dayOffset: 0, timetable: s1.parsed },
      ],
    });

    // Every segment-1 trip that reaches the shared stop carries on into
    // segment 2 (40 of them); segment 2's own short-turns end early.
    const reachingShared = s1.parsed.trips.filter(
      (t) => t.times.at(-1) !== null,
    ).length;
    const through = allTrips(net).filter(
      ({ trip }) => trip.key.includes(":2.") && trip.key.includes("+3."),
    );
    expect(reachingShared).toBe(40);
    expect(through).toHaveLength(reachingShared);
    for (const { pattern } of through) {
      const ids = stopsOf(net, pattern.stops);
      // The shared stop appears once, not twice in a row.
      for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    }
  });

  it("makes an unpaired stop boardable when the minute is unambiguous", () => {
    const f = paradasFixtures.line6Segment2;
    const net = buildNetwork({
      stops: uniqueStops(stopsFromParadas(f.raw)),
      lines: [
        {
          routeId: "r6",
          code: "6",
          color: "#0f0",
          name: "6",
          runsOnServiceDate: true,
        },
      ],
      variants: [],
      timetables: [
        { routeId: "r6", trayectoId: 3, dayOffset: 0, timetable: f.parsed },
      ],
    });
    const atPalauet = net.patternsAtStop[net.stopIndex.get("10189")!]!;
    expect(atPalauet.length).toBeGreaterThan(0);
  });

  it("brings Saturday's n1 into Sunday's network after midnight only", () => {
    const f = paradasFixtures.n1Saturday;
    const net = buildNetwork({
      stops: uniqueStops(stopsFromParadas(f.raw)),
      lines: [
        {
          routeId: "rn1",
          code: "n1",
          color: "#00f",
          name: "n1",
          runsOnServiceDate: false,
        },
      ],
      variants: [],
      timetables: [
        { routeId: "rn1", trayectoId: 1, dayOffset: -1, timetable: f.parsed },
      ],
    });
    const trips = allTrips(net).map(({ trip }) => trip);
    expect(trips.length).toBeGreaterThan(0);
    // Every kept ride is still running after Sunday's midnight...
    for (const t of trips) expect(t.times.at(-1)!).toBeGreaterThanOrEqual(0);
    // ...and the last one ends at 05:15 Sunday.
    expect(Math.max(...trips.map((t) => t.times.at(-1)!))).toBe(hm(5, 15));
    expect(net.missingLines).toEqual([]);
  });
});

describe("buildNetwork on synthetic lines", () => {
  it("splits a pattern whose trips would overtake each other", () => {
    const net = syntheticNetwork(streetStops(["a", "b"]), [
      {
        code: "1",
        stops: ["a", "b"],
        trips: [
          [480, 500], // slow
          [485, 490], // leaves later, arrives earlier
        ],
      },
    ]);
    expect(net.patterns).toHaveLength(2);
  });

  it("reports a line that runs today but has no timetable", () => {
    const net = syntheticNetwork(streetStops(["a", "b"]), [], {
      lines: [
        {
          routeId: "r9",
          code: "9",
          color: "#000",
          name: "9",
          runsOnServiceDate: true,
        },
        {
          routeId: "r10",
          code: "10",
          color: "#000",
          name: "10",
          runsOnServiceDate: false,
        },
      ],
    });
    expect(net.missingLines).toEqual(["9"]);
  });

  it("joins stops within the transfer radius, both ways, and no others", () => {
    const net = syntheticNetwork(streetStops(["a", "b", "c"], 300), []);
    const [a, b, c] = ["a", "b", "c"].map((id) => net.stopIndex.get(id)!);
    expect(net.footpaths[a!]!.map((f) => f.to)).toEqual([b]);
    expect(net.footpaths[b!]!.map((f) => f.to).sort()).toEqual([a, c].sort());
    expect(net.footpaths[a!]![0]!.seconds).toBe(walkSeconds(300));
    expect(600).toBeGreaterThan(TRANSFER_RADIUS_M);
  });
});
