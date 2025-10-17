"use client";
import BusRoutes from "@/components/tools/routes";
import SearchInput from "@/components/tools/search";
import MapComponent from "@/components/ui/map";
import { BOUNDS } from "@/constants/lleida";
import { useBusFinder } from "@/context/buses";
import React from "react";
import MapPinsRenderer from "@/components/map/pins-renderer";

const BusMap = () => {
  const { stops } = useBusFinder();

  return (
    <div className="relative">
      <div className="absolute top-0 z-10 w-full space-y-2 p-6">
        <SearchInput />
        <BusRoutes />
      </div>
      <MapComponent mapId="lleida" bounds={BOUNDS} className="h-screen w-full">
        {stops && <MapPinsRenderer stops={stops} />}
      </MapComponent>
    </div>
  );
};

export default BusMap;
