import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import MapPin from "./pin";
import type { Stop } from "@moventis/db";
import { useBusFinder } from "@/context/buses";

type ZoomBucket = "small" | "medium" | "large";

const getZoomBucket = (zoom: number): ZoomBucket => {
  if (zoom < 14) return "small";
  if (zoom < 16.5) return "medium";
  return "large";
};

/**
 * One step up the ladder, for pins that have to stay findable at any zoom.
 *
 * The `small` bucket is a 10px dot with nowhere to hang a shoulder mark, and the
 * default bounds are the whole city — so that is precisely the zoom at which a
 * saved stop would otherwise dissolve into the same faint speck as every stop the
 * user never asked for.
 */
const promote = (bucket: ZoomBucket): ZoomBucket =>
  bucket === "small" ? "medium" : bucket;

const MapPinsRenderer = React.memo(({ stops }: { stops: Stop[] }) => {
  const map = useMap();

  const {
    selectStop,
    selectedStopId,
    routes,
    selectedRoutes,
    isPreferida,
    showPreferides,
  } = useBusFinder();

  const handleClick = useCallback(
    (stop: Stop) => selectStop(stop.externalId),
    [selectStop],
  );

  const [zoom, setZoom] = useState<number>(() => map?.getZoom() ?? 12);
  const zoomBucket = useMemo(() => getZoomBucket(zoom), [zoom]);

  const primaryPinColor = useMemo(() => {
    if (selectedRoutes.length !== 1) return undefined;
    return routes.find((r) => r.code === selectedRoutes[0])?.color;
  }, [selectedRoutes, routes]);

  useEffect(() => {
    if (!map) return;

    const initialZoom = map.getZoom();
    if (initialZoom !== undefined) {
      setZoom(initialZoom);
    }

    const listener = map.addListener("zoom_changed", () => {
      const newZoom = map.getZoom();
      if (newZoom !== undefined) {
        setZoom(newZoom);
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);

  return (
    <>
      {stops.map((stop) => {
        // Decided per stop rather than per list. A saved stop that also sits on a
        // selected line arrives here through that line's own pins, and it still has
        // to look saved — so the star can't be a property of which list drew it.
        const preferida = showPreferides && isPreferida(stop.externalId);
        return (
          <MapPin
            key={stop.id}
            stop={stop}
            zoomBucket={preferida ? promote(zoomBucket) : zoomBucket}
            isSelected={stop.externalId === selectedStopId}
            onClick={handleClick}
            pinColor={primaryPinColor}
            isPreferida={preferida}
          />
        );
      })}
    </>
  );
});

MapPinsRenderer.displayName = "MapPinsRenderer";

export default MapPinsRenderer;
