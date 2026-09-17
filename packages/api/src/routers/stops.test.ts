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

/**
 * `getByExternalIds` backs the saved-stops list, and both things it does
 * differently from every other query in this router are the kind that get
 * "cleaned up" by someone reading the file top to bottom.
 */
describe("stops.getByExternalIds", () => {
  function caller(
    findMany = vi.fn<(args: { where: Record<string, unknown> }) => Promise<never[]>>(
      () => Promise.resolve([]),
    ),
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
    expect(where?.where).toEqual({ deletedAt: undefined, externalId: { in: ["10211"] } });
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
  const findUnique = vi.fn((_args: Record<string, unknown>) => Promise.resolve(stop));
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
