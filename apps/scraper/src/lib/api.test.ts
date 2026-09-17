import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLleidaLines,
  nextDates,
  representativeDates,
  type MoventisLine,
} from "./api.js";

const line = (over: Partial<MoventisLine>): MoventisLine => ({
  ID_LINEA: "137",
  COD_LINEA: "9",
  DESC_LINEA: "POLIGONS",
  ID_ZONA: "2",
  COLOR: "#000000",
  TREAL: "S",
  DIAS_QUE_CIRCULA: "20260804",
  ...over,
});

const mockFeed = (lines: MoventisLine[]) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(lines) }),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("nextDates", () => {
  it("returns consecutive YYYYMMDD dates starting at the given day", () => {
    expect(nextDates(new Date("2026-08-04T00:00:00Z"), 3)).toEqual([
      "20260804",
      "20260805",
      "20260806",
    ]);
  });

  it("crosses a month boundary", () => {
    expect(nextDates(new Date("2026-08-30T00:00:00Z"), 3)).toEqual([
      "20260830",
      "20260831",
      "20260901",
    ]);
  });

  it("ignores the time of day it is called at", () => {
    // The nightly run fires at 03:00 local, which is still the same UTC day.
    expect(nextDates(new Date("2026-08-04T22:45:00Z"), 1)).toEqual(["20260804"]);
  });

  it("returns nothing for a zero-length horizon", () => {
    expect(nextDates(new Date("2026-08-04T00:00:00Z"), 0)).toEqual([]);
  });
});

describe("fetchLleidaLines", () => {
  it("keeps lines in the Lleida zone", async () => {
    mockFeed([line({}), line({ ID_LINEA: "43", ID_ZONA: "8" })]);

    const result = await fetchLleidaLines();

    expect(result.map((l) => l.ID_LINEA)).toEqual(["137"]);
  });

  it("keeps a known line that moved to another zone", async () => {
    // Guards against a zone renumber upstream: the line is still ours.
    mockFeed([line({ ID_ZONA: "14" })]);

    const result = await fetchLleidaLines(new Set(["137"]));

    expect(result.map((l) => l.ID_LINEA)).toEqual(["137"]);
  });

  it("does not adopt an unknown line from a foreign zone", async () => {
    mockFeed([line({ ID_LINEA: "43", ID_ZONA: "8" })]);

    expect(await fetchLleidaLines(new Set(["137"]))).toEqual([]);
  });

  it("throws when the feed responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(fetchLleidaLines()).rejects.toThrow("/lines 503");
  });
});

describe("representativeDates", () => {
  it("picks one weekday plus Saturday and Sunday", () => {
    // 2026-08-03 Mon, 04 Tue, 08 Sat, 09 Sun
    const result = representativeDates([
      "20260803",
      "20260804",
      "20260808",
      "20260809",
    ]);

    expect(result).toEqual(["20260803", "20260808", "20260809"]);
  });

  it("returns nothing when given no dates", () => {
    expect(representativeDates([])).toEqual([]);
  });

  it("reads the weekday in UTC, not in the host's zone", () => {
    // The container runs in UTC, a laptop may not. 2026-08-03T00:00Z is a
    // Monday, but 20:00 on Sunday in New York; 2026-08-09T00:00Z is a Sunday,
    // but Saturday there. Reading either locally swaps both dates into the
    // wrong day-of-week group, and the line gets probed on the wrong days.
    vi.stubEnv("TZ", "America/New_York");

    expect(representativeDates(["20260803", "20260809"])).toEqual([
      "20260803",
      "20260809",
    ]);
  });
});
