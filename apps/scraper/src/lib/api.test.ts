import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFixture } from "../__fixtures__/load.js";
import {
  fetchIncidencias,
  fetchLleidaLines,
  fetchTrayectos,
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

/** Answers every request with `body` as JSON. */
const mockJson = (body: unknown) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }),
  );
};

const mockFeed = (lines: MoventisLine[]) => mockJson(lines);

const mockStatus = (status: number) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
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
    expect(nextDates(new Date("2026-08-04T22:45:00Z"), 1)).toEqual([
      "20260804",
    ]);
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
    mockStatus(503);

    await expect(fetchLleidaLines()).rejects.toThrow("/lines 503");
  });

  it("keeps the urban and interurban Lleida rows of a recorded feed", async () => {
    mockJson(loadFixture("lines-feed-slice.json"));

    const result = await fetchLleidaLines();

    // The zone 8 row is dropped; excluding interurban lines is discovery's job.
    expect(result.map((l) => l.ID_LINEA)).toEqual([
      "129",
      "129",
      "133",
      "717",
      "177",
    ]);
  });

  it("rejects the feed when a Lleida row is malformed", async () => {
    // Dropping the row instead would hide the line from discovery, and a
    // complete run soft-deletes a line it did not see.
    mockJson([line({}), { ...line({ ID_LINEA: "138" }), COLOR: null }]);

    await expect(fetchLleidaLines()).rejects.toThrow();
  });

  it("ignores a malformed row from another zone", async () => {
    mockJson([line({}), { ...line({ ID_ZONA: "8" }), COLOR: null }]);

    const result = await fetchLleidaLines();

    expect(result.map((l) => l.ID_LINEA)).toEqual(["137"]);
  });
});

describe("fetchTrayectos", () => {
  it("answers [] for the stub of a date the line does not run", async () => {
    mockJson(loadFixture("trayectos-stub.json"));

    expect(await fetchTrayectos("717", "20261005")).toEqual([]);
  });

  it("drops stub rows mixed in with real trayectos", async () => {
    mockJson([
      { numLinea: "129" },
      ...(loadFixture("trayectos-line-1-loop.json") as unknown[]),
    ]);

    const result = await fetchTrayectos("129", "20261005");

    expect(result.map((t) => t.ID_TRAYECTO)).toEqual([[3]]);
  });

  it("wraps a bare-number ID_TRAYECTO in an array", async () => {
    mockJson(loadFixture("trayectos-line-5-linear.json"));

    const result = await fetchTrayectos("133", "20261005");

    expect(result.map((t) => t.ID_TRAYECTO)).toEqual([[14], [13]]);
  });

  it("keeps an array ID_TRAYECTO as it is", async () => {
    mockJson(loadFixture("trayectos-line-6-concat.json"));

    const result = await fetchTrayectos("134", "20261005");

    expect(result.map((t) => t.ID_TRAYECTO)).toEqual([[8], [2, 3]]);
    expect(result.map((t) => t.ID_TRAYECTO_CONCAT)).toEqual([null, 3]);
  });

  it("rejects the whole response when one trayecto is malformed", async () => {
    // A dropped variant would read as withdrawn; a rejection reads as an
    // unreachable probe, which never prunes.
    const [good, bad] = loadFixture("trayectos-line-5-linear.json") as Record<
      string,
      unknown
    >[];
    mockJson([good, { ...bad, TrayectosDet: [{ SECUENCIA: "10" }] }]);

    await expect(fetchTrayectos("133", "20261005")).rejects.toThrow();
  });

  it("throws when the endpoint responds with an error status", async () => {
    mockStatus(502);

    await expect(fetchTrayectos("129", "20261005")).rejects.toThrow(
      "GetTrayectos/129 502",
    );
  });
});

describe("fetchIncidencias", () => {
  it("parses a recorded feed", async () => {
    mockJson(loadFixture("incidencias.json"));

    const result = await fetchIncidencias();

    expect(result.map((a) => a.nid)).toEqual(["170669", "170669", "170720"]);
  });

  it("asks for the feed in the requested language", async () => {
    mockJson([]);

    await fetchIncidencias("ca");

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "https://www.moventis.es/ca/moventis/ca/incidencias",
    );
  });

  it("drops a malformed row and keeps the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const [first, ...rest] = loadFixture("incidencias.json") as Record<
      string,
      unknown
    >[];
    mockJson([{ ...first, ENDATE: null }, ...rest]);

    const result = await fetchIncidencias();

    expect(result.map((a) => a.nid)).toEqual(["170669", "170720"]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("throws when the feed responds with an error status", async () => {
    mockStatus(503);

    await expect(fetchIncidencias()).rejects.toThrow("/incidencias 503");
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
