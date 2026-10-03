import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { paradasFixtures } from "../__fixtures__";
import { parseParadasResponse, readStoredTimetable } from "./timetable";

const hm = (h: number, m: number) => h * 60 + m;
const trip = (id: number, t: ReturnType<typeof parseParadasResponse>) =>
  t.trips.find((x) => x.id === id)!;
const served = (times: (number | null)[]) =>
  times.filter((x): x is number => x !== null);

describe("parseParadasResponse", () => {
  it("matches every recorded fixture's committed parse", () => {
    for (const f of Object.values(paradasFixtures))
      expect(parseParadasResponse(f.raw)).toEqual(f.parsed);
  });

  it("reads a linear line into one row per trip, keyed by trip id", () => {
    const t = parseParadasResponse(paradasFixtures.line5Weekday.raw);
    expect(t.stops).toHaveLength(20);
    expect(t.stops[0]).toBe("10244"); // "10244-10"
    expect(t.trips).toHaveLength(42);
    // Ordered by first departure: 06:45 is trip 98, then 07:08 is 112.
    expect(t.trips[0]!.id).toBe(98);
    expect(t.trips[0]!.times[0]).toBe(hm(6, 45));
    expect(t.trips[1]!.id).toBe(112);
    // A daytime trip never goes backwards.
    for (const { times } of t.trips) {
      const s = served(times);
      expect(s).toEqual([...s].sort((a, b) => a - b));
    }
    // Short-turns stop serving the end of the line.
    expect(t.trips.some(({ times }) => times.at(-1) === null)).toBe(true);
    expect(t.unpaired).toBeUndefined();
  });

  it("keeps a loop's trips raw: the pull-in times stay on the id that carries them", () => {
    const t = parseParadasResponse(paradasFixtures.line2Loop.raw);
    expect(t.stops[0]).toBe("13058");
    expect(t.stops.at(-1)).toBe("13058");
    const t125 = trip(125, t);
    expect(t125.times[0]).toBe(hm(6, 53));
    expect(t125.times[22]).toBe(hm(7, 34));
    // Not 125 any more, but stored as Moventis lists it; the planner stitches.
    expect(t125.times[23]).toBe(hm(7, 7));
    expect(trip(181, t).times[23]).toBe(hm(7, 36));
  });

  it("unwraps the night line past midnight instead of reading 00:00 as morning", () => {
    const t = parseParadasResponse(paradasFixtures.n1Saturday.raw);
    const all = t.trips.flatMap(({ times }) => served(times));
    expect(Math.min(...all)).toBe(hm(22, 50));
    expect(Math.max(...all)).toBe(hm(29, 15)); // 05:15 on Sunday
    for (const { times } of t.trips) {
      const s = served(times);
      expect(s).toEqual([...s].sort((a, b) => a - b));
    }
  });

  it("moves a stop whose two lists disagree into unpaired, nulling it in every trip", () => {
    const t = parseParadasResponse(paradasFixtures.line6Segment2.raw);
    expect(t.unpaired?.map((u) => t.stops[u.position])).toEqual([
      "10312",
      "10189",
    ]);
    for (const { position, times } of t.unpaired!) {
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(times.length).toBeGreaterThan(0);
      for (const tr of t.trips) expect(tr.times[position]).toBeNull();
    }
  });

  it("reads both no-service shapes as an empty day", () => {
    expect(parseParadasResponse(paradasFixtures.noService.raw)).toEqual({
      stops: [],
      trips: [],
    });
    expect(parseParadasResponse(paradasFixtures.sentinel.raw)).toEqual({
      stops: [],
      trips: [],
    });
    expect(parseParadasResponse([])).toEqual({ stops: [], trips: [] });
  });

  it("treats a repeated trip id at one stop as unpaired rather than guessing", () => {
    const t = parseParadasResponse([
      {
        COD_PARADA: "1-10",
        secuencia: 1,
        hora: ["08:00", "08:10"],
        IdExpedicion: [7, 8],
      },
      {
        COD_PARADA: "2-20",
        secuencia: 2,
        hora: ["08:05", "08:15"],
        IdExpedicion: [7, 7],
      },
    ]);
    expect(t.unpaired).toEqual([{ position: 1, times: [hm(8, 5), hm(8, 15)] }]);
    expect(trip(7, t).times).toEqual([hm(8, 0), null]);
  });

  it("orders stops by secuencia, not by response order", () => {
    const t = parseParadasResponse([
      { COD_PARADA: "2-20", secuencia: 2, hora: ["08:05"], IdExpedicion: [1] },
      { COD_PARADA: "1-10", secuencia: 1, hora: ["08:00"], IdExpedicion: [1] },
    ]);
    expect(t.stops).toEqual(["1", "2"]);
    expect(t.trips[0]!.times).toEqual([hm(8, 0), hm(8, 5)]);
  });

  it("throws on a shape it does not know, so a contract change is never stored as no service", () => {
    expect(() =>
      parseParadasResponse([
        { COD_PARADA: "1-10", secuencia: 1, hora: ["8.00"], IdExpedicion: [1] },
      ]),
    ).toThrow(ZodError);
    expect(() => parseParadasResponse({ error: "x" })).toThrow(ZodError);
  });
});

describe("readStoredTimetable", () => {
  it("round-trips what the parser stores, through JSON like a Prisma Json column", () => {
    const t = paradasFixtures.line6Segment2.parsed;
    const row = JSON.parse(
      JSON.stringify({ stops: t.stops, trips: t.trips, unpaired: t.unpaired }),
    ) as { stops: unknown; trips: unknown; unpaired: unknown };
    expect(readStoredTimetable(row)).toEqual(t);
  });

  it("accepts a null unpaired column", () => {
    const t = paradasFixtures.line5Weekday.parsed;
    expect(
      readStoredTimetable({ stops: t.stops, trips: t.trips, unpaired: null }),
    ).toEqual(t);
  });

  it("rejects a row whose trips do not have one slot per stop", () => {
    expect(
      readStoredTimetable({
        stops: ["1", "2"],
        trips: [{ id: 1, times: [480] }],
        unpaired: null,
      }),
    ).toBeNull();
  });
});
