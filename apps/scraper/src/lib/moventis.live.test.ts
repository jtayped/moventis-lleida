import { describe, expect, it } from "vitest";
import {
  fetchIncidencias,
  fetchLleidaLines,
  fetchTrayectos,
  toYyyymmdd,
  type MoventisLine,
} from "./api.js";

/**
 * LIVE CONTRACT CANARY: opt-in and network dependent. Run with `pnpm test:live`;
 * excluded from the default `pnpm test`.
 *
 * It calls the same fetchers the sync uses, so it fails exactly when a live
 * response no longer parses through `schemas.ts`. It never asserts values:
 * lines, dates and alerts change from day to day. When it fails, re-record the
 * fixture for that feed and fix the schema before suspecting discovery.
 */

/** Line 1, used when the feed lists no Lleida line to take a pair from. */
const FALLBACK_LINE = "129";

let lines: MoventisLine[] = [];

describe("Moventis live feeds", () => {
  it("the line feed still parses", async () => {
    lines = await fetchLleidaLines();
    expect(Array.isArray(lines)).toBe(true);
  });

  it("GetTrayectos still parses", async () => {
    // A line on a date the feed says it runs gets a real answer rather than
    // the stub, so the trayecto schema is the part being exercised. The feed
    // dropped Lleida once already, hence the fallback.
    const row = lines[0];
    const trayectos = await fetchTrayectos(
      row?.ID_LINEA ?? FALLBACK_LINE,
      row?.DIAS_QUE_CIRCULA ?? toYyyymmdd(new Date()),
    );
    expect(Array.isArray(trayectos)).toBe(true);
  });

  it("the incidencias feed still parses", async () => {
    const alerts = await fetchIncidencias();
    expect(Array.isArray(alerts)).toBe(true);
  });
});
