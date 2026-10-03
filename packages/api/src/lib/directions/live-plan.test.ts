import { afterEach, describe, expect, it, vi } from "vitest";
import type { Schedules } from "@moventis/shared";
import type * as StopScheduleModule from "../stop-schedule";

vi.mock("../stop-schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof StopScheduleModule>();
  return { ...actual, getStopSchedule: vi.fn() };
});

import { getStopSchedule } from "../stop-schedule";
import { clearStopBoards } from "../stop-boards";
import { instantAtServiceSecond } from "../zoned-time";
import { planLive } from "./live-plan";
import type { TimedJourney } from "./live";
import { hm, streetStops, syntheticNetwork } from "./testing";

const mocked = vi.mocked(getStopSchedule);
const DAY = "2026-10-05";

const stops = streetStops(["a", "b", "c"], 2000);
const net = syntheticNetwork(stops, [
  {
    code: "a",
    stops: ["a", "b", "c"],
    trips: [
      [600, 605, 610],
      [630, 635, 640],
    ],
  },
]);
const point = (id: string) => {
  const s = stops.find((x) => x.externalId === id)!;
  return { lat: s.lat, lng: s.lng };
};

/** Line a's listing at a stop, at these minutes of the day. */
const listing = (minutes: number[]): Schedules => [
  {
    externalLineId: "xa",
    lineCode: "a",
    lineName: "línia a",
    selected: true,
    incidencias: null,
    journeys: [
      {
        name: "cap a c",
        scheduledTimes: minutes.map((m) => ({
          arrivalTime: instantAtServiceSecond(DAY, m * 60),
          isRealTime: true,
          accessible: null,
        })),
      },
    ],
  },
];

const input = (departAt: number, now = departAt) => ({
  from: point("a"),
  to: point("c"),
  departAt,
  serviceDate: DAY,
  now,
});

afterEach(() => {
  vi.clearAllMocks();
  clearStopBoards();
});

describe("planLive", () => {
  it("uses the boards that arrived in time and the timetable for the rest", async () => {
    // a answers; c never does.
    mocked.mockImplementation((stop) =>
      stop === "a"
        ? Promise.resolve(listing([603]))
        : new Promise(() => undefined),
    );
    const started = Date.now();
    const { journeys } = await planLive(net, input(hm(10, 0)), {
      deadlineMs: 50,
    });
    expect(Date.now() - started).toBeLessThan(1000);

    const first = journeys[0] as TimedJourney;
    expect(first.rides[0]).toEqual({
      board: { sec: hm(10, 3), live: true },
      // Not listed at c in time: the boarding delay, carried forward.
      alight: { sec: hm(10, 13), live: true },
    });
    expect(mocked).toHaveBeenCalledWith("a", "xa", "batch");
  });

  it("asks nothing for a plan beyond the live horizon", async () => {
    const { journeys } = await planLive(net, input(hm(10, 0), hm(8, 0)));
    expect(journeys.length).toBeGreaterThan(0);
    expect(journeys[0]).not.toHaveProperty("rides");
    expect(mocked).not.toHaveBeenCalled();
  });
});
