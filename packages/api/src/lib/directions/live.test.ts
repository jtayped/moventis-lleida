import { describe, expect, it } from "vitest";
import {
  boardsNeeded,
  journeyKey,
  journeyShapes,
  LiveTimes,
  retimeJourneys,
  type LiveEntry,
  type LiveListing,
} from "./live";
import type { Network } from "./network";
import { searchJourneys } from "./plan";
import { hm, streetStops, syntheticNetwork } from "./testing";

/**
 * Line a runs a → b → c, line b runs c → d, five minutes a hop; 2 km apart, so
 * the only stop within reach of each end is the one there and no footpath
 * joins any two.
 */
const stops = streetStops(["a", "b", "c", "d"], 2000);
const net = syntheticNetwork(stops, [
  {
    code: "a",
    stops: ["a", "b", "c"],
    trips: [
      [600, 605, 610],
      [615, 620, 625],
      [630, 635, 640],
    ],
  },
  {
    code: "b",
    stops: ["c", "d"],
    trips: [
      [612, 620],
      [622, 630],
      [632, 640],
    ],
  },
]);
const point = (id: string) => {
  const s = stops.find((x) => x.externalId === id)!;
  return { lat: s.lat, lng: s.lng };
};
const idx = (id: string) => net.stopIndex.get(id)!;
const live = (minutes: number[], isRealTime = true): LiveEntry[] =>
  minutes.map((m) => ({ sec: m * 60, isRealTime }));

/** Listings per stop id, per line code, each line on its one journey. */
function listings(
  byStop: Record<string, Record<string, LiveEntry[]>>,
): Map<number, LiveListing> {
  return new Map(
    Object.entries(byStop).map(([stop, lines]) => [
      idx(stop),
      new Map(
        Object.entries(lines).map(([code, entries]) => {
          const headsign = code === "a" ? "cap a c" : "cap a d";
          return [`r${code}|${journeyKey(headsign)}`, entries];
        }),
      ),
    ]),
  );
}

/** Plan a → d leaving 10:00 (minute 600), timed by `byStop`, best first. */
function plan(
  network: Network,
  byStop: Parameters<typeof listings>[0],
  from = "a",
  to = "d",
) {
  const input = { from: point(from), to: point(to), departAt: hm(10, 0) };
  const shapes = journeyShapes(network, searchJourneys(network, input, 3600));
  return retimeJourneys(
    network,
    shapes,
    new LiveTimes(network, listings(byStop), hm(10, 0)),
    {
      earliestDeparture: input.departAt,
      latestDeparture: input.departAt + 3600,
    },
  ).sort((x, y) => x.arriveAt - y.arriveAt);
}

const minutes = (sec: number) => sec / 60;

describe("retimeJourneys", () => {
  it("keeps the timetable's times, marked as such, when nothing is listed", () => {
    const [first] = plan(net, {});
    expect(first).toMatchObject({ departAt: hm(10, 0), arriveAt: hm(10, 20) });
    expect(first!.rides.map((r) => r.board.live)).toEqual([false, false]);
  });

  it("takes the next connection when a late bus misses the planned one", () => {
    // The 10:00 runs 6 min late, reaching c at 10:16: the 10:12 is gone by
    // then, and with a minute to change the 10:22 is the one to catch.
    const [first] = plan(net, {
      a: { a: live([606, 615, 630]) },
      c: { b: live([612, 622, 632]) },
    });
    expect(minutes(first!.departAt)).toBe(606);
    expect(first!.rides.map((r) => minutes(r.board.sec))).toEqual([606, 622]);
    expect(minutes(first!.arriveAt)).toBe(630);
    expect(first!.rides.every((r) => r.board.live)).toBe(true);
  });

  it("never offers a bus the boarding stop has stopped listing", () => {
    // a lists the 10:15 and 10:30 but not the 10:00: it is not coming.
    const journeys = plan(net, { a: { a: live([615, 630]) } });
    expect(journeys.map((j) => minutes(j.departAt))).not.toContain(600);
    expect(minutes(journeys[0]!.departAt)).toBe(615);
  });

  it("reads a bus past the end of the listing from the timetable", () => {
    // Only the 10:00 is listed; the 10:30 is beyond the list, not gone.
    const journeys = plan(net, { a: { a: live([601]) } }, "a", "c");
    const at1030 = journeys.find((j) => j.departAt === hm(10, 30));
    expect(at1030?.rides[0]!.board).toEqual({ sec: hm(10, 30), live: false });
  });

  it("takes the alighting stop's own time when it fits the ride", () => {
    const [first] = plan(
      net,
      { a: { a: live([600]) }, c: { a: live([613]) } },
      "a",
      "c",
    );
    // Ten minutes by the timetable, thirteen by the listing at c.
    expect(first!.rides[0]!.alight).toEqual({ sec: hm(10, 13), live: true });
  });

  it("carries the boarding delay forward when the alighting time does not fit", () => {
    // 10:40 at c would be a 40 min ride for a 10 min hop: another bus.
    const [first] = plan(
      net,
      { a: { a: live([602]) }, c: { a: live([640]) } },
      "a",
      "c",
    );
    expect(first!.rides[0]!.alight).toEqual({ sec: hm(10, 12), live: true });
  });

  it("marks a printed time on the listing as not live", () => {
    const [first] = plan(net, { a: { a: live([600], false) } }, "a", "c");
    expect(first!.rides[0]!.board).toEqual({ sec: hm(10, 0), live: false });
  });
});

describe("boardsNeeded", () => {
  it("asks for every boarding stop before any alighting stop, once each", () => {
    const input = { from: point("a"), to: point("d"), departAt: hm(10, 0) };
    const shapes = journeyShapes(net, searchJourneys(net, input, 3600));
    expect(shapes).toHaveLength(1);
    expect(
      boardsNeeded(net, shapes).map((b) => net.stops[b.stop]!.externalId),
    ).toEqual(["a", "c", "d"]);
  });
});
