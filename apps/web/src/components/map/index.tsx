"use client";
import BusRoutes from "@/components/map/tools/routes";
import SearchInput from "@/components/map/tools/search";
import SettingsButton from "@/components/map/tools/settings";
import MapComponent from "@/components/ui/map";
import { INITIAL_BOUNDS, RESTRICTED_BOUNDS } from "@moventis/shared";
import { useBusFinder } from "@/context/buses";
import React, { useEffect, useMemo, useState } from "react";
import MapPinsRenderer from "@/components/map/pins/pins-renderer";
import RoutePaths from "@/components/map/route-paths";
import BusMarkersRenderer from "@/components/map/bus-markers-renderer";
import InitialStopFocus from "@/components/map/initial-stop-focus";
import { Button } from "../ui/button";
import { env } from "@/env";
import LinesPanel from "@/components/map/lines-panel";
import StopDetails from "@/components/map/stop-details";
import { Panel } from "@/components/map/panel";
import { LayoutList, LocateFixed, Loader2, TriangleAlert } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSettings } from "@/hooks/use-settings";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import UserLocationLayer from "@/components/map/user-location-layer";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { StopEtasProvider } from "@/context/stop-etas";

/**
 * Without this a failed stop query is a map with no pins on it, which reads as
 * "this line has no stops" rather than "we couldn't ask".
 */
const StopsError = ({ onRetry }: { onRetry: () => void }) => (
  <div
    role="status"
    className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
  >
    <TriangleAlert size={14} className="shrink-0" />
    <span className="min-w-0 flex-1">
      no s&apos;han pogut carregar les parades
    </span>
    <Button
      onClick={onRetry}
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 px-2 text-xs underline underline-offset-2"
    >
      torna-ho a provar
    </Button>
  </div>
);

/**
 * `outline`'s dark-mode background is a translucent overlay (`dark:bg-input/30`,
 * and `dark:hover:bg-input/50` on hover), meant for a button sitting on a solid
 * app surface. These float directly on the map tiles with nothing solid behind
 * them, so that translucency reads as fully transparent instead of subtle.
 *
 * The override has to be `dark:`-scoped as well as plain, and both halves are
 * load-bearing. `globals.css` declares the dark variant as `&:is(.dark *)`, so a
 * `dark:` utility outranks an unprefixed one on specificity and wins the cascade
 * whatever the source order — and `twMerge` only dedupes within a modifier group,
 * so a plain `bg-card` alone doesn't displace `dark:bg-input/30`, it just loses to
 * it. Matching the modifier is what lets `twMerge` drop the variant's class
 * instead. Same fix `SettingsButton` and `SearchInput` need.
 */
const FLOATING_BUTTON =
  "bg-card dark:bg-card dark:hover:bg-accent h-12 gap-2.5 rounded-xl px-5 shadow-lg";

/**
 * The chrome that holds the search field and the line strip, in all three of its
 * forms. Below `md` it is painted straight onto the map — no surface, no border,
 * full bleed — because a card up there is a card's worth of map nobody can see.
 * From `md` it becomes a real card, and from `lg` a floating panel at the top of
 * the left column.
 *
 * All three are one element switched by media query rather than a `useIsDesktop`
 * branch, and that is the point: a JS branch renders the phone layout until
 * hydration, and on a desktop that is a full-bleed mobile header flashing across
 * the top of the window before the column appears.
 */
const TOOLS_PANEL = [
  "pointer-events-auto text-card-foreground space-y-2 rounded-br-xl p-4",
  "md:max-w-md md:bg-card md:border md:border-border md:p-6 md:shadow-lg",
  "lg:max-w-none lg:shrink-0 lg:rounded-xl lg:border lg:bg-card lg:p-4 lg:shadow-lg",
].join(" ");

/** The one control that opens the line browser, in either layout. */
const LinesButton = ({
  open,
  onToggle,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) => (
  <Button
    variant="outline"
    onClick={onToggle}
    aria-pressed={open}
    title="veure totes les línies"
    className={cn(FLOATING_BUTTON, className)}
  >
    <LayoutList className="size-5" />
    <span className="font-medium">Línies</span>
  </Button>
);

const BusMap = () => {
  const {
    stops,
    routes,
    busPositions,
    preferidesStops,
    stopsError,
    retryStops,
    selectedStopId,
  } = useBusFinder();
  const { resolvedTheme } = useSettings();
  const isDesktop = useIsDesktop();
  const [linesOpen, setLinesOpen] = useState(false);
  const { status, position, shouldPan, requestLocation, onPanned } =
    useGeolocation();

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

  // Picking a stop is a request to see that stop, and on desktop the line
  // browser is sitting in the only place it can be shown. Nothing else closes
  // the browser, so without this a tap on a pin reads as the map ignoring it.
  useEffect(() => {
    if (selectedStopId) setLinesOpen(false);
  }, [selectedStopId]);

  const toggleLines = () => {
    if (!linesOpen) track("lines panel opened");
    setLinesOpen((wasOpen) => !wasOpen);
  };

  const tools = (
    <>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <SearchInput />
        </div>
        <SettingsButton />
      </div>
      <BusRoutes />
      {stopsError && <StopsError onRetry={retryStops} />}
    </>
  );

  return (
    <div className="relative">
      {/*
        Two layouts, not one that stretches. On a phone the chrome sits at the
        top of the map and the stop timetable arrives as a sheet from the bottom.
        From `lg` there is room to show the map *and* the data at once, which is
        the point of a map-first transit tool, so the chrome gathers into one
        floating column down the left and the map beside it stays live.
      */}
      <div className="pointer-events-none absolute top-0 left-0 z-10 w-full lg:inset-y-0 lg:flex lg:w-[28rem] lg:flex-col lg:gap-3 lg:p-4">
        <div className={TOOLS_PANEL}>{tools}</div>

        {/* One content panel at a time. Opening the line browser covers the
            open stop rather than discarding it — the stop is still selected,
            still pinned on the map, and comes back when the browser closes.

            Gated on `isDesktop` and not only on `lg:flex`, because the two
            containers are alternatives: mounting both would run the line
            browser's per-card path queries twice. Nothing is open at first
            paint except a `?stop=` link, and `useIsDesktop` settles in a layout
            effect before the browser gets to draw that. */}
        <div className="pointer-events-auto hidden min-h-0 flex-1 flex-col lg:flex">
          {isDesktop &&
            (linesOpen ? (
              <LinesPanel
                variant="panel"
                open
                onClose={() => setLinesOpen(false)}
              />
            ) : (
              selectedStopId && (
                <Panel aria-label="hores d'arribada" className="h-full">
                  <StopDetails externalId={selectedStopId} variant="panel" />
                </Panel>
              )
            ))}
        </div>

        <LinesButton
          open={linesOpen}
          onToggle={toggleLines}
          className="pointer-events-auto hidden shrink-0 self-start lg:inline-flex"
        />
      </div>

      <MapComponent
        mapId={env.NEXT_PUBLIC_MAPS_MAP_ID || undefined}
        colorScheme={resolvedTheme === "dark" ? "DARK" : "LIGHT"}
        bounds={INITIAL_BOUNDS}
        restrictions={{ latLngBounds: RESTRICTED_BOUNDS, strictBounds: false }}
        className="h-screen w-full"
      >
        {/* Inside the map (it reads the camera) and around the pins (they read
            the result), so one camera listener and one capped set serve all
            three pin renderers. */}
        <StopEtasProvider>
          <InitialStopFocus />
          <RoutePaths />
          {stops.length > 0 && <MapPinsRenderer stops={stops} />}
          {/* Saved stops that no selected line already draws — the context has
              removed the overlap, so nothing here doubles up on `stops`. */}
          {preferidesStops.length > 0 && (
            <MapPinsRenderer stops={preferidesStops} />
          )}
          {busPositions.length > 0 && (
            <BusMarkersRenderer
              positions={busPositions}
              colorByLine={colorByLine}
            />
          )}
          <UserLocationLayer
            position={position}
            shouldPan={shouldPan}
            onPanned={onPanned}
          />
        </StopEtasProvider>
      </MapComponent>

      {/* `ml-auto` on the location button rather than `justify-between` on the
          row: from `lg` the line button has moved into the column, and a lone
          child under `justify-between` would slide to the left edge. */}
      <div className="pointer-events-none absolute bottom-0 z-10 flex w-full items-end p-4 md:p-6">
        <LinesButton
          open={linesOpen}
          onToggle={toggleLines}
          className="pointer-events-auto lg:hidden"
        />
        <Button
          variant="outline"
          onClick={requestLocation}
          title={locateTitle}
          disabled={status === "unsupported"}
          className={cn(
            FLOATING_BUTTON,
            "pointer-events-auto ml-auto",
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

      {!isDesktop && (
        <LinesPanel open={linesOpen} onClose={() => setLinesOpen(false)} />
      )}
    </div>
  );
};

export default BusMap;
