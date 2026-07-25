import { describe, expect, it, vi } from "vitest";

// Avoid constructing the real Prisma client (the router gets `db` via ctx instead).
vi.mock("@moventis/db", () => ({ db: {} }));

import { createCaller } from "../root";

/**
 * `getByExternalIds` backs the saved-stops list, and both things it does
 * differently from every other query in this router are the kind that get
 * "cleaned up" by someone reading the file top to bottom.
 */
describe("stops.getByExternalIds", () => {
  function caller(findMany = vi.fn(() => Promise.resolve([]))) {
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
    const where = findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(where.where).not.toHaveProperty("deletedAt");
    expect(where.where).toEqual({ externalId: { in: ["10211"] } });
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
