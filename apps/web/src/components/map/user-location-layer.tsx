"use client";
import { useEffect } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

interface Props {
  position: GeolocationCoordinates | null;
  shouldPan: boolean;
  onPanned: () => void;
}

const UserLocationLayer = ({ position, shouldPan, onPanned }: Props) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !position || !shouldPan) return;
    map.panTo({ lat: position.latitude, lng: position.longitude });
    map.setZoom(17);
    onPanned();
  }, [map, position, shouldPan, onPanned]);

  if (!position) return null;

  return (
    <AdvancedMarker
      position={{ lat: position.latitude, lng: position.longitude }}
      title="La teva ubicació"
      zIndex={20}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute size-10 animate-ping rounded-full bg-blue-400 opacity-30" />
        <div className="size-4 rounded-full border-2 border-white bg-blue-500 shadow-md" />
      </div>
    </AdvancedMarker>
  );
};

export default UserLocationLayer;
