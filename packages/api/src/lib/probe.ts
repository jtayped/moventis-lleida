import {
  type LngLat,
  type Schedules,
  flattenPaths,
  routePathSchema,
} from "@moventis/shared";
import type { ProbeResult } from "./bus-locator";

/**
 * Reduce a stop's full schedule to per-journey real-time ETAs (seconds) for one
 * line. Drops scheduled (real:"N") arrivals and anything already in the past —
 * only GPS-tracked buses are locatable (hard constraint #2). ETAs are sorted
 * ascending. `now` is injected so the cutoff is deterministic in tests.
 */
export function toProbeResult(
  schedules: Schedules,
  routeExternalId: string,
  now: number,
): ProbeResult {
  const map: ProbeResult = new Map();
  const line = schedules.find((s) => s.externalLineId === routeExternalId);
  if (!line) return map;

  for (const journey of line.journeys) {
    const etas = journey.scheduledTimes
      .filter((t) => t.isRealTime && t.arrivalTime.getTime() > now)
      .map((t) => (t.arrivalTime.getTime() - now) / 1000)
      .sort((a, b) => a - b);
    if (etas.length) map.set(journey.name, etas);
  }
  return map;
}

/** Parse a variant's `{ paths }` geometry JSON into one flat polyline, or null. */
export function toGeometry(geometry: unknown): LngLat[] | null {
  const parsed = routePathSchema.safeParse(geometry);
  if (!parsed.success || parsed.data.paths.length === 0) return null;
  const flat = flattenPaths(parsed.data.paths);
  return flat.length >= 2 ? flat : null;
}
