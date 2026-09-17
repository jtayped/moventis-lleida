import { describe, expect, it } from "vitest";
import { parseSchedulesResponse } from "./stop-schedule";
import { toGeometry, toProbeResult } from "./probe";
import { loadFixture } from "../__fixtures__/load";

const NOW = new Date(2026, 5, 19, 5, 0, 0);

describe("toProbeResult", () => {
  it("keeps only real-time arrivals and drops scheduled ones", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), NOW);
    // Line 130 has one real-time bus (~11 s) plus several scheduled times.
    const probe = toProbeResult(schedules, "130", NOW.getTime());
    expect([...probe.keys()]).toEqual(["ronda hospitals"]);
    expect(probe.get("ronda hospitals")).toEqual([11]);
  });

  it("lists a journey with only scheduled arrivals as present but empty", () => {
    // The locator needs "this stop lists no bus" (empty) to differ from "this
    // stop does not list the journey" (absent key), which it treats as unavailable.
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), NOW);
    const probe = toProbeResult(schedules, "137", NOW.getTime());
    expect([...probe.keys()].sort()).toEqual(["poligons - ronda", "poligons - ronda inici"]);
    expect(probe.get("poligons - ronda")).toEqual([]);
  });

  it("returns an empty map when the route id is absent from the response", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), NOW);
    expect(toProbeResult(schedules, "999", NOW.getTime()).size).toBe(0);
  });

  it("drops arrivals that have moved into the past relative to `now`", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-realtime.json"), NOW);
    // Buses at +330 s and +720 s; advance now past the first one.
    const later = NOW.getTime() + 400_000;
    const etas = toProbeResult(schedules, "137", later).get("poligons - ronda");
    expect(etas).toEqual([320]); // 720 - 400; the 330 s bus is gone
  });

  it("keeps a bus that has just arrived, as a slightly negative ETA", () => {
    // A "0 min 00 s" entry fetched a few seconds after the reference instant is
    // the bus standing at the stop, and the locator brackets it there.
    const schedules = parseSchedulesResponse(loadFixture("schedule-realtime.json"), NOW);
    const etas = toProbeResult(schedules, "137", NOW.getTime() + 340_000).get("poligons - ronda");
    expect(etas).toEqual([-10, 380]);
  });

  it("expresses ETAs against the reference instant, not the fetch time", () => {
    // Fetched 5 s after the reference: the same absolute arrivals read 5 s later.
    const fetchedAt = new Date(NOW.getTime() + 5_000);
    const schedules = parseSchedulesResponse(loadFixture("schedule-realtime.json"), fetchedAt);
    const etas = toProbeResult(schedules, "137", NOW.getTime()).get("poligons - ronda");
    expect(etas).toEqual([335, 725]);
  });

  it("sorts ETAs ascending", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-realtime.json"), NOW);
    const etas = toProbeResult(schedules, "137", NOW.getTime()).get("poligons - ronda")!;
    expect(etas).toEqual([...etas].sort((a, b) => a - b));
    expect(etas).toEqual([330, 720]);
  });
});

describe("toGeometry", () => {
  it("flattens valid `{ paths }` into one polyline", () => {
    expect(
      toGeometry({
        paths: [
          [
            [0, 0],
            [1, 1],
          ],
          [[2, 2]],
        ],
      }),
    ).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it("returns null for empty, too-short, or invalid geometry", () => {
    expect(toGeometry({ paths: [] })).toBeNull();
    expect(toGeometry({ paths: [[[0, 0]]] })).toBeNull(); // <2 points total
    expect(toGeometry({ notPaths: 1 })).toBeNull();
    expect(toGeometry(null)).toBeNull();
    expect(toGeometry("nonsense")).toBeNull();
  });
});
