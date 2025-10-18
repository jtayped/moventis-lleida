import React from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Stop } from "@prisma/client";
import { useBusFinder } from "@/context/buses";

interface MapPinProps {
  stop: Stop;
  zoom: number;
}

const MapPin = React.memo(({ stop, zoom }: MapPinProps) => {
  const { selectStop } = useBusFinder();

  if (zoom < 14) {
    return (
      <AdvancedMarker
        position={{ lat: stop.latitude, lng: stop.longitude }}
        onClick={() => selectStop(stop)}
      >
        <div className="size-3 rounded-full bg-black opacity-75" />
      </AdvancedMarker>
    );
  }

  if (zoom < 16.5) {
    return (
      <AdvancedMarker
        position={{ lat: stop.latitude, lng: stop.longitude }}
        onClick={() => selectStop(stop)}
      >
        <div
          title={stop.name}
          className="size-8 rounded-full border-2 bg-black shadow-md transition-transform hover:scale-110"
        />
      </AdvancedMarker>
    );
  }

  return (
    <AdvancedMarker
      position={{ lat: stop.latitude, lng: stop.longitude }}
      onClick={() => selectStop(stop)}
    >
      <div
        title={stop.name}
        className="group relative flex cursor-pointer items-center transition-transform hover:!scale-110"
      >
        <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-black font-bold text-white shadow-lg"></div>
        <div className="absolute -bottom-1.5 left-1/2 z-0 h-4 w-4 -translate-x-1/2 rotate-45 transform bg-black shadow-lg" />
      </div>
    </AdvancedMarker>
  );
});

MapPin.displayName = "MapPin";

export default MapPin;
