import { describe, expect, it } from "vitest";
import { parseSchedulesResponse } from "./stop-schedule";
import { toGeometry, toProbeResult } from "./probe";
import { loadFixture } from "../__fixtures__/load";

const NOW = new Date(2026, 5, 19, 5, 0, 0);

describe("toProbeResult", () => {
  it("keeps only real-time, future arrivals and drops scheduled ones", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), NOW);
    // Line 130 has one real-time bus (~11 s) plus several scheduled times.
    const probe = toProbeResult(schedules, "130", NOW.getTime());
    expect([...probe.keys()]).toEqual(["ronda hospitals"]);
    expect(probe.get("ronda hospitals")).toEqual([11]);
  });

  it("returns an empty map for a line with only scheduled arrivals", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), NOW);
    // Line 137 in the capture is all real:"N".
    expect(toProbeResult(schedules, "137", NOW.getTime()).size).toBe(0);
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
