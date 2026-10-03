import { describe, expect, it } from "vitest";
import { toItinerary, walkOnlyLeg } from "./itinerary";
import { alignLive, liveIndexFor } from "./live-match";
import { rideGeometry } from "./leg-geometry";
import {
  ACCESS_RADIUS_M,
  nearbyStops,
  planJourneys,
  rankJourneys,
  WALK_ONLY_MAX_M,
} from "./plan";
import type { RaptorJourney } from "./raptor";
import { hm, streetStops, syntheticNetwork } from "./testing";
import type { LngLat } from "@moventis/shared";

const m = (h: number, min: number) => h * 60 + min;

describe("nearbyStops", () => {
  it("takes every served stop within the radius, nearest first", () => {
    const stops = streetStops(["a", "b", "c", "d", "e"], 300);
    const net = syntheticNetwork(stops, [
      { code: "1", stops: ["a", "b", "c", "d"], trips: [[480, 481, 482, 483]] },
    ]);
    const near = nearbyStops(net, stops[0]!);
    // e is within 1.2 km but serves no line; d is 900 m away.
    expect(near.map((w) => net.stops[w.stop]!.externalId)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(near[0]!.seconds).toBe(0);
    expect(900).toBeGreaterThan(ACCESS_RADIUS_M);
  });

  it("reaches further for the nearest three when fewer are close", () => {
    const stops = streetStops(["a", "b", "c", "d"], 500);
    const net = syntheticNetwork(stops, [
      { code: "1", stops: ["a", "b", "c", "d"], trips: [[480, 482, 484, 486]] },
    ]);
    expect(
      nearbyStops(net, stops[0]!).map((w) => net.stops[w.stop]!.externalId),
    ).toEqual(["a", "b", "c"]);
  });
});

describe("rankJourneys", () => {
  const net = syntheticNetwork(streetStops(["a", "b"]), [
    { code: "1", stops: ["a", "b"], trips: [[480, 490]] },
  ]);
  const j = (
    departAt: number,
    arriveAt: number,
    trips: number,
    walk = 0,
  ): RaptorJourney => ({
    departAt,
    arriveAt,
    trips,
    legs: [
      { kind: "access", stop: 0, seconds: 0, meters: walk },
      {
        kind: "ride",
        pattern: 0,
        trip: 0,
        boardPosition: 0,
        alightPosition: 1,
      },
      { kind: "egress", stop: departAt, seconds: 0, meters: 0 },
    ],
  });

  it("drops what another option beats outright and orders by arrival", () => {
    const ranked = rankJourneys(net, [
      j(100, 300, 1),
      j(110, 300, 1), // leaves later, same arrival: beats the first
      j(100, 250, 2), // faster with a change: kept
      j(200, 400, 1), // the next bus: kept
    ]);
    expect(ranked.map((r) => [r.departAt, r.arriveAt, r.trips])).toEqual([
      [100, 250, 2],
      [110, 300, 1],
      [200, 400, 1],
    ]);
  });

  it("drops a change that only buys a few minutes at the stop", () => {
    const ranked = rankJourneys(net, [
      j(100, 1000, 1), // direct
      j(160, 1000, 2), // a minute later with a change, same arrival
      j(500, 1000, 2), // much later: still worth offering
      j(110, 900, 2), // a change that arrives earlier: always worth offering
    ]);
    expect(ranked.map((r) => [r.departAt, r.arriveAt, r.trips])).toEqual([
      [110, 900, 2],
      [100, 1000, 1],
      [500, 1000, 2],
    ]);
  });

  it("prefers less walking between otherwise equal options", () => {
    const ranked = rankJourneys(net, [j(100, 300, 1, 400), j(101, 300, 1, 50)]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.departAt).toBe(101);
  });
});

describe("planJourneys", () => {
  it("offers walking the whole way only when it is short", () => {
    const stops = streetStops(["a", "b", "c"], 1000);
    const net = syntheticNetwork(stops, [
      {
        code: "1",
        stops: ["a", "b", "c"],
        trips: [[m(8, 0), m(8, 3), m(8, 6)]],
      },
    ]);
    const near = planJourneys(net, {
      from: stops[0]!,
      to: stops[1]!,
      departAt: hm(7, 50),
    });
    expect(near.walkOnlyMeters).toBeCloseTo(1000, -1);
    const far = planJourneys(net, {
      from: stops[0]!,
      to: stops[2]!,
      departAt: hm(7, 50),
    });
    expect(far.walkOnlyMeters).toBeNull();
    expect(2000).toBeGreaterThan(WALK_ONLY_MAX_M);
    expect(far.journeys[0]).toMatchObject({
      departAt: hm(8, 0),
      arriveAt: hm(8, 6),
    });
  });

  it("looks three hours ahead when the next hour has nothing", () => {
    const stops = streetStops(["a", "b"], 2000);
    const net = syntheticNetwork(stops, [
      { code: "1", stops: ["a", "b"], trips: [[m(10, 0), m(10, 8)]] },
    ]);
    const plan = planJourneys(net, {
      from: stops[0]!,
      to: stops[1]!,
      departAt: hm(8, 0),
    });
    expect(plan.journeys.map((j) => j.departAt)).toEqual([hm(10, 0)]);
  });
});

describe("toItinerary", () => {
  it("lays out walk, bus, walk with Lleida times, skipping zero-length walks", () => {
    const stops = streetStops(["a", "b", "c"], 2000);
    const net = syntheticNetwork(stops, [
      {
        code: "1",
        stops: ["a", "b", "c"],
        trips: [[m(8, 0), m(8, 5), m(8, 9)]],
      },
    ]);
    const from = { lat: stops[0]!.lat + 0.001, lng: stops[0]!.lng };
    const plan = planJourneys(net, {
      from,
      to: stops[2]!,
      departAt: hm(7, 40),
    });
    const it0 = toItinerary(net, plan.journeys[0]!, {
      serviceDate: "2026-10-05",
      from,
      to: stops[2]!,
    });
    expect(it0.legs.map((l) => l.kind)).toEqual(["walk", "bus"]);
    const [walk, bus] = it0.legs;
    // 08:00 CEST is 06:00Z.
    expect(bus).toMatchObject({
      kind: "bus",
      lineCode: "1",
      headsign: "cap a c",
      departAt: new Date("2026-10-05T06:00:00Z"),
      arriveAt: new Date("2026-10-05T06:09:00Z"),
    });
    expect(bus!.kind === "bus" && bus!.stops.map((s) => s.externalId)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(walk!.kind === "walk" && walk!.endAt).toEqual(
      new Date("2026-10-05T06:00:00Z"),
    );
    expect(it0.departAt).toEqual(walk!.kind === "walk" && walk!.startAt);
    expect(it0.transfers).toBe(0);
    // The same journey gets the same id.
    expect(
      toItinerary(net, plan.journeys[0]!, {
        serviceDate: "2026-10-05",
        from,
        to: stops[2]!,
      }).id,
    ).toBe(it0.id);
  });

  it("walks the whole way at walking pace", () => {
    const leg = walkOnlyLeg(600, hm(8, 0), {
      serviceDate: "2026-10-05",
      from: { lat: 41.6, lng: 0.6 },
      to: { lat: 41.6, lng: 0.607 },
    });
    expect(leg.meters).toBe(780);
    expect(leg.endAt.getTime() - leg.startAt.getTime()).toBe(650_000);
  });
});

describe("rideGeometry", () => {
  // A street driven east, then back west on the same line a few metres north.
  const lat = 41.6;
  const east = (mEast: number, mNorth = 0): LngLat => [
    0.6 + mEast / (111_320 * Math.cos((lat * Math.PI) / 180)),
    lat + mNorth / 110_540,
  ];
  const outAndBack: LngLat[] = [east(0), east(1000), east(1000, 8), east(0, 8)];

  it("follows the line between the stops and stops at the alighting one", () => {
    const path = rideGeometry(outAndBack, [east(100), east(600)]);
    expect(path[0]![0]).toBeCloseTo(east(100)[0], 6);
    expect(path.at(-1)![0]).toBeCloseTo(east(600)[0], 6);
    // Never wanders onto the return pass.
    for (const p of path) expect(p[1]).toBeCloseTo(lat, 6);
  });

  it("joins the stops when there is no geometry", () => {
    const stops = [east(0), east(500)];
    expect(rideGeometry(null, stops)).toEqual(stops);
  });
});

describe("alignLive", () => {
  it("gives a live time to the departure it is nearest, not the first that fits", () => {
    // 10:00 has gone; 10:16 is the 10:15 bus a minute late.
    expect(alignLive([600, 615, 630], [616, 631])).toEqual([1, 2]);
    expect(liveIndexFor(615, [600, 615, 630], [616, 631])).toBe(0);
  });

  it("keeps a late bus on its own departure", () => {
    expect(alignLive([600, 615], [609, 617])).toEqual([0, 1]);
  });

  it("never matches a prediction far earlier than the timetable", () => {
    expect(alignLive([600], [400])).toEqual([-1]);
    expect(liveIndexFor(600, [600], [400])).toBe(-1);
  });
});
