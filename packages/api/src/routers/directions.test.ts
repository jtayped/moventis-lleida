import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Schedules } from "@moventis/shared";
import { paradasFixtures } from "@moventis/shared/fixtures";
import type * as StopScheduleModule from "../lib/stop-schedule";

// Avoid constructing the real Prisma client (the router gets `db` via ctx instead).
vi.mock("@moventis/db", () => ({ db: {} }));
// Stub the only network call; keep the real normalizeText the router relies on.
vi.mock("../lib/stop-schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof StopScheduleModule>();
  return { ...actual, getStopSchedule: vi.fn() };
});

import { createCaller } from "../root";
import { getStopSchedule } from "../lib/stop-schedule";
import { clearNetworkCache } from "../lib/directions/load";
import { stopsFromParadas, uniqueStops } from "../lib/directions/testing";
import { clearStopBoards } from "../lib/stop-boards";

const mockedSchedule = vi.mocked(getStopSchedule);

const line5 = paradasFixtures.line5Weekday;
const SERVICE_DAY = new Date("2026-10-05T00:00:00Z");
const HEADSIGN = "estacio d'autobusos - arnau de vilanova";

const stops = uniqueStops(stopsFromParadas(line5.raw)).map((s) => ({
  externalId: s.externalId,
  name: s.name,
  latitude: s.lat,
  longitude: s.lng,
}));
const stop = (id: string) => {
  const s = stops.find((x) => x.externalId === id)!;
  return { lat: s.latitude, lng: s.longitude };
};

function fakeDb(rows = true) {
  return {
    stop: { findMany: vi.fn().mockResolvedValue(stops) },
    route: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "r5",
          externalId: "133",
          code: "5",
          color: "#088F1A",
          name: "5",
          operatingDays: [{ date: SERVICE_DAY }],
          variants: [
            {
              id: "v5",
              description: HEADSIGN,
              trayectoIds: [13],
              geometry: null,
            },
          ],
        },
      ]),
    },
    timetable: {
      findMany: vi.fn().mockResolvedValue(
        rows
          ? [
              {
                routeId: "r5",
                trayectoId: 13,
                date: SERVICE_DAY,
                stops: line5.parsed.stops,
                trips: line5.parsed.trips,
                unpaired: null,
              },
            ]
          : [],
      ),
    },
  };
}

const caller = (db: ReturnType<typeof fakeDb>) =>
  createCaller({ db, headers: new Headers() } as never).directions;

/**
 * Only `Date` is faked, never the timers: `publicProcedure` runs the t3
 * artificial-latency middleware, which awaits a real `setTimeout`.
 */
function at(iso: string, fn: () => Promise<void>) {
  return async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
    try {
      await fn();
    } finally {
      vi.useRealTimers();
    }
  };
}

beforeEach(() => {
  // Moventis unreachable unless a case says otherwise.
  mockedSchedule.mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
  clearNetworkCache();
  clearStopBoards();
});

/** What Moventis lists for line 5 towards Arnau de Vilanova at one stop. */
const listing = (times: { at: string; real: boolean }[]): Schedules => [
  {
    externalLineId: "133",
    lineCode: "5",
    lineName: "x",
    selected: true,
    incidencias: null,
    journeys: [
      {
        name: "ESTACIÓ D'AUTOBUSOS - ARNAU DE VILANOVA".toLowerCase(),
        scheduledTimes: times.map((t) => ({
          arrivalTime: new Date(t.at),
          isRealTime: t.real,
          accessible: null,
        })),
      },
    ],
  },
];

/** Answer each stop with its own listing; any other stop lists nothing. */
function boards(byStop: Record<string, { at: string; real: boolean }[]>) {
  mockedSchedule.mockImplementation((stop) =>
    Promise.resolve(listing(byStop[stop] ?? [])),
  );
}

describe("directions.plan", () => {
  it(
    "falls back to the stored timetable, in Lleida time, when Moventis is unreachable",
    // 06:30 CEST.
    at("2026-10-05T04:30:00Z", async () => {
      const db = fakeDb();
      const plan = await caller(db).plan({
        from: stop("10244"),
        to: stop("13056"),
      });
      expect(plan.serviceDate).toBe("2026-10-05");
      expect(plan.missingLines).toEqual([]);
      const first = plan.itineraries[0]!;
      const bus = first.legs.find((l) => l.kind === "bus");
      expect(bus).toMatchObject({
        kind: "bus",
        lineCode: "5",
        headsign: HEADSIGN,
        from: { externalId: "10244" },
        // 06:45 CEST, the first departure of the day.
        departAt: new Date("2026-10-05T04:45:00Z"),
        live: false,
      });
      expect(first.arriveAt.getTime()).toBeLessThanOrEqual(
        new Date("2026-10-05T05:17:00Z").getTime(),
      );
      // It asked, through the batch lane, before falling back.
      expect(mockedSchedule).toHaveBeenCalledWith("10244", "133", "batch");
    }),
  );

  it(
    "times the bus from the boarding and alighting stops' live listings",
    at("2026-10-05T04:40:00Z", async () => {
      // The 06:45 is running 3 min late, and its own listing at Arnau de
      // Vilanova says it gets there 4 min late.
      boards({
        "10244": [{ at: "2026-10-05T04:48:00Z", real: true }],
        "13056": [{ at: "2026-10-05T05:21:00Z", real: true }],
      });
      const plan = await caller(fakeDb()).plan({
        from: stop("10244"),
        to: stop("13056"),
      });
      const bus = plan.itineraries[0]!.legs.find((l) => l.kind === "bus");
      expect(bus).toMatchObject({
        from: { externalId: "10244" },
        to: { externalId: "13056" },
        departAt: new Date("2026-10-05T04:48:00Z"),
        arriveAt: new Date("2026-10-05T05:21:00Z"),
        live: true,
      });
      expect(plan.itineraries[0]!.arriveAt).toEqual(bus!.arriveAt);
    }),
  );

  it(
    "carries the boarding delay forward when the alighting stop does not list the bus",
    at("2026-10-05T04:40:00Z", async () => {
      const ask = () =>
        caller(fakeDb()).plan({ from: stop("10244"), to: stop("13056") });
      const firstBus = (plan: Awaited<ReturnType<typeof ask>>) => {
        const bus = plan.itineraries[0]!.legs.find((l) => l.kind === "bus");
        if (bus?.kind !== "bus") throw new Error("no bus leg");
        return bus;
      };

      const scheduled = firstBus(await ask());
      clearStopBoards();
      boards({ "10244": [{ at: "2026-10-05T04:48:00Z", real: true }] });
      const live = firstBus(await ask());

      // The same 06:45, three minutes late at both ends.
      expect(live.live).toBe(true);
      expect(live.departAt.getTime() - scheduled.departAt.getTime()).toBe(
        3 * 60_000,
      );
      expect(live.arriveAt.getTime() - scheduled.arriveAt.getTime()).toBe(
        3 * 60_000,
      );
    }),
  );

  it(
    "does not offer a bus the stop has stopped listing",
    at("2026-10-05T04:40:00Z", async () => {
      // The listing jumps straight to the 07:08: the 06:45 is not coming.
      boards({ "10244": [{ at: "2026-10-05T05:09:00Z", real: true }] });
      const plan = await caller(fakeDb()).plan({
        from: stop("10244"),
        to: stop("13056"),
      });
      const departures = plan.itineraries.map((i) => {
        const bus = i.legs.find((l) => l.kind === "bus")!;
        return bus.kind === "bus" && bus.departAt.toISOString();
      });
      expect(departures).not.toContain("2026-10-05T04:45:00.000Z");
      expect(departures[0]).toBe("2026-10-05T05:09:00.000Z");
    }),
  );

  it(
    "leaves a plan more than an hour ahead to the timetable, without asking",
    at("2026-10-05T04:40:00Z", async () => {
      const plan = await caller(fakeDb()).plan({
        from: stop("10244"),
        to: stop("13056"),
        departAt: new Date("2026-10-05T06:40:00Z"),
      });
      expect(plan.itineraries.length).toBeGreaterThan(0);
      expect(mockedSchedule).not.toHaveBeenCalled();
    }),
  );

  it(
    "refuses to answer with an empty city when the day has no timetable",
    at("2026-10-05T04:30:00Z", async () => {
      await expect(
        caller(fakeDb(false)).plan({ from: stop("10244"), to: stop("13056") }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    }),
  );

  it(
    "rejects a departure in the past and one beyond the stored week",
    at("2026-10-05T04:30:00Z", async () => {
      const api = caller(fakeDb());
      await expect(
        api.plan({
          from: stop("10244"),
          to: stop("13056"),
          departAt: new Date("2026-10-05T03:00:00Z"),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        api.plan({
          from: stop("10244"),
          to: stop("13056"),
          departAt: new Date("2026-10-20T03:00:00Z"),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }),
  );

  it("rejects points outside the network's area", async () => {
    await expect(
      caller(fakeDb()).plan({
        from: { lat: 40.4, lng: -3.7 },
        to: stop("13056"),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
