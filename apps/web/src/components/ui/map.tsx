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
  colorScheme?: "LIGHT" | "DARK";
  restrictions?: google.maps.MapRestriction | undefined | null;
  className?: string;
  children?: React.ReactNode;
}

// Applied only when no Map ID is set. When a Map ID is configured, set styles
// via Google Cloud Console > Map Styles instead.
const MINIMAL_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: "#f4f6f8" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#eef1f4" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e2e6ea" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f0f2f5" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d8dde3" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d6e4f5" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7ea8c9" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#374151" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
];

const MapComponent = ({
  bounds,
  mapId,
  colorScheme,
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
          // `colorScheme` (like `mapId` and `renderingType`) is fixed at
          // creation time in the underlying Maps JS SDK — changing the prop in
          // place doesn't restyle a live map. Keying on it forces React to
          // unmount and recreate the map instead, which is the only way
          // switching between the light/dark styles Cloud Console associates
          // with this one Map ID actually applies.
          key={colorScheme}
          style={{ width: "100%", height: "100%" }}
          defaultBounds={bounds}
          restriction={restrictions}
          defaultCenter={!bounds ? defaultCenter : undefined}
          defaultZoom={!bounds ? defaultZoom : undefined}
          gestureHandling="greedy"
          disableDefaultUI
          mapId={mapId}
          colorScheme={mapId ? colorScheme : undefined}
          // A Map ID's dark-mode style only combines with `colorScheme` under
          // vector rendering — the default raster (`<div>`-based) map ignores
          // the dark slot entirely and falls back to plain default colors.
          renderingType={mapId ? "VECTOR" : undefined}
          styles={!mapId ? MINIMAL_MAP_STYLES : undefined}
        >
          {children}
        </Map>
      </APIProvider>
    </div>
  );
};

export default MapComponent;
