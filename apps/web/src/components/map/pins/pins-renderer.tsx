import React, { useEffect, useState, useMemo } from "react";
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

const MapPinsRenderer = React.memo(({ stops }: { stops: Stop[] }) => {
  const map = useMap();

  const { selectStop, selectedStop, routes, selectedRoutes } = useBusFinder();
  const selectedStopId = selectedStop?.id;

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
      {stops.map((stop) => (
        <MapPin
          key={stop.id}
          stop={stop}
          zoomBucket={zoomBucket}
          selectedStopId={selectedStopId}
          onClick={selectStop}
          pinColor={primaryPinColor}
        />
      ))}
    </>
  );
});

MapPinsRenderer.displayName = "MapPinsRenderer";

export default MapPinsRenderer;
