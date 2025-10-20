import React from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Stop } from "@prisma/client";
import { useBusFinder } from "@/context/buses";
import { Bus } from "lucide-react"; // Import a bus icon

interface MapPinProps {
  stop: Stop;
  zoom: number;
}

const MapPin = React.memo(({ stop, zoom }: MapPinProps) => {
  // Get both `selectStop` and `selectedStop` from your context
  const { selectStop, selectedStop } = useBusFinder();
  const isSelected = selectedStop?.id === stop.id;

  // --- Zoom Level 1: Far Out ---
  // A small, semi-transparent dot. Great for decluttering.
  if (zoom < 14) {
    return (
      <AdvancedMarker
        position={{ lat: stop.latitude, lng: stop.longitude }}
        onClick={() => selectStop(stop)}
        zIndex={isSelected ? 10 : 1}
      >
        <div className="size-2.5 rounded-full bg-blue-500 opacity-70" />
      </AdvancedMarker>
    );
  }

  // --- Zoom Level 2: Mid-Range ---
  // A simple circular icon. Clearer than a dot.
  if (zoom < 16.5) {
    return (
      <AdvancedMarker
        position={{ lat: stop.latitude, lng: stop.longitude }}
        onClick={() => selectStop(stop)}
        title={stop.name}
        zIndex={isSelected ? 10 : 1}
      >
        <div
          className={`flex size-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg transition-all hover:scale-110 ${isSelected ? "scale-105 bg-blue-800 ring-4 ring-blue-300" : ""} `}
        >
          <Bus size={16} />
        </div>
      </AdvancedMarker>
    );
  }

  // --- Zoom Level 3: Zoomed In ---
  // A full "pin" marker, accurately anchored at its tip.
  return (
    <AdvancedMarker
      position={{ lat: stop.latitude, lng: stop.longitude }}
      onClick={() => selectStop(stop)}
      title={stop.name}
      zIndex={isSelected ? 10 : 1}
    >
      {/* This is the key: The container is offset so the *bottom tip* of the pin is at the `lat/lng` coordinate, not its center.
       */}
      <div className="absolute" style={{ transform: "translate(-50%, -100%)" }}>
        <div
          className={`group relative flex cursor-pointer flex-col items-center transition-transform hover:!scale-110 ${isSelected ? "scale-105" : "scale-100"} `}
        >
          {/* Main Pin Body (Circle) */}
          <div
            className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg ${isSelected ? "bg-blue-800 ring-4 ring-blue-300" : ""} `}
          >
            <Bus size={22} />
          </div>
          {/* Pin Tip (Triangle) */}
          <div
            className={`z-0 h-4 w-4 -translate-y-[10px] rotate-45 transform bg-blue-600 ${isSelected ? "bg-blue-800" : ""} `}
          />
        </div>
      </div>
    </AdvancedMarker>
  );
});

MapPin.displayName = "MapPin";

export default MapPin;
