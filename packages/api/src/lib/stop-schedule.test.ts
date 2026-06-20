import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { normalizeText, parseSchedulesResponse } from "./stop-schedule";
import { loadFixture } from "../__fixtures__/load";

// A fixed wall clock so relative→absolute arrival math is deterministic. Set
// before the morning scheduled times in the fixtures so they stay "today".
const NOW = new Date(2026, 5, 19, 5, 0, 0); // 2026-06-19 05:00 local

describe("parseSchedulesResponse", () => {
  it("parses the real multi-line capture into both lines", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), NOW);
    expect(schedules).toHaveLength(2);

    const line9 = schedules.find((s) => s.externalLineId === "137");
    expect(line9?.lineCode).toBe("9");
    expect(line9?.lineName).toBe("poligons");
    expect(line9?.journeys).toHaveLength(2);
  });

  it("turns a real-time arrival into now + offset, and a scheduled one into a clock time", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), NOW);
    const line2 = schedules.find((s) => s.externalLineId === "130");
    const journey = line2?.journeys.find((j) => j.name === "ronda hospitals");
    expect(journey).toBeDefined();

    const realtime = journey!.scheduledTimes.filter((t) => t.isRealTime);
    expect(realtime).toHaveLength(1);
    // "00 min 11 s" → now + 11s.
    expect(realtime[0]!.arrivalTime.getTime() - NOW.getTime()).toBe(11_000);

    const scheduled = journey!.scheduledTimes.filter((t) => !t.isRealTime);
    expect(scheduled.length).toBeGreaterThan(0);
    // "06:52" → an absolute clock time later today (after NOW=05:00).
    expect(scheduled[0]!.arrivalTime.getHours()).toBe(6);
    expect(scheduled[0]!.arrivalTime.getMinutes()).toBe(52);
  });

  it("keeps each journey's arrivals sorted ascending", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), NOW);
    for (const line of schedules) {
      for (const journey of line.journeys) {
        const times = journey.scheduledTimes.map((t) => t.arrivalTime.getTime());
        expect(times).toEqual([...times].sort((a, b) => a - b));
      }
    }
  });

  it("parses two real-time buses with correct offsets and accessibility", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-realtime.json"), NOW);
    const journey = schedules[0]!.journeys[0]!;
    expect(journey.scheduledTimes.every((t) => t.isRealTime)).toBe(true);

    const offsets = journey.scheduledTimes.map((t) => t.arrivalTime.getTime() - NOW.getTime());
    expect(offsets).toEqual([330_000, 720_000]); // 5m30s, 12m00s
    // adaptada "S" → true, "N" → false.
    expect(journey.scheduledTimes[0]!.accessible).toBe(true);
    expect(journey.scheduledTimes[1]!.accessible).toBe(false);
  });

  it("marks an all-scheduled (night) response with no real-time arrivals", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-scheduled-night.json"), NOW);
    const allTimes = schedules.flatMap((s) => s.journeys.flatMap((j) => j.scheduledTimes));
    expect(allTimes.length).toBeGreaterThan(0);
    expect(allTimes.some((t) => t.isRealTime)).toBe(false);
  });

  it("accepts the array-form trayectos edge case", () => {
    const schedules = parseSchedulesResponse(loadFixture("schedule-array-form.json"), NOW);
    const times = schedules[0]!.journeys[0]!.scheduledTimes;
    expect(times).toHaveLength(1);
    expect(times[0]!.isRealTime).toBe(true);
    expect(times[0]!.arrivalTime.getTime() - NOW.getTime()).toBe(180_000); // 3 min
  });

  it("filters the sentinel response to an empty schedule list", () => {
    expect(parseSchedulesResponse(loadFixture("schedule-sentinel.json"), NOW)).toEqual([]);
  });

  it("throws ZodError on a malformed response (contract change)", () => {
    expect(() => parseSchedulesResponse(loadFixture("schedule-malformed.json"), NOW)).toThrow(
      ZodError,
    );
  });
});

describe("normalizeText", () => {
  it("lowercases and pads ` - ` / ` / ` separators", () => {
    expect(normalizeText("RONDA-HOSPITALS")).toBe("ronda - hospitals");
    expect(normalizeText("A/B")).toBe("a / b");
    expect(normalizeText("9 - POLIGONS")).toBe("9 - poligons");
  });
});
