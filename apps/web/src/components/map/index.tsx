"use client";
import BusRoutes from "@/components/map/tools/routes";
import SearchInput from "@/components/map/tools/search";
import SettingsButton from "@/components/map/tools/settings";
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
import { LayoutList, LocateFixed, Loader2, TriangleAlert } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSettings } from "@/hooks/use-settings";
import UserLocationLayer from "@/components/map/user-location-layer";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const BusMap = () => {
  const { stops, routes, busPositions, preferidesStops, stopsError, retryStops } =
    useBusFinder();
  const { resolvedTheme } = useSettings();
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
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <SearchInput />
          </div>
          <SettingsButton />
        </div>
        <BusRoutes />
        {/* Without this a failed stop query is a map with no pins on it, which
            reads as "this line has no stops" rather than "we couldn't ask". */}
        {stopsError && (
          <div
            role="status"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
          >
            <TriangleAlert size={14} className="shrink-0" />
            <span className="min-w-0 flex-1">
              no s&apos;han pogut carregar les parades
            </span>
            <Button
              onClick={retryStops}
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs underline underline-offset-2"
            >
              torna-ho a provar
            </Button>
          </div>
        )}
      </Card>
      <MapComponent
        mapId={env.NEXT_PUBLIC_MAPS_MAP_ID || undefined}
        colorScheme={resolvedTheme === "dark" ? "DARK" : "LIGHT"}
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
          onClick={() => {
            track("lines panel opened");
            setLinesOpen(true);
          }}
          title="veure totes les línies"
          // `outline`'s dark-mode background is a translucent overlay
          // (`dark:bg-input/30`, and `dark:hover:bg-input/50` on hover), meant
          // for a button sitting on a solid app surface. These two float
          // directly on the map tiles with nothing solid behind them, so that
          // translucency reads as fully transparent instead of subtle.
          //
          // The override has to be `dark:`-scoped as well as plain, and both
          // halves are load-bearing. `globals.css` declares the dark variant as
          // `&:is(.dark *)`, so a `dark:` utility outranks an unprefixed one on
          // specificity and wins the cascade whatever the source order — and
          // `twMerge` only dedupes within a modifier group, so a plain `bg-card`
          // alone doesn't displace `dark:bg-input/30`, it just loses to it.
          // Matching the modifier is what lets `twMerge` drop the variant's
          // class instead. Same fix `SettingsButton` and `SearchInput` need.
          className="pointer-events-auto bg-card dark:bg-card dark:hover:bg-accent h-12 gap-2.5 rounded-xl px-5 shadow-lg"
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
            "pointer-events-auto bg-card dark:bg-card dark:hover:bg-accent h-12 gap-2.5 rounded-xl px-5 shadow-lg",
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
