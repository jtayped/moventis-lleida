"use client";
import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { api } from "@/trpc/react";
import { useBusFinder } from "@/context/buses";
import MapPinsRenderer from "@/components/map/pins/pins-renderer";

/** Close enough to read the street a stop is on. */
const FOCUS_ZOOM = 16;

/**
 * Makes a `?stop=` link land somewhere. On its own that param opens the drawer
 * over the default city-wide bounds with no pins, so closing the drawer leaves no
 * indication of where the stop is — the one case the drawer alone can't cover.
 *
 * So: centre the map on it, and render its pin when no selected line already
 * does. The pin stays after the drawer is closed, since that is exactly the
 * moment the map has to answer "where was that stop?".
 *
 * Only the stop from the URL is handled, and it pans once — panning on every
 * selection would yank the map out from under someone working along a line.
 */
const InitialStopFocus = () => {
  const map = useMap();
  const { selectedStopId, stops } = useBusFinder();

  // The selection at mount is the one that came from the URL.
  const externalId = useRef(selectedStopId).current;
  const panned = useRef(false);

  // Same query key as the drawer's, so this shares its result instead of
  // issuing a second request.
  const { data: stop } = api.stops.get.useQuery(
    { externalId: externalId ?? "" },
    { enabled: !!externalId },
  );

  useEffect(() => {
    if (panned.current || !map || !stop) return;
    panned.current = true;

    map.panTo({ lat: stop.latitude, lng: stop.longitude });
    const zoom = map.getZoom();
    if (zoom === undefined || zoom < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM);
  }, [map, stop]);

  if (!stop || stops.some((s) => s.externalId === stop.externalId)) return null;

  // Delegated rather than rendering a `MapPin` directly, to inherit the
  // zoom-bucket sizing every other pin on the map follows.
  return <MapPinsRenderer stops={[stop]} />;
};

export default InitialStopFocus;
