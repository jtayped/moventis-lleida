import { describe, expect, it } from "vitest";
import { paradasFixtures } from "@moventis/shared/fixtures";
import {
  dayTypeOf,
  departuresAt,
  lineSegments,
  lineSummary,
  originDepartures,
  pickServiceDays,
  typicalHeadway,
  type TimetableRowInput,
} from "./timetable-views";

const { line2Loop, line5Weekday, line6Segment1, line6Segment2, n1Saturday } =
  paradasFixtures;

describe("dayTypeOf", () => {
  it("reads the calendar date, not the host's zone", () => {
    expect(dayTypeOf("2026-10-03")).toBe("saturday");
    expect(dayTypeOf("2026-10-04")).toBe("sunday");
    expect(dayTypeOf("2026-10-05")).toBe("weekday");
    expect(dayTypeOf("2026-10-09")).toBe("weekday");
  });
});

describe("pickServiceDays", () => {
  it("passes over a weekday that runs fewer lines, like a holiday", () => {
    const days = pickServiceDays([
      { date: "2026-10-12", rows: 30 }, // a holiday monday
      { date: "2026-10-13", rows: 44 },
      { date: "2026-10-14", rows: 44 },
      { date: "2026-10-10", rows: 32 },
      { date: "2026-10-11", rows: 20 },
    ]);
    expect(days).toEqual({
      weekday: "2026-10-13",
      saturday: "2026-10-10",
      sunday: "2026-10-11",
    });
  });

  it("leaves out a day type the window does not hold", () => {
    expect(pickServiceDays([{ date: "2026-10-05", rows: 40 }])).toEqual({
      weekday: "2026-10-05",
    });
    expect(pickServiceDays([])).toEqual({});
  });
});

describe("departuresAt", () => {
  it("leaves a loop's terminal once, not again as it arrives", () => {
    const { parsed } = line2Loop;
    const terminal = parsed.stops[0]!;
    expect(parsed.stops[parsed.stops.length - 1]).toBe(terminal);

    const departures = departuresAt(parsed, terminal);
    expect(departures).toEqual(originDepartures(parsed));
    expect(departures).toHaveLength(51);
    // 06:53, the first bus out; 07:09 is only ever an arrival at the end.
    expect(departures[0]).toBe(413);
    expect(departures).not.toContain(429);
  });

  it("lists nothing where a segment ends, and the next segment's first stop instead", () => {
    const junction = line6Segment1.parsed.stops.at(-1)!;
    expect(line6Segment2.parsed.stops[0]).toBe(junction);

    expect(departuresAt(line6Segment1.parsed, junction)).toEqual([]);
    expect(departuresAt(line6Segment2.parsed, junction)).toHaveLength(40);
  });

  it("reads a stop's unpaired times, which no trip carries", () => {
    const { parsed } = line6Segment2;
    const entry = parsed.unpaired!.find((u) => u.position === 9)!;
    const stop = parsed.stops[9]!;
    expect(parsed.trips.every((trip) => trip.times[9] === null)).toBe(true);

    expect(departuresAt(parsed, stop)).toEqual(entry.times);
  });

  it("keeps times past midnight in order after the evening ones", () => {
    const departures = originDepartures(n1Saturday.parsed);
    expect(departures[0]).toBe(23 * 60);
    expect(departures.at(-1)).toBe(1710); // 04:30 the next morning
    expect(departures).toEqual([...departures].sort((a, b) => a - b));
  });

  it("is ascending with each minute once", () => {
    const departures = originDepartures(line5Weekday.parsed);
    expect(departures).toHaveLength(42);
    expect(new Set(departures).size).toBe(departures.length);
    expect(departures).toEqual([...departures].sort((a, b) => a - b));
  });
});

describe("typicalHeadway", () => {
  it("is the median gap", () => {
    // gaps 10, 15, 15, 80, 10: the 80-minute midday hole does not count
    expect(typicalHeadway([0, 10, 25, 40, 120, 130])).toBe(15);
    expect(typicalHeadway([0, 12, 24, 36])).toBe(12);
  });

  it("is null with too few departures to call it a frequency", () => {
    expect(typicalHeadway([400, 900])).toBeNull();
    expect(typicalHeadway([])).toBeNull();
  });
});

describe("lineSegments", () => {
  const variant = {
    description: "pla d'urgell - agrònoms",
    direction: "I",
    isPrincipal: true,
    trayectoIds: [2, 3],
  };
  const rows: TimetableRowInput[] = [
    { trayectoId: 2, date: "2026-10-05", timetable: line6Segment1.parsed },
    { trayectoId: 3, date: "2026-10-05", timetable: line6Segment2.parsed },
    { trayectoId: 3, date: "2026-10-03", timetable: line6Segment2.parsed },
  ];

  it("splits a concatenated variant into its segments, in order", () => {
    const segments = lineSegments([variant], rows, {
      weekday: "2026-10-05",
      saturday: "2026-10-03",
    });

    expect(segments.map((s) => s.trayectoId)).toEqual([2, 3]);
    expect(segments[0]!.stops).toEqual(line6Segment1.parsed.stops);
    expect(segments[0]!.departures.weekday).toHaveLength(46);
    expect(segments[0]!.departures.saturday).toBeUndefined();
    expect(segments[1]!.departures.saturday).toHaveLength(40);
    expect(segments[1]!.description).toBe(variant.description);
  });

  it("reads only the chosen dates, and drops a segment none of them runs", () => {
    const segments = lineSegments([variant], rows, { saturday: "2026-10-03" });
    expect(segments.map((s) => s.trayectoId)).toEqual([3]);
  });

  it("lists a trayecto once even when two variants share it", () => {
    const segments = lineSegments([variant, variant], rows, {
      weekday: "2026-10-05",
    });
    expect(segments).toHaveLength(2);
  });
});

describe("lineSummary", () => {
  it("spans every segment's first stop, and takes the frequency from the busiest", () => {
    const segments = lineSegments(
      [
        {
          description: "",
          direction: "I",
          isPrincipal: true,
          trayectoIds: [2, 3],
        },
      ],
      [
        { trayectoId: 2, date: "2026-10-05", timetable: line6Segment1.parsed },
        { trayectoId: 3, date: "2026-10-05", timetable: line6Segment2.parsed },
      ],
      { weekday: "2026-10-05" },
    );
    const one = originDepartures(line6Segment1.parsed);
    const two = originDepartures(line6Segment2.parsed);

    expect(lineSummary(segments)).toEqual({
      weekday: {
        first: Math.min(one[0]!, two[0]!),
        last: Math.max(one.at(-1)!, two.at(-1)!),
        headway: typicalHeadway(one),
      },
    });
  });
});
