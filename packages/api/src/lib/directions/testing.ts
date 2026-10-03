import type { StoredTimetable } from "@moventis/shared";
import {
  buildNetwork,
  type NetworkInput,
  type NetworkStop,
  type NetworkTimetable,
} from "./network";

/** Stops (with coordinates) as a raw `GetParadas` response lists them. */
export function stopsFromParadas(raw: unknown): NetworkStop[] {
  const rows = raw as {
    COD_PARADA: string;
    DESC_PARADA: string;
    LATITUD: number;
    LONGITUD: number;
  }[];
  return rows.map((r) => ({
    externalId: r.COD_PARADA.split("-")[0]!,
    name: r.DESC_PARADA.toLowerCase(),
    lat: r.LATITUD,
    lng: r.LONGITUD,
  }));
}

/** Unique by externalId, first wins. */
export function uniqueStops(stops: NetworkStop[]): NetworkStop[] {
  const seen = new Map<string, NetworkStop>();
  for (const s of stops) if (!seen.has(s.externalId)) seen.set(s.externalId, s);
  return [...seen.values()];
}

/**
 * A synthetic city on a straight east–west street at Lleida's latitude, stops
 * `spacingM` apart (far enough apart by default that no footpath joins them).
 */
export function streetStops(
  ids: string[],
  spacingM = 1000,
  lat = 41.6,
): NetworkStop[] {
  const degPerM = 1 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return ids.map((id, i) => ({
    externalId: id,
    name: `parada ${id}`,
    lat,
    lng: 0.6 + i * spacingM * degPerM,
  }));
}

export interface SyntheticLine {
  code: string;
  /** Stop externalIds in travel order. */
  stops: string[];
  /** One entry per trip: minutes at each stop (null = does not call). */
  trips: (number | null)[][];
}

/** A network of one-trayecto lines, each its own route and variant. */
export function syntheticNetwork(
  stops: NetworkStop[],
  lines: SyntheticLine[],
  extra: Partial<NetworkInput> = {},
) {
  const timetables: NetworkTimetable[] = lines.map((l) => ({
    routeId: `r${l.code}`,
    trayectoId: 1,
    dayOffset: 0,
    timetable: {
      stops: l.stops,
      trips: l.trips.map((times, i) => ({ id: i + 1, times })),
    } satisfies StoredTimetable,
  }));
  return buildNetwork({
    stops,
    lines: lines.map((l) => ({
      routeId: `r${l.code}`,
      code: l.code,
      color: "#000000",
      name: `línia ${l.code}`,
      runsOnServiceDate: true,
    })),
    variants: lines.map((l) => ({
      id: `v${l.code}`,
      routeId: `r${l.code}`,
      description: `cap a ${l.stops.at(-1)}`,
      trayectoIds: [1],
      geometry: null,
    })),
    timetables,
    ...extra,
  });
}

export const hm = (h: number, m: number) => (h * 60 + m) * 60;
