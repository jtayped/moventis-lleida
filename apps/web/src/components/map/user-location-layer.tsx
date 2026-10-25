"use client";
import { useEffect } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { useLang } from "@/i18n/lang-context";
import { mapCopy } from "@/i18n/copy/map";

interface Props {
  position: GeolocationCoordinates | null;
  shouldPan: boolean;
  onPanned: () => void;
}

const UserLocationLayer = ({ position, shouldPan, onPanned }: Props) => {
  const map = useMap();
  const t = mapCopy[useLang()];

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
      title={t.shell.userLocation}
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
