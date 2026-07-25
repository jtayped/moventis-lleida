"use client";
import BusRoutes from "@/components/map/tools/routes";
import SearchInput from "@/components/map/tools/search";
import MapComponent from "@/components/ui/map";
import { INITIAL_BOUNDS, RESTRICTED_BOUNDS } from "@moventis/shared";
import { useBusFinder } from "@/context/buses";
import React, { useMemo, useState } from "react";
import MapPinsRenderer from "@/components/map/pins/pins-renderer";
import RoutePaths from "@/components/map/route-paths";
import BusMarkersRenderer from "@/components/map/bus-markers-renderer";
import InitialStopFocus from "@/components/map/initial-stop-focus";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { env } from "@/env";
import LinesPanel from "@/components/map/lines-panel";
import { LayoutList, LocateFixed, Loader2 } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import UserLocationLayer from "@/components/map/user-location-layer";
import { cn } from "@/lib/utils";

const BusMap = () => {
  const { stops, routes, busPositions, preferidesStops } = useBusFinder();
  const [linesOpen, setLinesOpen] = useState(false);
  const { status, position, shouldPan, requestLocation, onPanned } = useGeolocation();

  const colorByLine = useMemo(
    () => Object.fromEntries(routes.map((r) => [r.code, r.color])),
    [routes],
  );

  const locateTitle =
    status === "error"
      ? "No s'ha pogut obtenir la ubicació"
      : status === "unsupported"
        ? "El navegador no suporta la geolocalització"
        : "La meva ubicació";

  return (
    <div className="relative">
      <Card className="bg-transparent shadow-none md:bg-card md:border-border absolute top-0 z-10 mx-auto w-full space-y-2 rounded-none rounded-br-xl border-none p-4 md:max-w-md md:p-6 md:shadow-lg">
        <SearchInput />
        <BusRoutes />
      </Card>
      <MapComponent
        mapId={env.NEXT_PUBLIC_MAPS_MAP_ID || undefined}
        bounds={INITIAL_BOUNDS}
        restrictions={{ latLngBounds: RESTRICTED_BOUNDS, strictBounds: false }}
        className="h-screen w-full"
      >
        <InitialStopFocus />
        <RoutePaths />
        {stops.length > 0 && <MapPinsRenderer stops={stops} />}
        {/* Saved stops that no selected line already draws — the context has
            removed the overlap, so nothing here doubles up on `stops`. */}
        {preferidesStops.length > 0 && (
          <MapPinsRenderer stops={preferidesStops} />
        )}
        {busPositions.length > 0 && (
          <BusMarkersRenderer positions={busPositions} colorByLine={colorByLine} />
        )}
        <UserLocationLayer position={position} shouldPan={shouldPan} onPanned={onPanned} />
      </MapComponent>
      <div className="pointer-events-none absolute bottom-0 z-10 flex w-full items-end justify-between p-4 md:p-6">
        <Button
          variant="outline"
          onClick={() => setLinesOpen(true)}
          title="veure totes les línies"
          className="pointer-events-auto h-12 gap-2.5 rounded-xl px-5 shadow-lg"
        >
          <LayoutList className="size-5" />
          <span className="font-medium">Línies</span>
        </Button>
        <Button
          variant="outline"
          onClick={requestLocation}
          title={locateTitle}
          disabled={status === "unsupported"}
          className={cn(
            "pointer-events-auto h-12 gap-2.5 rounded-xl px-5 shadow-lg",
            status === "active" && "border-blue-500 text-blue-500",
            status === "error" && "border-destructive text-destructive",
          )}
        >
          {status === "loading" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <LocateFixed className="size-5" />
          )}
          <span className="font-medium">Ubicació</span>
        </Button>
      </div>
      <LinesPanel open={linesOpen} onClose={() => setLinesOpen(false)} />
    </div>
  );
};

export default BusMap;
