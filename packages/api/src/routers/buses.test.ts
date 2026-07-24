import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lines, Schedules } from "@moventis/shared";

// Avoid constructing the real Prisma client (the router gets `db` via ctx instead).
vi.mock("@moventis/db", () => ({ db: {} }));
// Stub the only network call; keep the real normalizeText the router relies on.
vi.mock("../lib/stop-schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/stop-schedule")>();
  return { ...actual, getStopSchedule: vi.fn() };
});

import { createCaller } from "../root";
import { getStopSchedule } from "../lib/stop-schedule";

const mockedSchedule = vi.mocked(getStopSchedule);

const ROUTE_EXT = "R";
const JOURNEY = "dest";

/** Build a 6-stop variant `e0..e5` (or a renamed/journeyed copy). */
function variantStops(prefix = "e") {
  return Array.from({ length: 6 }, (_, i) => ({
    stop: {
      id: `${prefix}id${i}`,
      externalId: `${prefix}${i}`,
      latitude: 41.6,
      longitude: 0.62 + i * 0.003,
    },
  }));
}

/** A schedule listing the given journeys, each with two near real-time arrivals. */
function realtimeWorld(journeys: string[]): Schedules {
  return [
    {
      externalLineId: ROUTE_EXT,
      lineCode: "9" as Lines,
      lineName: "x",
      selected: false,
      incidencias: null,
      journeys: journeys.map((name) => ({
        name,
        scheduledTimes: [60, 120].map((s) => ({
          isRealTime: true,
          arrivalTime: new Date(Date.now() + s * 1000),
          accessible: null,
        })),
      })),
    },
  ];
}

/** A schedule with only scheduled (real:"N") arrivals — the night case. */
function nightWorld(): Schedules {
  return [
    {
      externalLineId: ROUTE_EXT,
      lineCode: "9" as Lines,
      lineName: "x",
      selected: false,
      incidencias: null,
      journeys: [
        {
          name: JOURNEY,
          scheduledTimes: [
            { isRealTime: false, arrivalTime: new Date(Date.now() + 3_600_000), accessible: null },
          ],
        },
      ],
    },
  ];
}

const singleVariantRoute = {
  externalId: ROUTE_EXT,
  variants: [{ direction: "I", description: JOURNEY, geometry: null, stops: variantStops() }],
};

interface FakeDb {
  route: { findFirst: ReturnType<typeof vi.fn> };
}

function makeDb(route: unknown = singleVariantRoute): FakeDb {
  return { route: { findFirst: vi.fn(() => Promise.resolve(route)) } };
}

function caller(db: FakeDb) {
  return createCaller({ db, headers: new Headers() } as never);
}

function byLine(db: FakeDb) {
  return caller(db).buses.byLine({ routeCode: "9" });
}

beforeEach(() => {
  // NB: a block body — returning the mock would register it as a teardown hook.
  mockedSchedule.mockImplementation(() => Promise.resolve(realtimeWorld([JOURNEY])));
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("buses.byLine", () => {
  it("locates the real-time buses and reports valid segments", async () => {
    const out = await byLine(makeDb());
    expect(out.length).toBeGreaterThan(0);
    for (const p of out) {
      expect(p.lineCode).toBe("9");
      expect(p.direction).toBe("I");
      expect(p.journeyName).toBe(JOURNEY);
      expect(p.segment.fromStopId).not.toBe(p.segment.toStopId);
      expect(p.fraction).toBeGreaterThanOrEqual(0);
      expect(p.fraction).toBeLessThanOrEqual(1);
    }
  });

  it("returns [] at night (only scheduled arrivals)", async () => {
    mockedSchedule.mockImplementation(() => Promise.resolve(nightWorld()));
    expect(await byLine(makeDb())).toEqual([]);
  });

  it("returns [] when the route is unknown", async () => {
    expect(await byLine(makeDb(null))).toEqual([]);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("returns [] when the upstream schedule is unavailable", async () => {
    mockedSchedule.mockResolvedValue(null);
    expect(await byLine(makeDb())).toEqual([]);
  });

  it("fetches a shared terminal only once (per-request cache)", async () => {
    // Two variants both terminate at stop `e5`; without the cache it would be
    // fetched twice. The shared terminal lists both journeys (failure mode #6).
    const shared = variantStops();
    const second = variantStops("a");
    second[second.length - 1] = shared[shared.length - 1]!; // share `e5`
    const route = {
      externalId: ROUTE_EXT,
      variants: [
        { direction: "I", description: JOURNEY, geometry: null, stops: shared },
        { direction: "V", description: "dest2", geometry: null, stops: second },
      ],
    };
    mockedSchedule.mockImplementation(() =>
      Promise.resolve(realtimeWorld([JOURNEY, "dest2"])),
    );

    await byLine(makeDb(route));

    const e5Calls = mockedSchedule.mock.calls.filter(([stopExt]) => stopExt === "e5");
    expect(e5Calls).toHaveLength(1);
  });
});
