import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { normalizeText, parseSchedulesResponse } from "./stop-schedule";
import { toWallClock } from "./zoned-time";
import { loadFixture } from "../__fixtures__/load";

// A fixed instant so relative→absolute arrival math is deterministic. Written as
// UTC and asserted through `toWallClock`, never through `Date#getHours`, so the
// suite means the same thing on a UTC host as on a developer's CEST laptop —
// that gap is the bug these tests cover. 03:00 UTC is 05:00 in Lleida, before the
// morning scheduled times in the fixtures, so they stay "today".
const NOW = new Date("2026-06-19T03:00:00Z"); // 2026-06-19 05:00 in Lleida

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
    // "06:52" → that same clock time later today in Lleida (NOW is 05:00 there).
    const clock = toWallClock(scheduled[0]!.arrivalTime);
    expect(clock).toMatchObject({ year: 2026, month: 6, day: 19, hour: 6, minute: 52 });
    // And as an instant: 06:52 CEST is 04:52Z, 1h52m after NOW — not 3h52m, which
    // is what reading `hora` in a UTC host's own zone would have produced.
    expect(scheduled[0]!.arrivalTime.getTime() - NOW.getTime()).toBe(112 * 60 * 1000);
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

  it("agrees with the countdown Moventis itself reported at capture time", () => {
    // Every scheduled entry in the mixed capture pairs an `hora` with Moventis' own
    // `tiempo` countdown, and all four agree the response was captured at 02:15 in
    // Lleida. Replaying it at that instant must reproduce those countdowns exactly —
    // this is the assertion the site's own display was failing, by a flat +2h.
    const capturedAt = new Date("2026-06-19T00:15:00Z"); // 02:15 CEST
    const schedules = parseSchedulesResponse(loadFixture("schedule-mixed.json"), capturedAt);
    const journey = schedules.find((s) => s.externalLineId === "130")!.journeys[0]!;

    const countdowns = journey.scheduledTimes
      .filter((t) => !t.isRealTime)
      .map((t) => (t.arrivalTime.getTime() - capturedAt.getTime()) / 60_000);

    // "04 h 37 min", "04 h 53 min", "05 h 10 min", "05 h 25 min".
    expect(countdowns).toEqual([277, 293, 310, 325]);
  });

  it("rolls a scheduled time long past into tomorrow's service", () => {
    // 23:00 in Lleida: the fixture's 06:17 and 07:08 are next morning's departures.
    const lateNight = new Date("2026-06-19T21:00:00Z");
    const schedules = parseSchedulesResponse(
      loadFixture("schedule-scheduled-night.json"),
      lateNight,
    );
    const first = schedules[0]!.journeys[0]!.scheduledTimes[0]!.arrivalTime;

    expect(first.getTime()).toBeGreaterThan(lateNight.getTime());
    expect(toWallClock(first)).toMatchObject({ day: 20, hour: 6, minute: 17 });
  });

  it("keeps a just-missed departure in the past instead of pushing it a day out", () => {
    // 06:30 in Lleida, 13 minutes after the fixture's 06:17 — stale data, not tomorrow.
    const justAfter = new Date("2026-06-19T04:30:00Z");
    const schedules = parseSchedulesResponse(
      loadFixture("schedule-scheduled-night.json"),
      justAfter,
    );
    const first = schedules[0]!.journeys[0]!.scheduledTimes[0]!.arrivalTime;

    expect(first.getTime()).toBeLessThan(justAfter.getTime());
    expect(toWallClock(first)).toMatchObject({ day: 19, hour: 6, minute: 17 });
  });

  it("resolves scheduled times against the winter offset too", () => {
    // 05:00 CET is 04:00Z; 06:17 CET is 05:17Z, so the gap is 77 min, not 2h17m.
    const winter = new Date("2026-01-15T04:00:00Z");
    const schedules = parseSchedulesResponse(loadFixture("schedule-scheduled-night.json"), winter);
    const first = schedules[0]!.journeys[0]!.scheduledTimes[0]!.arrivalTime;

    expect(toWallClock(first)).toMatchObject({ month: 1, day: 15, hour: 6, minute: 17 });
    expect(first.getTime() - winter.getTime()).toBe(77 * 60 * 1000);
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
