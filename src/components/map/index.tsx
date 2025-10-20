"use client";
import BusRoutes from "@/components/tools/routes";
import SearchInput from "@/components/tools/search";
import MapComponent from "@/components/ui/map";
import { INITIAL_BOUNDS, RESTRICTED_BOUNDS } from "@/constants/lleida";
import { useBusFinder } from "@/context/buses";
import React from "react";
import MapPinsRenderer from "@/components/map/pins-renderer";
import { Card } from "../ui/card";

const BusMap = () => {
  const { stops } = useBusFinder();

  return (
    <div className="relative">
      <Card className="md:bg-card md:border-border absolute top-0 z-10 mx-auto w-full space-y-2 rounded-none rounded-br-xl border-none bg-transparent p-6 shadow-none md:max-w-2xl md:shadow-lg">
        <SearchInput />
        <BusRoutes />
      </Card>
      <MapComponent
        mapId="lleida"
        bounds={INITIAL_BOUNDS}
        restrictions={{ latLngBounds: RESTRICTED_BOUNDS, strictBounds: false }}
        className="h-screen w-full"
      >
        {stops && <MapPinsRenderer stops={stops} />}
      </MapComponent>
    </div>
  );
};

export default BusMap;
