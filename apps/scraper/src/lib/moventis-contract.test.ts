import { describe, expect, it } from "vitest";
import { z } from "zod";
import { loadFixture } from "../__fixtures__/load.js";
import { normalizeLineCode } from "./normalize.js";
import {
  incidenciaSchema,
  lineFeedRowSchema,
  trayectosResponseSchema,
} from "./schemas.js";

/**
 * SHAPE / CONTRACT LAYER for the feeds the scraper reads.
 *
 * These tests answer one question: does the recorded data still have the shape
 * `schemas.ts` assumes? They never touch discovery or the sync. If one of these
 * fails together with a logic test, fix the schema or the fixture first.
 *
 * The committed fixtures are the recorded contract; `moventis.live.test.ts`
 * checks the live feeds still satisfy it.
 */

const TRAYECTO_FIXTURES = [
  "trayectos-line-1-loop.json",
  "trayectos-line-5-linear.json",
  "trayectos-line-n1-night.json",
  "trayectos-line-6-concat.json",
] as const;

/** A deep copy of a fixture, to break without touching the shared one. */
function copyOf<T>(name: string): T {
  return structuredClone(loadFixture(name)) as T;
}

describe("line feed contract", () => {
  it("every recorded row validates, from any zone", () => {
    const result = z
      .array(lineFeedRowSchema)
      .safeParse(loadFixture("lines-feed-slice.json"));
    expect(result.success).toBe(true);
  });

  it("types the fields the scraper does not read yet", () => {
    const [row] = z
      .array(lineFeedRowSchema)
      .parse(loadFixture("lines-feed-slice.json"));
    expect(row?.nid).toBe("86606");
    expect(row?.MARCA).toBe("86862");
  });

  it("rejects an operating date in another format, which parseDateStr would misread", () => {
    const [row] = copyOf<Record<string, unknown>[]>("lines-feed-slice.json");
    expect(
      lineFeedRowSchema.safeParse({ ...row, DIAS_QUE_CIRCULA: "2026-10-02" })
        .success,
    ).toBe(false);
  });

  it("still maps the night line's COD_LINEA to the app's code", () => {
    const rows = z
      .array(lineFeedRowSchema)
      .parse(loadFixture("lines-feed-slice.json"));
    const night = rows.find((r) => r.ID_LINEA === "717");
    expect(night && normalizeLineCode(night.COD_LINEA)).toBe("n1");
  });
});

describe("GetTrayectos contract", () => {
  it.each(TRAYECTO_FIXTURES)("%s validates", (name) => {
    const result = trayectosResponseSchema.safeParse(loadFixture(name));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.length).toBeGreaterThan(0);
  });

  it("parses the non-operating stub to no trayectos", () => {
    expect(
      trayectosResponseSchema.parse(loadFixture("trayectos-stub.json")),
    ).toEqual([]);
  });

  it("rejects a trayecto missing a field the sync reads, so the canary has teeth", () => {
    const body = copyOf<Record<string, unknown>[]>(
      "trayectos-line-5-linear.json",
    );
    delete body[1]!.SENTIDO;
    expect(trayectosResponseSchema.safeParse(body).success).toBe(false);
  });

  it("rejects a stop with no coordinates", () => {
    const body = copyOf<
      { TrayectosDet: { Parada: Record<string, unknown> }[] }[]
    >("trayectos-line-1-loop.json");
    body[0]!.TrayectosDet[3]!.Parada.LATITUD = null;
    expect(trayectosResponseSchema.safeParse(body).success).toBe(false);
  });

  it("reads a drifted field nobody uses as absent instead of failing", () => {
    const body = copyOf<
      { TrayectosDet: { Parada: Record<string, unknown> }[] }[]
    >("trayectos-line-1-loop.json");
    body[0]!.TrayectosDet[0]!.Parada.COD_PARADA = "20001";

    const [trayecto] = trayectosResponseSchema.parse(body);

    expect(trayecto?.TrayectosDet[0]?.Parada?.COD_PARADA).toBeUndefined();
    expect(trayecto?.TrayectosDet[0]?.Parada?.ID_PARADA).toBe(10242);
  });
});

describe("incidencias contract", () => {
  it("every recorded row validates", () => {
    const result = z
      .array(incidenciaSchema)
      .safeParse(loadFixture("incidencias.json"));
    expect(result.success).toBe(true);
  });

  it("rejects an end date in another format", () => {
    const [row] = copyOf<Record<string, unknown>[]>("incidencias.json");
    expect(
      incidenciaSchema.safeParse({ ...row, ENDATE: "11/10/2026 12:00" })
        .success,
    ).toBe(false);
  });
});
