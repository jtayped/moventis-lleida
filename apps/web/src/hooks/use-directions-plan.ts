"use client";

import { useEffect, useRef, useState } from "react";
import {
  distanceMeters,
  RESTRICTED_BOUNDS,
  type DirectionsPoint,
} from "@moventis/shared";

import { useDirections, type DirectionsPlace } from "@/context/directions";
import { track } from "@/lib/analytics";
import { api } from "@/trpc/react";

/**
 * "My location" is re-planned only once the device has moved this far. Every
 * GPS tick is a new position, and each one would otherwise be a new query key:
 * a fresh request and a loading flash every few metres while someone walks to
 * the stop the plan already told them about.
 */
const LOCATION_REPLAN_M = 150;

/** "Leave now" plans age; a minute is the timetable's own resolution. */
const NOW_REFRESH_MS = 60_000;

const inArea = (p: DirectionsPoint) =>
  p.lat >= RESTRICTED_BOUNDS.south &&
  p.lat <= RESTRICTED_BOUNDS.north &&
  p.lng >= RESTRICTED_BOUNDS.west &&
  p.lng <= RESTRICTED_BOUNDS.east;

export type PlanBlocker =
  /** A field is empty. */
  | "incomplete"
  /** "My location" is chosen and the device has not answered yet. */
  | "locating"
  /** "My location" is chosen and the device will not or cannot say. */
  | "no-location"
  /** "My location" is outside the network's area. */
  | "out-of-area"
  /** Both ends are the same place. */
  | "same-place";

/**
 * The one `directions.plan` query, resolved from the panel's two places.
 *
 * Called once, by the map shell, and handed to the panel and the map layer as
 * props, so the list and the drawn route are always the same answer.
 */
export function useDirectionsPlan(
  position: GeolocationCoordinates | null,
  locationFailed: boolean,
) {
  const { isOpen, from, to, departAt } = useDirections();

  const [anchor, setAnchor] = useState<DirectionsPoint | null>(null);
  useEffect(() => {
    if (!position) return;
    const here = { lat: position.latitude, lng: position.longitude };
    setAnchor((held) =>
      held &&
      distanceMeters([held.lng, held.lat], [here.lng, here.lat]) <
        LOCATION_REPLAN_M
        ? held
        : here,
    );
  }, [position]);

  const resolve = (place: DirectionsPlace | null): DirectionsPoint | null => {
    if (!place) return null;
    if (place.kind === "location") return anchor;
    return { lat: place.lat, lng: place.lng };
  };
  const fromPoint = resolve(from);
  const toPoint = resolve(to);

  const usesLocation = from?.kind === "location" || to?.kind === "location";
  let blocker: PlanBlocker | null = null;
  if (!from || !to) blocker = "incomplete";
  else if (usesLocation && !anchor)
    blocker = locationFailed ? "no-location" : "locating";
  else if (usesLocation && anchor && !inArea(anchor)) blocker = "out-of-area";
  else if (
    fromPoint &&
    toPoint &&
    distanceMeters([fromPoint.lng, fromPoint.lat], [toPoint.lng, toPoint.lat]) <
      30
  )
    blocker = "same-place";

  const enabled = isOpen && blocker === null && !!fromPoint && !!toPoint;
  const query = api.directions.plan.useQuery(
    {
      from: fromPoint ?? { lat: 0, lng: 0 },
      to: toPoint ?? { lat: 0, lng: 0 },
      departAt: departAt ?? undefined,
    },
    {
      enabled,
      staleTime: 30_000,
      refetchInterval: departAt ? false : NOW_REFRESH_MS,
      retry: 1,
    },
  );

  // One event per question answered, not per background refresh: the key is
  // what was asked, since the answer's own ids move on as buses leave.
  const question =
    fromPoint && toPoint
      ? `${fromPoint.lat},${fromPoint.lng}|${toPoint.lat},${toPoint.lng}|${departAt?.getTime() ?? "now"}`
      : null;
  const answered = enabled && query.data ? question : null;
  const resultCount = query.data?.itineraries.length ?? 0;
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!answered || reported.current === answered) return;
    reported.current = answered;
    track("directions planned", { results: resultCount });
  }, [answered, resultCount]);

  return {
    query: enabled ? query : null,
    blocker,
    fromPoint,
    toPoint,
  };
}

export type DirectionsPlanState = ReturnType<typeof useDirectionsPlan>;
