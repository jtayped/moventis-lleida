"use client";
import React, { useRef, useState } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { env } from "@/env";
import { Button } from "@/components/ui/button";

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

  // Where the map was last looking. Lives out here, in the component the
  // `key` below does *not* remount, so a theme flip recreates the map on the
  // same view instead of replaying `defaultBounds` and throwing away whatever
  // the user had panned and zoomed to.
  const cameraRef = useRef<{ center: Coordinates; zoom: number } | null>(null);
  const camera = cameraRef.current;

  // A blocked key, a dead connection or an ad blocker all end here. Without it
  // the page is a blank rectangle with the search field floating over nothing.
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return (
      <div className={className}>
        <div className="bg-muted/40 flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-xs text-sm">
            no s&apos;ha pogut carregar el mapa. comprova la connexió i
            torna-ho a provar.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            recarrega
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <APIProvider apiKey={apiKey} onError={() => setLoadFailed(true)}>
        <Map
          // `colorScheme` (like `mapId` and `renderingType`) is fixed at
          // creation time in the underlying Maps JS SDK — changing the prop in
          // place doesn't restyle a live map. Keying on it forces React to
          // unmount and recreate the map instead, which is the only way
          // switching between the light/dark styles Cloud Console associates
          // with this one Map ID actually applies.
          key={colorScheme}
          style={{ width: "100%", height: "100%" }}
          defaultBounds={camera ? undefined : bounds}
          restriction={restrictions}
          defaultCenter={camera ? camera.center : bounds ? undefined : defaultCenter}
          defaultZoom={camera ? camera.zoom : bounds ? undefined : defaultZoom}
          onCameraChanged={({ detail }) => {
            cameraRef.current = { center: detail.center, zoom: detail.zoom };
          }}
          gestureHandling="greedy"
          disableDefaultUI
          mapId={mapId}
          colorScheme={mapId ? colorScheme : undefined}
          // Vector rendering is what production has always run and the Map
          // ID's light/dark styles verifiably apply under it. Before changing
          // this, test in a *visible* tab: WebGL and raster tiles both stall in
          // a hidden tab, which reads as "the style is not applied".
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
