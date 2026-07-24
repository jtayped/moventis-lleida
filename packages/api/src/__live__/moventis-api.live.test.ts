import { afterAll, beforeAll, describe, expect, it } from "vitest";
import axios from "axios";
import { apiScheduleSchema } from "@moventis/shared";
import { db } from "@moventis/db";
import { getStopSchedule } from "../lib/stop-schedule";

/**
 * LIVE CONTRACT CANARY — opt-in, network + DB dependent. Run with `pnpm test:live`
 * (needs DATABASE_URL and internet); excluded from the default `pnpm test`.
 *
 * It asserts only that the *live* Moventis API still matches `apiScheduleSchema` —
 * never specific arrival values, which change with the time of day. The stop/route
 * pair is discovered from the DB at runtime, so the canary keeps working as stops
 * and routes are added or removed. When it fails, the contract changed: fix the
 * schema/parser (and re-capture fixtures) before suspecting the locator.
 */

const TIMEOUT = 15_000;

let stopExt: string | undefined;
let routeExt: string | undefined;

beforeAll(async () => {
  const route = await db.route.findFirst({
    where: { deletedAt: null },
    select: {
      externalId: true,
      variants: {
        take: 1,
        select: {
          stops: {
            orderBy: { sequence: "asc" },
            take: 1,
            select: { stop: { select: { externalId: true } } },
          },
        },
      },
    },
  });
  routeExt = route?.externalId;
  stopExt = route?.variants[0]?.stops[0]?.stop.externalId;
});

afterAll(async () => {
  await db.$disconnect();
});

function filterSentinel(data: unknown): unknown {
  return Array.isArray(data)
    ? data.filter(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as Record<string, unknown>).idLinea !== "N",
      )
    : data;
}

describe("Moventis live API contract", () => {
  it(
    "still returns the response shape apiScheduleSchema expects",
    async () => {
      expect(routeExt, "no non-deleted route with stops in the DB to probe").toBeTruthy();
      expect(stopExt, "discovered route has no stops to probe").toBeTruthy();

      const url = `https://www.moventis.es/api/json/GetTiemposParada/es/${stopExt}/${routeExt}/0`;
      const { data } = await axios.get<unknown>(url);

      const result = apiScheduleSchema.safeParse(filterSentinel(data));
      if (!result.success) {
        // Surface the drift so the schema/fixtures can be updated.
        console.error("Live Moventis payload (first 2kB):", JSON.stringify(data).slice(0, 2000));
        console.error("Zod issues:", JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success, "live API no longer matches apiScheduleSchema").toBe(true);
    },
    TIMEOUT,
  );

  it(
    "getStopSchedule consumes the live response without throwing",
    async () => {
      const schedules = await getStopSchedule(stopExt!, routeExt!);
      // null is acceptable (a transient network blip), but a shape change would throw.
      expect(schedules === null || Array.isArray(schedules)).toBe(true);
    },
    TIMEOUT,
  );
});
