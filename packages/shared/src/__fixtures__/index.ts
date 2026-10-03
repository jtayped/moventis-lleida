/**
 * Recorded `GetParadas` responses and what each parses to, for tests in any
 * package (`@moventis/shared/fixtures`). Never imported by app code.
 */

import type { StoredTimetable } from "../schemas/timetable";
import line2LoopParsed from "./paradas-line-2-loop.parsed.json";
import line2Loop from "./paradas-line-2-loop.json";
import line5WeekdayParsed from "./paradas-line-5-weekday.parsed.json";
import line5Weekday from "./paradas-line-5-weekday.json";
import line6Segment1Parsed from "./paradas-line-6-segment-1.parsed.json";
import line6Segment1 from "./paradas-line-6-segment-1.json";
import line6Segment2Parsed from "./paradas-line-6-segment-2.parsed.json";
import line6Segment2 from "./paradas-line-6-segment-2.json";
import n1SaturdayParsed from "./paradas-n1-saturday.parsed.json";
import n1Saturday from "./paradas-n1-saturday.json";
import noService from "./paradas-no-service.json";
import sentinel from "./paradas-sentinel.json";

export interface ParadasFixture {
  /** `Route.code`. */
  line: string;
  /** `Route.externalId` — the `{line}` in the URL. */
  lineExternalId: string;
  /** The `{trayecto}` in the URL: one of `RouteVariant.trayectoIds`. */
  trayectoId: number;
  /** Service date, `YYYYMMDD`. */
  date: string;
  /** The response body, untouched. */
  raw: unknown;
  /** What `parseParadasResponse(raw)` returns. */
  parsed: StoredTimetable;
}

const fixture = (
  meta: Omit<ParadasFixture, "raw" | "parsed">,
  raw: unknown,
  parsed: unknown,
): ParadasFixture => ({ ...meta, raw, parsed: parsed as StoredTimetable });

const EMPTY: StoredTimetable = { stops: [], trips: [] };

export const paradasFixtures = {
  /** Line 5 outbound on a Monday: a plain linear line, 42 trips, 3 short-turns. */
  line5Weekday: fixture(
    { line: "5", lineExternalId: "133", trayectoId: 13, date: "20261005" },
    line5Weekday,
    line5WeekdayParsed,
  ),
  /**
   * Line 2, a loop: the terminal 13058 is position 0 and 27. Trip 125 runs
   * positions 0–22 (06:53→07:34), then carries a pull-in's 07:07–07:09 at
   * 23–27; the bus itself continues as trip 181 (07:36 at position 23).
   */
  line2Loop: fixture(
    { line: "2", lineExternalId: "130", trayectoId: 4, date: "20261005" },
    line2Loop,
    line2LoopParsed,
  ),
  /** n1 on its Saturday service date: 22:50 → 05:15, i.e. minutes 1370–1755. */
  n1Saturday: fixture(
    { line: "n1", lineExternalId: "717", trayectoId: 1, date: "20261010" },
    n1Saturday,
    n1SaturdayParsed,
  ),
  /** Line 6 "pla d'urgell - agrònoms" (trayectoIds `{2,3}`), first segment. */
  line6Segment1: fixture(
    { line: "6", lineExternalId: "134", trayectoId: 2, date: "20261005" },
    line6Segment1,
    line6Segment1Parsed,
  ),
  /**
   * Second segment of the same variant. Starts at 10161, where segment 1 ends,
   * at the same minutes under different trip ids. Positions 9 (10312) and 18
   * (10189) have more trip ids than times, so they land in `unpaired`.
   */
  line6Segment2: fixture(
    { line: "6", lineExternalId: "134", trayectoId: 3, date: "20261005" },
    line6Segment2,
    line6Segment2Parsed,
  ),
  /** n1 on a Monday: a trayecto that does not run that day answers `{}`. */
  noService: fixture(
    { line: "n1", lineExternalId: "717", trayectoId: 1, date: "20261005" },
    noService,
    EMPTY,
  ),
  /** A date outside the published calendar: one row of `"S"` placeholders. */
  sentinel: fixture(
    { line: "5", lineExternalId: "133", trayectoId: 13, date: "20260101" },
    sentinel,
    EMPTY,
  ),
} satisfies Record<string, ParadasFixture>;
