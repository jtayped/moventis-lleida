import { describe, expect, it } from "vitest";
import { apiScheduleSchema, scheduleSchema } from "@moventis/shared";
import { loadFixture } from "../__fixtures__/load";

/**
 * SHAPE / CONTRACT LAYER — runs before any logic test.
 *
 * These tests answer one question only: "does the data still have the shape our
 * code assumes?" They never touch the locator or the time math. If a logic test
 * and a contract test fail together, the contract test is the real cause — the
 * Moventis API (or a fixture) drifted, so fix the schema/fixtures first and only
 * then look at the algorithm.
 *
 * The committed fixtures are the recorded contract; the `*.live.test.ts` canary
 * checks the live API still satisfies it.
 */

/** Strip the `{"idLinea":"N"}` sentinel exactly as the parser does, then validate. */
function filterSentinel(raw: unknown): unknown {
  return Array.isArray(raw)
    ? raw.filter(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as Record<string, unknown>).idLinea !== "N",
      )
    : raw;
}

/** Flatten every arrival detail out of a line's `trayectos` (object- or array-form). */
function details(line: {
  trayectos: Record<string, unknown>;
}): Record<string, unknown>[] {
  return Object.values(line.trayectos).flatMap((v) =>
    Array.isArray(v)
      ? (v as Record<string, unknown>[])
      : (Object.values(v as object) as Record<string, unknown>[]),
  );
}

const VALID_FIXTURES = [
  "schedule-mixed.json",
  "schedule-realtime.json",
  "schedule-scheduled-night.json",
  "schedule-array-form.json",
] as const;

describe("API response contract", () => {
  it.each(VALID_FIXTURES)("%s validates against apiScheduleSchema", (name) => {
    const result = apiScheduleSchema.safeParse(
      filterSentinel(loadFixture(name)),
    );
    expect(result.success).toBe(true);
  });

  it("filters the {idLinea:'N'} sentinel down to an empty, valid array", () => {
    const filtered = filterSentinel(loadFixture("schedule-sentinel.json"));
    expect(filtered).toEqual([]);
    expect(apiScheduleSchema.safeParse(filtered).success).toBe(true);
  });

  it("rejects a malformed response (unknown `real` value) — the canary has teeth", () => {
    const result = apiScheduleSchema.safeParse(
      filterSentinel(loadFixture("schedule-malformed.json")),
    );
    expect(result.success).toBe(false);
  });

  it("discriminates real-time vs scheduled by `real`", () => {
    const realtime = scheduleSchema.parse({
      minutos: "05 min 30 s",
      adaptada: "S",
      real: "S",
    });
    expect(realtime.real).toBe("S");

    const scheduled = scheduleSchema.parse({
      minutos: "02' 00''",
      adaptada: null,
      real: "N",
      hora: "06:17",
      tiempo: "04 h 02 min",
    });
    expect(scheduled.real).toBe("N");
    // `hora` only exists on the scheduled branch — the parser keys arrival math on it.
    if (scheduled.real === "N") expect(scheduled.hora).toBe("06:17");
  });

  // These two guard the *coupling* between the API's string formats and the
  // parser's regexes — the silent-failure risk if Moventis reformats a field.
  it("every real-time `minutos` still matches the parser's relative-time regex", () => {
    const re = /(?:(\d+)\s*h\s*)?(\d+)\s*min\s*(\d+)\s*s/;
    for (const name of VALID_FIXTURES) {
      const lines = apiScheduleSchema.parse(filterSentinel(loadFixture(name)));
      for (const line of lines) {
        for (const d of details(line)) {
          if (d.real === "S") expect(String(d.minutos)).toMatch(re);
        }
      }
    }
  });

  it("every scheduled `hora` still matches the parser's clock-time format", () => {
    for (const name of VALID_FIXTURES) {
      const lines = apiScheduleSchema.parse(filterSentinel(loadFixture(name)));
      for (const line of lines) {
        for (const d of details(line)) {
          if (d.real === "N") expect(String(d.hora)).toMatch(/^\d{1,2}:\d{2}$/);
        }
      }
    }
  });

  it("every `desc_linea` carries the ` - ` separator the line split depends on", () => {
    for (const name of VALID_FIXTURES) {
      const lines = apiScheduleSchema.parse(filterSentinel(loadFixture(name)));
      for (const line of lines) expect(line.desc_linea).toContain("-");
    }
  });
});

/**
 * `stops.nextArrivals` spends **one** request per stop, where `stops.get` fans
 * out over the stop's routes. That is only sound because the upstream response
 * does not depend on which route it was asked about — and nothing in the URL
 * says so. If Moventis ever starts filtering the response to the requested
 * line, this is the test that says so, before a map full of pins quietly starts
 * under-reporting.
 */
describe("GetTiemposParada is per-stop, not per-route", () => {
  const byRoute130 = loadFixture("line-2-loop-snapshot.json") as LineCapture;
  const byRoute133 = loadFixture("line-5-linear-snapshot.json") as LineCapture;

  interface LineCapture {
    routeExternalId: string;
    stops: Record<string, { name: string; body: unknown }>;
  }

  /** The `idLinea`s a recorded response lists, sorted for comparison. */
  function lineIds(body: unknown): string[] {
    const lines = filterSentinel(body);
    return Array.isArray(lines)
      ? lines
          .map((l) => String((l as { idLinea: unknown }).idLinea))
          .sort((a, b) => a.localeCompare(b))
      : [];
  }

  const shared = Object.keys(byRoute130.stops).filter(
    (id) => byRoute133.stops[id],
  );

  it("has stops captured under both route ids to compare", () => {
    expect(shared.length).toBeGreaterThan(0);
  });

  it.each(shared)(
    "lists the same lines at stop %s whichever route id asked",
    (externalId) => {
      const viaA = lineIds(byRoute130.stops[externalId]!.body);
      const viaB = lineIds(byRoute133.stops[externalId]!.body);

      // Both captures include the stop's *other* lines, not just the one the
      // URL named — so one request is enough to know every bus due here.
      expect(viaA).toEqual(viaB);
      expect(viaA).toContain(byRoute130.routeExternalId);
      expect(viaA).toContain(byRoute133.routeExternalId);
    },
  );
});
