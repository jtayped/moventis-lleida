"use client";
import React from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { env } from "@/env";

interface Coordinates {
  lat: number;
  lng: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapComponentProps {
  bounds?: MapBounds;
  defaultCenter?: Coordinates;
  defaultZoom?: number;
  mapId?: string;
  restrictions?: google.maps.MapRestriction | undefined | null;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A generic, reusable map component that displays multiple custom, clickable markers.
 * @template T - The type of the data for each pin, which must include lat and lng.
 */
const MapComponent = ({
  bounds,
  mapId,
  className,
  restrictions,
  defaultZoom = 1,
  defaultCenter = { lat: 0, lng: 0 },
  children,
}: MapComponentProps) => {
  const apiKey = env.NEXT_PUBLIC_MAPS_API_KEY;

  return (
    <div className={className}>
      <APIProvider apiKey={apiKey}>
        <Map
          style={{ width: "100%", height: "100%" }}
          defaultBounds={bounds}
          restriction={restrictions}
          defaultCenter={!bounds ? defaultCenter : undefined}
          defaultZoom={!bounds ? defaultZoom : undefined}
          gestureHandling="greedy"
          disableDefaultUI
          mapId={mapId}
        >
          {children}
        </Map>
      </APIProvider>
    </div>
  );
};

export default MapComponent;
