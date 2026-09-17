import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lines, Schedules } from "@moventis/shared";
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
import { clearLineBusesCache } from "./buses";

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

function line(
  journeys: { name: string; etas: { s: number; live: boolean }[] }[],
): Schedules {
  return [
    {
      externalLineId: ROUTE_EXT,
      lineCode: "9" as Lines,
      lineName: "x",
      selected: false,
      incidencias: null,
      journeys: journeys.map((j) => ({
        name: j.name,
        scheduledTimes: j.etas.map(({ s, live }) => ({
          isRealTime: live,
          arrivalTime: new Date(Date.now() + s * 1000),
          accessible: null,
        })),
      })),
    },
  ];
}

/**
 * The lists a 6-stop variant publishes with one bus between stops 2 and 3
 * (30 s from stop 3) and one future departure 600 s out, 60 s per stop. The
 * journey is chosen by the stop id's prefix, so a second variant `a0..a4,e5`
 * publishes `dest2` and the shared terminal `e5` publishes both.
 */
function realtimeWorld(stopExternalId: string): Schedules {
  const index = Number(stopExternalId.slice(1));
  const lists = (name: string) => {
    const etas = [{ s: 600 + 60 * index, live: true }];
    if (index >= 3) etas.unshift({ s: 30 + 60 * (index - 3), live: true });
    return { name, etas };
  };
  if (stopExternalId.startsWith("a")) return line([lists("dest2")]);
  if (stopExternalId === "e5") return line([lists(JOURNEY), lists("dest2")]);
  return line([lists(JOURNEY)]);
}

/** A schedule with only scheduled (real:"N") arrivals — the night case. */
function nightWorld(): Schedules {
  return line([{ name: JOURNEY, etas: [{ s: 3600, live: false }] }]);
}

const singleVariantRoute = {
  externalId: ROUTE_EXT,
  variants: [
    {
      direction: "I",
      description: JOURNEY,
      geometry: null,
      stops: variantStops(),
    },
  ],
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
  clearLineBusesCache();
  // NB: a block body — returning the mock would register it as a teardown hook.
  mockedSchedule.mockImplementation((stopExternalId: string) =>
    Promise.resolve(realtimeWorld(stopExternalId)),
  );
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("buses.byLine", () => {
  it("locates the real-time bus between the stops that do and do not list it", async () => {
    const out = await byLine(makeDb());
    expect(out).toHaveLength(1);
    const [p] = out;
    expect(p!.lineCode).toBe("9");
    expect(p!.direction).toBe("I");
    expect(p!.journeyName).toBe(JOURNEY);
    expect(p!.segment).toEqual({ fromStopId: "eid2", toStopId: "eid3" });
    expect(p!.spanStops).toBe(1);
    expect(p!.confidence).toBe("high");
    expect(p!.fraction).toBeGreaterThanOrEqual(0);
    expect(p!.fraction).toBeLessThanOrEqual(1);
  });

  it("returns [] at night (only scheduled arrivals)", async () => {
    mockedSchedule.mockImplementation(() => Promise.resolve(nightWorld()));
    expect(await byLine(makeDb())).toEqual([]);
  });

  it("returns [] when the route is unknown", async () => {
    expect(await byLine(makeDb(null))).toEqual([]);
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("throws when every probe failed, rather than claiming no bus is running", async () => {
    // A failed probe and a line with no live buses both reduce to an empty map, so
    // resolving `[]` here made an outage indistinguishable from a quiet line — and
    // the drawer stated it as fact. Total failure has to reach the client as an error.
    mockedSchedule.mockResolvedValue(null);
    await expect(byLine(makeDb())).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Moventis unreachable",
    });
  });

  it("still returns what it located when only some probes failed", async () => {
    // Partial degradation is normal (one stop 500s, the rest answer); the line is
    // not down, so the positions that were recovered must still be delivered.
    mockedSchedule.mockImplementation((stopExternalId: string) =>
      Promise.resolve(
        stopExternalId === "e0" ? null : realtimeWorld(stopExternalId),
      ),
    );

    const out = await byLine(makeDb());

    expect(
      mockedSchedule.mock.calls.some(([stopExt]) => stopExt === "e0"),
    ).toBe(true);
    expect(out).toHaveLength(1);
    expect(out[0]!.segment).toEqual({ fromStopId: "eid2", toStopId: "eid3" });
  });

  it("fetches a shared terminal only once (per-request cache)", async () => {
    // Two variants both terminate at stop `e5`; without the cache it would be
    // fetched twice. The shared terminal lists both journeys.
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

    const out = await byLine(makeDb(route));

    const e5Calls = mockedSchedule.mock.calls.filter(
      ([stopExt]) => stopExt === "e5",
    );
    expect(e5Calls).toHaveLength(1);
    expect(out.map((p) => p.journeyName).sort()).toEqual([JOURNEY, "dest2"]);
  });

  it("shares one computation per line for a few seconds", async () => {
    const db = makeDb();
    const first = await byLine(db);
    const calls = mockedSchedule.mock.calls.length;
    const second = await byLine(db);
    expect(second).toEqual(first);
    expect(mockedSchedule.mock.calls.length).toBe(calls);
    expect(db.route.findFirst).toHaveBeenCalledTimes(1);

    clearLineBusesCache();
    await byLine(db);
    expect(mockedSchedule.mock.calls.length).toBeGreaterThan(calls);
  });

  it("does not keep a failure in the cache", async () => {
    mockedSchedule.mockResolvedValue(null);
    await expect(byLine(makeDb())).rejects.toBeTruthy();
    mockedSchedule.mockImplementation((stopExternalId: string) =>
      Promise.resolve(realtimeWorld(stopExternalId)),
    );
    expect(await byLine(makeDb())).toHaveLength(1);
  });
});
