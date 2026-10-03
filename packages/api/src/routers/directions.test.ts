import { afterEach, describe, expect, it, vi } from "vitest";
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
import { clearLiveDepartureCache } from "./directions";

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
  const findFirst = vi.fn().mockResolvedValue({ id: "r5", externalId: "133" });
  return {
    stop: { findMany: vi.fn().mockResolvedValue(stops) },
    route: {
      findFirst,
      findMany: vi.fn().mockResolvedValue([
        {
          id: "r5",
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

afterEach(() => {
  vi.clearAllMocks();
  clearNetworkCache();
  clearLiveDepartureCache();
});

describe("directions.plan", () => {
  it(
    "plans line 5 end to end from the stored timetable, in Lleida time",
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
      });
      expect(first.arriveAt.getTime()).toBeLessThanOrEqual(
        new Date("2026-10-05T05:17:00Z").getTime(),
      );
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

describe("directions.liveDeparture", () => {
  const listing = (times: { at: string; real: boolean }[]): Schedules => [
    {
      externalLineId: "133",
      lineCode: "5",
      lineName: "x",
      selected: true,
      incidencias: null,
      journeys: [
        {
          name: "ESTACIO D'AUTOBUSOS - ARNAU DE VILANOVA".toLowerCase(),
          scheduledTimes: times.map((t) => ({
            arrivalTime: new Date(t.at),
            isRealTime: t.real,
            accessible: null,
          })),
        },
      ],
    },
  ];

  it(
    "returns the live prediction aligned with the planned departure",
    at("2026-10-05T04:40:00Z", async () => {
      // 06:45 is running 2 min late; 07:08 still shows its timetable time.
      mockedSchedule.mockResolvedValue(
        listing([
          { at: "2026-10-05T04:47:00Z", real: true },
          { at: "2026-10-05T05:08:00Z", real: false },
        ]),
      );
      const api = caller(fakeDb());
      const input = {
        stopExternalId: "10244",
        lineCode: "5",
        headsign: HEADSIGN,
      };
      expect(
        await api.liveDeparture({
          ...input,
          scheduledAt: new Date("2026-10-05T04:45:00Z"),
        }),
      ).toEqual({
        predictedAt: new Date("2026-10-05T04:47:00Z"),
        isRealTime: true,
      });
      expect(
        await api.liveDeparture({
          ...input,
          scheduledAt: new Date("2026-10-05T05:08:00Z"),
        }),
      ).toEqual({
        predictedAt: new Date("2026-10-05T05:08:00Z"),
        isRealTime: false,
      });
      // One upstream request served both cards, through the high lane.
      expect(mockedSchedule).toHaveBeenCalledTimes(1);
      expect(mockedSchedule).toHaveBeenCalledWith("10244", "133", "high");
    }),
  );

  it(
    "answers null, not an error, when the stop's listing is unavailable",
    at("2026-10-05T04:40:00Z", async () => {
      mockedSchedule.mockResolvedValue(null);
      expect(
        await caller(fakeDb()).liveDeparture({
          stopExternalId: "10244",
          lineCode: "5",
          headsign: HEADSIGN,
          scheduledAt: new Date("2026-10-05T04:45:00Z"),
        }),
      ).toBeNull();
    }),
  );
});
