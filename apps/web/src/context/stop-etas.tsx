"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { api } from "@/trpc/react";
import { useBusFinder } from "@/context/buses";
import { useSettings } from "@/hooks/use-settings";
import { getZoomBucket } from "@/lib/zoom-buckets";
import { ETA_REFETCH_MS, MAX_ETA_STOPS } from "@/lib/stop-etas";

/** The one bus a pin names, already chosen out of everything due at the stop. */
export interface StopEta {
  lineCode: string;
  color: string;
  arrivalTime: Date;
}

const StopEtasContext = createContext<Map<string, StopEta>>(new Map());

/** The resolved next bus for each stop in frame; empty when the feature is off. */
export function useStopEtas(): Map<string, StopEta> {
  return useContext(StopEtasContext);
}

/**
 * Fetches the next bus for the stops currently in frame, once the map is zoomed
 * in far enough for a pin to have room to say so.
 *
 * Lives above the pins rather than inside `MapPinsRenderer` because that
 * component is mounted up to three times at once — selected stops, saved stops,
 * and the `?stop=` deep link — and each copy would otherwise keep its own camera
 * listener and pick its own capped set, spending the budget three times over on
 * a set no one chose.
 *
 * Must be rendered inside the `<Map>` (it reads the camera) and around the pin
 * renderers (they read the result).
 */
export function StopEtasProvider({ children }: { children: React.ReactNode }) {
  const map = useMap();
  const { stops, preferidesStops, selectedRoutes, routes } = useBusFinder();
  const { settings, hydrated } = useSettings();

  const [camera, setCamera] = useState<{
    zoom: number;
    bounds: google.maps.LatLngBounds;
  } | null>(null);

  useEffect(() => {
    if (!map) return;

    const read = () => {
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      if (zoom === undefined || !bounds) return;
      setCamera({ zoom, bounds });
    };

    // `idle` rather than `bounds_changed`: the latter fires continuously through
    // a drag, and every frame of a pan would rebuild the capped set and start a
    // fresh burst of requests for stops the user is still scrolling past.
    const listener = map.addListener("idle", read);
    read();

    return () => google.maps.event.removeListener(listener);
  }, [map]);

  const enabled =
    hydrated &&
    settings.stopEtas &&
    camera !== null &&
    getZoomBucket(camera.zoom) === "large";

  const visibleIds = useMemo(() => {
    if (!enabled || !camera) return [];

    const center = camera.bounds.getCenter();
    const seen = new Set<string>();
    const inFrame: { externalId: string; distance: number }[] = [];

    for (const stop of [...stops, ...preferidesStops]) {
      if (seen.has(stop.externalId)) continue;
      seen.add(stop.externalId);
      if (!camera.bounds.contains({ lat: stop.latitude, lng: stop.longitude }))
        continue;
      // Squared degrees: only ever compared with each other, so the cost of a
      // real distance buys nothing.
      const dLat = stop.latitude - center.lat();
      const dLng = stop.longitude - center.lng();
      inFrame.push({
        externalId: stop.externalId,
        distance: dLat * dLat + dLng * dLng,
      });
    }

    // Nearest the middle of the screen wins the budget — that is where someone
    // looking for a bus has pointed the map.
    return inFrame
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_ETA_STOPS)
      .map((s) => s.externalId);
  }, [enabled, camera, stops, preferidesStops]);

  // One query per stop, like `useLineBuses` does per line. The client's
  // `httpBatchStreamLink` sends them as a single HTTP request and streams each
  // result back as it settles, so the pills appear one at a time instead of all
  // at once — progressive loading with no streaming procedure of its own.
  const queries = api.useQueries((t) =>
    visibleIds.map((externalId) =>
      t.stops.nextArrivals(
        { externalId },
        {
          refetchInterval: ETA_REFETCH_MS,
          staleTime: ETA_REFETCH_MS - 15_000,
          refetchOnWindowFocus: false,
          // A stop that failed is a pin with no pill, and the next interval tick
          // asks again anyway. Retrying now would only lengthen the queue that
          // is the likeliest reason it failed.
          retry: false,
        },
      ),
    ),
  );

  const colorByLine = useMemo(
    () => new Map(routes.map((r) => [r.code, r.color])),
    [routes],
  );

  const etas = useMemo(() => {
    const selected = new Set<string>(selectedRoutes);
    const resolved = new Map<string, StopEta>();

    queries.forEach((query, i) => {
      const externalId = visibleIds[i];
      if (!externalId || !query.data) return;

      // Lines are already soonest-first. Prefer the ones the user picked — but
      // only where this stop actually serves one: a saved stop off every
      // selected line would otherwise show nothing at all, when "the next bus
      // here" is exactly what someone saved it to see.
      const lines = query.data.lines;
      const preferred = lines.filter((l) => selected.has(l.lineCode));
      const next = (preferred.length > 0 ? preferred : lines)[0];
      if (!next) return;

      resolved.set(externalId, {
        lineCode: next.lineCode,
        color: colorByLine.get(next.lineCode) ?? "#71717a",
        arrivalTime: next.arrivalTime,
      });
    });

    return resolved;
    // `queries` is a fresh array each render; its contents are what matter.
  }, [queries, visibleIds, selectedRoutes, colorByLine]);

  return (
    <StopEtasContext.Provider value={etas}>{children}</StopEtasContext.Provider>
  );
}
