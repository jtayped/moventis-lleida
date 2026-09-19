import { afterEach, describe, expect, it, vi } from "vitest";
import type { Schedules } from "@moventis/shared";
import type * as StopScheduleModule from "../lib/stop-schedule";

// Avoid constructing the real Prisma client (the router gets `db` via ctx instead).
vi.mock("@moventis/db", () => ({ db: {} }));
// Stub the only network call; keep the real normalizeText the buses router needs.
vi.mock("../lib/stop-schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof StopScheduleModule>();
  return { ...actual, getStopSchedule: vi.fn() };
});

import { createCaller } from "../root";
import { getStopSchedule } from "../lib/stop-schedule";
import { clearNextArrivalsCache } from "./stops";

/**
 * `getByExternalIds` backs the saved-stops list, and both things it does
 * differently from every other query in this router are the kind that get
 * "cleaned up" by someone reading the file top to bottom.
 */
describe("stops.getByExternalIds", () => {
  function caller(
    findMany = vi.fn<
      (args: { where: Record<string, unknown> }) => Promise<never[]>
    >(() => Promise.resolve([])),
  ) {
    const db = { stop: { findMany } };
    return {
      findMany,
      call: createCaller({ db, headers: new Headers() } as never).stops
        .getByExternalIds,
    };
  }

  it("does not filter out soft-deleted stops", async () => {
    const { findMany, call } = caller();
    await call({ externalIds: ["10211"] });

    // The one query here that must see deleted stops: a saved stop that leaves the
    // network still needs a pin, because the drawer that pin opens holds the only
    // control that can unsave it. A `deletedAt: null` here strands it forever.
    //
    // An *absent* `deletedAt` is the broken state, not the correct one: the client
    // extension in `packages/db/index.ts` spreads `{ deletedAt: null, ...where }`
    // into every `stop.findMany`, so omitting the key resolves to "live rows only".
    // Only an own key set to `undefined` spreads over the injected null and turns
    // the filter off — hence `toHaveProperty(..., undefined)`, which `toEqual`
    // alone would not catch (it ignores undefined-valued keys).
    const where = findMany.mock.calls[0]?.[0];
    expect(where?.where).toHaveProperty("deletedAt", undefined);
    expect(where?.where).toEqual({
      deletedAt: undefined,
      externalId: { in: ["10211"] },
    });
  });

  it("short-circuits an empty list without touching the database", async () => {
    const { findMany, call } = caller();
    await expect(call({ externalIds: [] })).resolves.toEqual([]);
    // `{ in: [] }` would be a pointless round trip on every load by anyone who has
    // never saved a stop — which is everyone, on their first visit.
    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects a list long enough to be a denial-of-service vector", async () => {
    const { call } = caller();
    const tooMany = Array.from({ length: 201 }, (_, i) => String(i));
    await expect(call({ externalIds: tooMany })).rejects.toThrow();
  });
});

const mockedSchedule = vi.mocked(getStopSchedule);

afterEach(() => vi.clearAllMocks());

/** One line's schedules, as `getStopSchedule` would return them for `code`. */
function scheduleFor(code: string, externalLineId: string): Schedules {
  return [
    {
      externalLineId,
      lineCode: code,
      lineName: "x",
      selected: false,
      incidencias: null,
      journeys: [],
    },
  ];
}

interface FakeStop {
  id: string;
  externalId: string;
  name: string;
  deletedAt: Date | null;
  routes: { code: string; externalId: string }[];
}

function stopCaller(stop: FakeStop | null) {
  const findUnique = vi.fn((_args: Record<string, unknown>) =>
    Promise.resolve(stop),
  );
  const db = { stop: { findUnique } };
  return {
    findUnique,
    call: createCaller({ db, headers: new Headers() } as never).stops.get,
  };
}

const twoRouteStop: FakeStop = {
  id: "s1",
  externalId: "10211",
  name: "Ronda",
  deletedAt: null,
  routes: [
    { code: "1", externalId: "101" },
    { code: "9", externalId: "137" },
  ],
};

describe("stops.get", () => {
  it("never probes a soft-deleted route", async () => {
    // Only `findMany` is wrapped by the `deletedAt: null` extension, so an included
    // relation arrives unfiltered — a withdrawn route would be fetched from Moventis
    // on every open of the stop, burning throttle slots on a line that no longer runs.
    mockedSchedule.mockImplementation((_stop, routeExt) =>
      Promise.resolve(scheduleFor(routeExt === "101" ? "1" : "9", routeExt)),
    );
    const { findUnique, call } = stopCaller(twoRouteStop);

    await call({ externalId: "10211" });

    expect(findUnique.mock.calls[0]?.[0]).toMatchObject({
      include: { routes: { where: { deletedAt: null } } },
    });
    expect(mockedSchedule).toHaveBeenCalledTimes(2);
  });

  it("names the routes whose live fetch failed", async () => {
    mockedSchedule.mockImplementation((_stop, routeExt) =>
      Promise.resolve(routeExt === "101" ? null : scheduleFor("9", "137")),
    );
    const { call } = stopCaller(twoRouteStop);

    const result = await call({ externalId: "10211" });

    // The timetable is short, not empty — without this the client shows line 9's
    // times as the whole truth and line 1 silently vanishes from the stop.
    expect(result.failedRoutes).toEqual(["1"]);
    expect(result.schedules).toHaveLength(1);
  });

  it("throws when every route's live fetch failed", async () => {
    mockedSchedule.mockResolvedValue(null);
    const { call } = stopCaller(twoRouteStop);

    await expect(call({ externalId: "10211" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Moventis unreachable",
    });
  });

  it("returns an empty timetable for a stop whose routes are all withdrawn", async () => {
    const { call } = stopCaller({ ...twoRouteStop, routes: [] });

    // This used to throw INTERNAL_SERVER_ERROR, which reads as a server fault for
    // what is just a stop off the network — and a saved one still has to open.
    await expect(call({ externalId: "10211" })).resolves.toMatchObject({
      schedules: [],
      failedRoutes: [],
    });
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("returns an empty timetable for a soft-deleted stop", async () => {
    const { call } = stopCaller({ ...twoRouteStop, deletedAt: new Date() });

    await expect(call({ externalId: "10211" })).resolves.toMatchObject({
      schedules: [],
      failedRoutes: [],
    });
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("is NOT_FOUND for an unknown externalId", async () => {
    const { call } = stopCaller(null);
    await expect(call({ externalId: "nope" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

/**
 * The map pin's next-bus pill. Everything here defends the one property that
 * makes it affordable: **one** upstream request per stop, where `get` spends
 * one per route.
 */
describe("stops.nextArrivals", () => {
  afterEach(() => clearNextArrivalsCache());

  interface ArrivalStop {
    id: string;
    externalId: string;
    name: string;
    deletedAt: Date | null;
    routes: {
      code: string;
      externalId: string;
      operatingDays: { date: Date }[];
    }[];
  }

  const stop: ArrivalStop = {
    id: "s1",
    externalId: "10219",
    name: "Onze de Setembre",
    deletedAt: null,
    routes: [
      { code: "2", externalId: "130", operatingDays: [{ date: new Date() }] },
      { code: "6", externalId: "134", operatingDays: [{ date: new Date() }] },
    ],
  };

  function caller(s: ArrivalStop | null) {
    const findUnique = vi.fn((_args: Record<string, unknown>) =>
      Promise.resolve(s),
    );
    const db = { stop: { findUnique } };
    return {
      findUnique,
      call: createCaller({ db, headers: new Headers() } as never).stops
        .nextArrivals,
    };
  }

  /** One line's journeys, each entry a number of seconds from now. */
  function line(code: string, ext: string, offsets: number[]): Schedules[0] {
    return {
      externalLineId: ext,
      lineCode: code,
      lineName: `line ${code}`,
      selected: false,
      incidencias: null,
      journeys: [
        {
          name: "dest",
          scheduledTimes: offsets.map((s) => ({
            arrivalTime: new Date(Date.now() + s * 1000),
            isRealTime: true,
            accessible: null,
          })),
        },
      ],
    };
  }

  it("spends one upstream request for the whole stop", async () => {
    mockedSchedule.mockResolvedValue([
      line("2", "130", [240]),
      line("6", "134", [60]),
    ]);
    const { call } = caller(stop);

    const result = await call({ externalId: "10219" });

    // `GetTiemposParada` answers with every line at the stop whatever route it
    // is asked about, so asking once is the whole budget of this feature. A
    // second call here is 2x the throttle cost per visible pin — with 15 pins
    // that is the difference between 15 and 30 requests a minute.
    expect(mockedSchedule).toHaveBeenCalledTimes(1);
    expect(result.lines.map((l) => l.lineCode)).toEqual(["6", "2"]);
  });

  it("reports the soonest future arrival of each line, soonest line first", async () => {
    mockedSchedule.mockResolvedValue([
      line("2", "130", [600, 180, 900]),
      line("6", "134", [420]),
    ]);
    const { call } = caller(stop);

    const result = await call({ externalId: "10219" });

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.lineCode).toBe("2");
    expect(result.lines[1]?.lineCode).toBe("6");
  });

  it("drops arrivals that have already passed", async () => {
    mockedSchedule.mockResolvedValue([line("2", "130", [-120, 300])]);
    const { call } = caller(stop);

    const result = await call({ externalId: "10219" });

    // A bus that left is not the next bus. Taking the list's first entry
    // blindly would pin a negative countdown to the marker.
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.arrivalTime.getTime()).toBeGreaterThan(Date.now());
  });

  it("omits a line whose every arrival has passed", async () => {
    mockedSchedule.mockResolvedValue([
      line("2", "130", [-300]),
      line("6", "134", [120]),
    ]);
    const { call } = caller(stop);

    await expect(call({ externalId: "10219" })).resolves.toMatchObject({
      lines: [{ lineCode: "6" }],
    });
  });

  it("ignores lines the stop does not serve", async () => {
    mockedSchedule.mockResolvedValue([
      line("2", "130", [300]),
      // Moventis answers with lines from every city it operates in; Palma de
      // Mallorca's 107 turns up in Lleida responses and is not at this stop.
      line("107", "9107", [30]),
    ]);
    const { call } = caller(stop);

    await expect(call({ externalId: "10219" })).resolves.toMatchObject({
      lines: [{ lineCode: "2" }],
    });
  });

  it("asks about a route that runs today when one does", async () => {
    mockedSchedule.mockResolvedValue([]);
    const { call } = caller({
      ...stop,
      routes: [
        { code: "10", externalId: "138", operatingDays: [] },
        { code: "2", externalId: "130", operatingDays: [{ date: new Date() }] },
      ],
    });

    await call({ externalId: "10219" });

    // Line 10 is dormant for the season; asking about its id can come back as
    // the `{"idLinea":"N"}` sentinel, which parses to nothing — and the stop
    // would report no buses although line 2 is running past it.
    // `"low"` is part of the contract, not incidental: this fetch must yield to
    // a drawer someone actually tapped.
    expect(mockedSchedule).toHaveBeenCalledWith("10219", "130", "low");
  });

  it("never probes a soft-deleted route", async () => {
    mockedSchedule.mockResolvedValue([]);
    const { findUnique, call } = caller(stop);

    await call({ externalId: "10219" });

    expect(findUnique.mock.calls[0]?.[0]).toMatchObject({
      include: { routes: { where: { deletedAt: null } } },
    });
  });

  it("says nothing, rather than failing, for a soft-deleted stop", async () => {
    const { call } = caller({ ...stop, deletedAt: new Date() });

    await expect(call({ externalId: "10219" })).resolves.toEqual({
      externalId: "10219",
      lines: [],
    });
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("says nothing for a stop whose routes are all withdrawn", async () => {
    const { call } = caller({ ...stop, routes: [] });

    await expect(call({ externalId: "10219" })).resolves.toEqual({
      externalId: "10219",
      lines: [],
    });
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it("throws when the live fetch is unavailable", async () => {
    mockedSchedule.mockResolvedValue(null);
    const { call } = caller(stop);

    // An outage must not reach a pin as "no bus is coming". The client renders
    // no pill for a rejected query, which is honest; an empty `lines` would be
    // a claim the server cannot support.
    await expect(call({ externalId: "10219" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Moventis unreachable",
    });
  });

  it("is NOT_FOUND for an unknown externalId", async () => {
    const { call } = caller(null);
    await expect(call({ externalId: "nope" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("shares one upstream request between callers asking about the same stop", async () => {
    mockedSchedule.mockResolvedValue([line("2", "130", [300])]);
    const { call } = caller(stop);

    await Promise.all([
      call({ externalId: "10219" }),
      call({ externalId: "10219" }),
    ]);

    // Every viewer with this stop in frame refetches on their own 60 s timer.
    // Without the shared entry the request count scales with the audience, on a
    // FIFO queue the stop drawer is also waiting in.
    expect(mockedSchedule).toHaveBeenCalledTimes(1);
  });
});
