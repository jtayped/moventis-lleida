import React, { useEffect, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import MapPin from "./pin";
import type { Stop } from "@prisma/client";

const MapPinsRenderer = ({ stops }: { stops: Stop[] }) => {
  const map = useMap();
  // State now holds the actual zoom level, not a calculated scale
  const [zoom, setZoom] = useState<number>(map?.getZoom() ?? 12);

  useEffect(() => {
    if (!map) return;

    // Set the initial zoom level
    const initialZoom = map.getZoom();
    if (initialZoom !== undefined) {
      setZoom(initialZoom);
    }

    // Update the zoom state whenever the map's zoom level changes
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
        // Pass the current zoom level to each pin
        <MapPin key={stop.id} stop={stop} zoom={zoom} />
      ))}
    </>
  );
};

export default MapPinsRenderer;
