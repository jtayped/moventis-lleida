import { describe, expect, it } from "vitest";
import { fromWallClock, toWallClock, utcStartOfLocalDay } from "./zoned-time";

describe("toWallClock", () => {
  it("reads an instant as Lleida's clock, not the host's", () => {
    // 12:00Z in July is 14:00 CEST.
    expect(toWallClock(new Date("2026-07-15T12:00:00Z"))).toEqual({
      year: 2026,
      month: 7,
      day: 15,
      hour: 14,
      minute: 0,
      second: 0,
    });
  });

  it("applies the winter offset", () => {
    expect(toWallClock(new Date("2026-01-15T12:00:00Z"))).toMatchObject({ hour: 13 });
  });

  it("reports the next calendar day when Lleida has rolled over but UTC has not", () => {
    expect(toWallClock(new Date("2026-07-15T23:30:00Z"))).toMatchObject({
      month: 7,
      day: 16,
      hour: 1,
      minute: 30,
    });
  });

  it("uses a 24-hour clock rather than wrapping midnight to 24", () => {
    expect(toWallClock(new Date("2026-07-15T22:00:00Z"))).toMatchObject({ day: 16, hour: 0 });
  });
});

describe("fromWallClock", () => {
  it("resolves a summer wall clock to the matching instant", () => {
    expect(fromWallClock(2026, 7, 15, 14, 0).toISOString()).toBe("2026-07-15T12:00:00.000Z");
  });

  it("resolves a winter wall clock to the matching instant", () => {
    expect(fromWallClock(2026, 1, 15, 13, 0).toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });

  it("carries an overflowing day into the next month", () => {
    // Used by the night rollover: 30 June + 1 day.
    expect(toWallClock(fromWallClock(2026, 6, 31, 6, 17))).toMatchObject({
      month: 7,
      day: 1,
      hour: 6,
      minute: 17,
    });
  });

  it("round-trips every wall clock across a full year", () => {
    for (let day = 0; day < 365; day++) {
      const instant = new Date(Date.UTC(2026, 0, 1, 9, 43) + day * 86_400_000);
      const w = toWallClock(instant);
      expect(fromWallClock(w.year, w.month, w.day, w.hour, w.minute).toISOString()).toBe(
        instant.toISOString(),
      );
    }
  });

  it("lands on a real instant across the spring-forward gap", () => {
    // Spain skips 02:00→03:00 on 29 March 2026; 02:30 does not exist.
    const gap = fromWallClock(2026, 3, 29, 2, 30);
    expect(Number.isNaN(gap.getTime())).toBe(false);
    expect(gap.toISOString()).toBe("2026-03-29T01:30:00.000Z");
  });

  it("picks the second pass of the repeated autumn hour", () => {
    // 02:30 happens twice on 25 October 2026; the later (CET) one wins.
    expect(fromWallClock(2026, 10, 25, 2, 30).toISOString()).toBe("2026-10-25T01:30:00.000Z");
  });
});

describe("utcStartOfLocalDay", () => {
  it("returns midnight UTC of the day Lleida is currently on", () => {
    expect(utcStartOfLocalDay(new Date("2026-07-15T12:00:00Z")).toISOString()).toBe(
      "2026-07-15T00:00:00.000Z",
    );
  });

  it("has already advanced while UTC is still on the previous day", () => {
    // 01:30 on the 16th in Lleida — an OperatingDay query must not answer with the 15th.
    expect(utcStartOfLocalDay(new Date("2026-07-15T23:30:00Z")).toISOString()).toBe(
      "2026-07-16T00:00:00.000Z",
    );
  });
});
