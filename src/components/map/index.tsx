"use client";
import BusRoutes from "@/components/map/tools/routes";
import SearchInput from "@/components/map/tools/search";
import MapComponent from "@/components/ui/map";
import { INITIAL_BOUNDS, RESTRICTED_BOUNDS } from "@/constants/lleida";
import { useBusFinder } from "@/context/buses";
import React from "react";
import MapPinsRenderer from "@/components/map/pins/pins-renderer";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import Link from "next/link";
import Github from "../icons/github";

const BusMap = () => {
  const { stops } = useBusFinder();

  return (
    <div className="relative">
      <Card className="md:bg-card md:border-border absolute top-0 z-10 mx-auto w-full space-y-2 rounded-none rounded-br-xl border-none bg-transparent p-6 shadow-none md:max-w-md md:shadow-lg">
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
      <div className="absolute bottom-0 flex w-full justify-center p-6">
        <Button variant={"ghost"} asChild className="w-full max-w-sm">
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/jtayped/moventis-lleida"
          >
            <Github />
            visita el repositori
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default BusMap;
