import type { StoredTimetable } from "@moventis/shared";
import { describe, expect, it } from "vitest";
import {
  addDays,
  lleidaDate,
  planTimetableWrites,
  timetableDates,
  type TimetableFetch,
} from "./timetables.js";

const day: StoredTimetable = {
  stops: ["1", "2"],
  trips: [{ id: 1, times: [480, 485] }],
};
const horizon = { from: "20261003", to: "20261009" };

describe("lleidaDate", () => {
  it("answers in Lleida, which is already tomorrow late in the UTC evening", () => {
    // 22:30 UTC on 3 Oct is 00:30 CEST on 4 Oct.
    expect(lleidaDate(new Date("2026-10-03T22:30:00Z"))).toBe("20261004");
    expect(lleidaDate(new Date("2026-10-03T21:59:00Z"))).toBe("20261003");
    // Winter time is UTC+1.
    expect(lleidaDate(new Date("2026-12-31T23:30:00Z"))).toBe("20270101");
  });
});

describe("addDays", () => {
  it("crosses month and year ends, and goes backwards", () => {
    expect(addDays("20261031", 1)).toBe("20261101");
    expect(addDays("20261231", 1)).toBe("20270101");
    expect(addDays("20261003", -1)).toBe("20261002");
    // The day DST ends is still one calendar day.
    expect(addDays("20261025", 1)).toBe("20261026");
  });
});

describe("timetableDates", () => {
  it("keeps the operating dates inside the horizon, ascending and once", () => {
    expect(
      timetableDates(
        [
          "20261012",
          "20261002",
          "20261005",
          "20261003",
          "20261009",
          "20261005",
        ],
        "20261003",
        7,
      ),
    ).toEqual(["20261003", "20261005", "20261009"]);
  });

  it("is empty for a line dormant across the horizon", () => {
    expect(timetableDates(["20261101"], "20261003", 7)).toEqual([]);
  });
});

describe("planTimetableWrites", () => {
  const f = (
    trayectoId: number,
    date: string,
    kind: "trips" | "empty" | "failed",
  ): TimetableFetch => ({
    trayectoId,
    date,
    outcome: kind === "trips" ? { kind, timetable: day } : { kind },
  });

  it("upserts answered days, deletes answered-empty ones, and sweeps a complete run", () => {
    const writes = planTimetableWrites(
      [f(13, "20261003", "trips"), f(13, "20261004", "empty")],
      { calendarProbed: true, horizon },
    );
    expect(writes.upserts).toEqual([
      { trayectoId: 13, date: "20261003", timetable: day },
    ]);
    expect(writes.deletes).toEqual([{ trayectoId: 13, date: "20261004" }]);
    expect(writes.sweep).toEqual(horizon);
  });

  it("never sweeps when a fetch failed, and keeps the failed row", () => {
    const writes = planTimetableWrites(
      [f(13, "20261003", "trips"), f(14, "20261003", "failed")],
      { calendarProbed: true, horizon },
    );
    expect(writes.sweep).toBeNull();
    expect(writes.deletes).toEqual([]);
    expect(writes.upserts).toHaveLength(1);
  });

  it("never sweeps on a half-known calendar", () => {
    expect(
      planTimetableWrites([f(13, "20261003", "trips")], {
        calendarProbed: false,
        horizon,
      }).sweep,
    ).toBeNull();
  });

  it("sweeps a dormant line with a complete calendar: nothing to fetch, nothing to keep", () => {
    expect(planTimetableWrites([], { calendarProbed: true, horizon })).toEqual({
      upserts: [],
      deletes: [],
      sweep: horizon,
    });
  });
});
