import { describe, expect, it } from "vitest";
import {
  dedupeTrayectos,
  dormantOutcome,
  hasService,
  runningOutcome,
  summarizeProbes,
  type Probe,
} from "./resolution.js";
import type { MoventisTrayecto } from "./api.js";

const trayecto = (id: number, over: Partial<MoventisTrayecto> = {}) =>
  ({
    ID_LINEA: 137,
    ID_TRAYECTO: [id],
    ID_TRAYECTO_CONCAT: null,
    DESC_TRAYECTO: `T${id}`,
    DESC_REDUCIDA: `T${id}`,
    PRINCIPAL: "S",
    SENTIDO: "I",
    TrayectosDet: [],
    ...over,
  }) satisfies MoventisTrayecto;

/** A date that came back carrying service. */
const serving = (date: string, ids: number[]): Probe => ({
  date,
  trayectos: ids.map((id) => trayecto(id)),
});

/** A date the API answered for, with the line not running (the stub response). */
const idle = (date: string): Probe => ({ date, trayectos: [] });

/** A date whose request errored. */
const failed = (date: string): Probe => ({ date, trayectos: null });

describe("summarizeProbes", () => {
  it("keeps only the dates carrying service", () => {
    const summary = summarizeProbes([
      serving("20260804", [3]),
      idle("20260808"),
      serving("20260805", [4]),
    ]);

    expect(summary.operatingDates).toEqual(["20260804", "20260805"]);
    expect(summary.allAnswered).toBe(true);
  });

  it("flags a batch containing a failed request", () => {
    const summary = summarizeProbes([serving("20260804", [3]), failed("20260805")]);

    expect(summary.allAnswered).toBe(false);
    expect(summary.operatingDates).toEqual(["20260804"]);
  });

  it("treats an all-idle batch as answered with no service", () => {
    const summary = summarizeProbes([idle("20260808"), idle("20260809")]);

    expect(summary).toEqual({
      operatingDates: [],
      trayectos: [],
      allAnswered: true,
    });
  });

  it("deduplicates trayectos repeated across dates", () => {
    const summary = summarizeProbes([
      serving("20260804", [3, 4]),
      serving("20260805", [4, 5]),
    ]);

    expect(summary.trayectos).toHaveLength(3);
  });
});

describe("dedupeTrayectos", () => {
  it("prefers ID_TRAYECTO_CONCAT as the identity when present", () => {
    const a = trayecto(3, { ID_TRAYECTO: [1, 2, 3], ID_TRAYECTO_CONCAT: 99 });
    const b = trayecto(7, { ID_TRAYECTO: [5, 6, 7], ID_TRAYECTO_CONCAT: 99 });

    expect(dedupeTrayectos([[a], [b]])).toHaveLength(1);
  });

  it("drops a trayecto with no usable id", () => {
    expect(dedupeTrayectos([[trayecto(0, { ID_TRAYECTO: [] })]])).toEqual([]);
  });
});

describe("hasService", () => {
  it("is true only when a date carried service", () => {
    expect(hasService(summarizeProbes([serving("20260804", [3])]))).toBe(true);
    expect(hasService(summarizeProbes([idle("20260804")]))).toBe(false);
  });
});

describe("runningOutcome", () => {
  it("carries the probed calendar through", () => {
    const near = summarizeProbes([serving("20260804", [3]), idle("20260808")]);

    expect(runningOutcome(near)).toEqual({
      status: "resolved",
      operatingDates: ["20260804"],
      calendarProbed: true,
      trayectos: near.trayectos,
    });
  });

  it("marks the calendar unprobed when a request failed", () => {
    const near = summarizeProbes([serving("20260804", [3]), failed("20260805")]);

    expect(runningOutcome(near).calendarProbed).toBe(false);
  });
});

describe("dormantOutcome", () => {
  const quietFortnight = summarizeProbes([idle("20260804"), idle("20260805")]);

  it("resolves a seasonally dormant line with an empty calendar", () => {
    // Line 10 (Caparrella - Llívia) runs nothing in August and returns in
    // September. It must keep its stops and geometry while reporting no
    // operating days, so the line strip stops claiming it runs today.
    const far = summarizeProbes([idle("20260804"), serving("20260915", [3])]);

    const outcome = dormantOutcome(quietFortnight, far);

    expect(outcome).toEqual({
      status: "resolved",
      operatingDates: [],
      calendarProbed: true,
      trayectos: far.trayectos,
    });
  });

  it("declares a line withdrawn when every probe answered and none served", () => {
    const far = summarizeProbes([idle("20260804"), idle("20260915")]);

    expect(dormantOutcome(quietFortnight, far)).toEqual({ status: "withdrawn" });
  });

  it("refuses to call a line withdrawn when the far scan errored", () => {
    // Silence caused by an outage must not be read as a withdrawal — that is
    // what would let a bad night delete a live line.
    const far = summarizeProbes([idle("20260804"), failed("20260915")]);

    expect(dormantOutcome(quietFortnight, far)).toEqual({
      status: "unreachable",
    });
  });

  it("refuses to call a line withdrawn when the near probe errored", () => {
    const near = summarizeProbes([idle("20260804"), failed("20260805")]);
    const far = summarizeProbes([idle("20260915")]);

    expect(dormantOutcome(near, far)).toEqual({ status: "unreachable" });
  });

  it("still resolves a dormant line when the near probe was incomplete", () => {
    const near = summarizeProbes([idle("20260804"), failed("20260805")]);
    const far = summarizeProbes([serving("20260915", [3])]);

    const outcome = dormantOutcome(near, far);

    // Resolved, but the half-known calendar must not overwrite the stored one.
    expect(outcome).toMatchObject({ status: "resolved", calendarProbed: false });
  });
});
