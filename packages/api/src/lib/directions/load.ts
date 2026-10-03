import { readStoredTimetable } from "@moventis/shared";
import type { createTRPCContext } from "../../trpc";
import { toGeometry } from "../probe";
import { SettleCache } from "../settle-cache";
import { buildNetwork, type Network, type NetworkTimetable } from "./network";

type Db = ReturnType<typeof createTRPCContext>["db"];

/**
 * How long a built network is reused. The scraper rewrites timetables once a
 * night, so this only bounds how long a fresh sync takes to show; building is
 * one query and a few milliseconds.
 */
const NETWORK_TTL_MS = 10 * 60_000;

/** Today, plus a request planned for tomorrow or after midnight, with room to spare. */
const networks = new SettleCache<Network>(NETWORK_TTL_MS, 4);

/** Test hook: the module-level cache would otherwise leak between cases. */
export function clearNetworkCache(): void {
  networks.clear();
}

/** The network for one Lleida service date (`YYYY-MM-DD`). */
export function getNetwork(db: Db, serviceDate: string): Promise<Network> {
  return networks.get(serviceDate, () => loadNetwork(db, serviceDate));
}

async function loadNetwork(db: Db, serviceDate: string): Promise<Network> {
  // `@db.Date` columns are stored as midnight UTC of the Lleida date.
  const day = new Date(`${serviceDate}T00:00:00Z`);
  const dayBefore = new Date(day.getTime() - 24 * 60 * 60 * 1000);

  const [stops, routes, rows] = await Promise.all([
    db.stop.findMany({
      select: { externalId: true, name: true, latitude: true, longitude: true },
    }),
    db.route.findMany({
      select: {
        id: true,
        externalId: true,
        code: true,
        color: true,
        name: true,
        operatingDays: { where: { date: day }, select: { date: true } },
        variants: {
          select: {
            id: true,
            description: true,
            trayectoIds: true,
            geometry: true,
          },
        },
      },
    }),
    db.timetable.findMany({
      where: { date: { in: [day, dayBefore] }, route: { deletedAt: null } },
      select: {
        routeId: true,
        trayectoId: true,
        date: true,
        stops: true,
        trips: true,
        unpaired: true,
      },
    }),
  ]);

  const timetables: NetworkTimetable[] = [];
  for (const row of rows) {
    const timetable = readStoredTimetable(row);
    if (!timetable) {
      console.warn(
        `[directions] skipping unreadable timetable ${row.routeId}/${row.trayectoId}`,
      );
      continue;
    }
    timetables.push({
      routeId: row.routeId,
      trayectoId: row.trayectoId,
      dayOffset: row.date.getTime() === day.getTime() ? 0 : -1,
      timetable,
    });
  }

  return buildNetwork({
    stops: stops.map((s) => ({
      externalId: s.externalId,
      name: s.name,
      lat: s.latitude,
      lng: s.longitude,
    })),
    lines: routes.map((r) => ({
      routeId: r.id,
      externalId: r.externalId,
      code: r.code,
      color: r.color,
      name: r.name,
      runsOnServiceDate: r.operatingDays.length > 0,
    })),
    variants: routes.flatMap((r) =>
      r.variants.map((v) => ({
        id: v.id,
        routeId: r.id,
        description: v.description,
        trayectoIds: v.trayectoIds,
        geometry: toGeometry(v.geometry),
      })),
    ),
    timetables,
  });
}
