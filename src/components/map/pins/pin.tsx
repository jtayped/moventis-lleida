import React from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Stop } from "@prisma/client";
import { Bus } from "lucide-react";

interface MapPinProps {
  stop: Stop;
  zoomBucket: "small" | "medium" | "large";
  isSelected: boolean;
  onClick: (stop: Stop) => void;
}

const MapPin = React.memo(
  ({ stop, zoomBucket, isSelected, onClick }: MapPinProps) => {
    if (zoomBucket === "small") {
      return (
        <AdvancedMarker
          position={{ lat: stop.latitude, lng: stop.longitude }}
          onClick={() => onClick(stop)}
          zIndex={isSelected ? 10 : 1}
        >
          <div className="size-2.5 rounded-full bg-blue-500 opacity-70" />
        </AdvancedMarker>
      );
    }

    if (zoomBucket === "medium") {
      return (
        <AdvancedMarker
          position={{ lat: stop.latitude, lng: stop.longitude }}
          onClick={() => onClick(stop)}
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

    return (
      <AdvancedMarker
        position={{ lat: stop.latitude, lng: stop.longitude }}
        onClick={() => onClick(stop)}
        title={stop.name}
        zIndex={isSelected ? 10 : 1}
      >
        <div
          className="absolute"
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <div
            className={`group relative flex cursor-pointer flex-col items-center transition-transform hover:!scale-110 ${isSelected ? "scale-105" : "scale-100"} `}
          >
            <div
              className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg ${isSelected ? "bg-blue-800 ring-4 ring-blue-300" : ""} `}
            >
              <Bus size={22} />
            </div>
            <div
              className={`z-0 h-4 w-4 -translate-y-[10px] rotate-45 transform bg-blue-600 ${isSelected ? "bg-blue-800" : ""} `}
            />
          </div>
        </div>
      </AdvancedMarker>
    );
  },
);

MapPin.displayName = "MapPin";

export default MapPin;
