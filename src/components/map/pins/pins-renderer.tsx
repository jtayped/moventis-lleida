import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import MapPin from "./pin";
import type { Stop } from "@prisma/client";
import { useBusFinder } from "@/context/buses";

// Define our zoom "buckets"
type ZoomBucket = "small" | "medium" | "large";

const getZoomBucket = (zoom: number): ZoomBucket => {
  if (zoom < 14) return "small";
  if (zoom < 16.5) return "medium";
  return "large";
};

const MapPinsRenderer = ({ stops }: { stops: Stop[] }) => {
  const map = useMap();

  const { selectStop, selectedStop } = useBusFinder();
  const selectedStopId = selectedStop?.id ?? null;

  // This state holds the raw zoom level
  const [zoom, setZoom] = useState<number>(() => map?.getZoom() ?? 12);

  // This memoized value holds the *bucket*, which changes less often
  const zoomBucket = useMemo(() => getZoomBucket(zoom), [zoom]);

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

  // Memoize the click handler so it's a stable prop
  const handlePinClick = useCallback(
    (stop: Stop) => {
      selectStop(stop);
    },
    [selectStop],
  );

  return (
    <>
      {stops.map((stop) => (
        <MapPin
          key={stop.id}
          stop={stop}
          zoomBucket={zoomBucket}
          isSelected={stop.id === selectedStopId}
          onClick={handlePinClick}
        />
      ))}
    </>
  );
};

export default MapPinsRenderer;
