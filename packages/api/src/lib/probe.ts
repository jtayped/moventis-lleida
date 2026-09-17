import {
  type LngLat,
  type Schedules,
  flattenPaths,
  routePathSchema,
} from "@moventis/shared";
import type { ProbeResult } from "./bus-locator";
import { SAME_TRIP_SLACK_S } from "./bus-locator";

/**
 * Reduce a stop's full schedule to per-journey real-time ETAs (seconds) for one
 * line. Drops scheduled (`real:"N"`) arrivals — only GPS-tracked buses are
 * locatable — and anything more than {@link SAME_TRIP_SLACK_S} in the past.
 *
 * `now` is the **one reference instant for the whole locate call**, not this
 * probe's fetch time: the parsed `arrivalTime`s are already absolute, so
 * expressing every stop's ETAs against the same instant is what lets two
 * probes fetched seconds apart be compared to the second. (Rebasing each probe
 * on its own fetch time — what this used to do — shifted the lists against
 * each other by the throttle delay.) A "0 min 00 s" arrival fetched a few
 * seconds after `now` comes out slightly negative and is kept on purpose: it is
 * the bus standing at the stop.
 *
 * A journey present in the response but without a live arrival maps to an
 * empty list, so the locator can tell "lists no bus" from "does not list this
 * journey at all" (absent key), which it treats as unavailable.
 */
export function toProbeResult(
  schedules: Schedules,
  routeExternalId: string,
  now: number,
): ProbeResult {
  const map: ProbeResult = new Map();
  const line = schedules.find((s) => s.externalLineId === routeExternalId);
  if (!line) return map;

  const cutoff = now - SAME_TRIP_SLACK_S * 1000;
  for (const journey of line.journeys) {
    const etas = journey.scheduledTimes
      .filter((t) => t.isRealTime && t.arrivalTime.getTime() >= cutoff)
      .map((t) => (t.arrivalTime.getTime() - now) / 1000)
      .sort((a, b) => a - b);
    map.set(journey.name, etas);
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
