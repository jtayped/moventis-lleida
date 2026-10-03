"use client";
import BusRoutes from "@/components/map/tools/routes";
import SearchInput from "@/components/map/tools/search";
import SettingsButton from "@/components/map/tools/settings";
import SettingsSurface from "@/components/map/tools/settings/surface";
import MapComponent from "@/components/ui/map";
import { INITIAL_BOUNDS, RESTRICTED_BOUNDS } from "@moventis/shared";
import { useBusFinder } from "@/context/buses";
import React, { useEffect, useRef } from "react";
import MapPinsRenderer from "@/components/map/pins/pins-renderer";
import RoutePaths from "@/components/map/route-paths";
import BusMarkersRenderer from "@/components/map/bus-markers-renderer";
import InitialStopFocus from "@/components/map/initial-stop-focus";
import { Button } from "../ui/button";
import { env } from "@/env";
import SearchPanel from "@/components/map/search-panel";
import StopDetails from "@/components/map/stop-details";
import { Panel } from "@/components/map/panel";
import StopsError from "@/components/map/stops-error";
import MapNav, { DesktopNav } from "@/components/map/nav";
import { HandCoins, Loader2, LocateFixed, Route } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSettings } from "@/hooks/use-settings";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useNavPanel } from "@/hooks/use-nav-panel";
import { useColorByLine } from "@/hooks/use-color-by-line";
import UserLocationLayer from "@/components/map/user-location-layer";
import { cn } from "@/lib/utils";
import { StopEtasProvider } from "@/context/stop-etas";
import { KO_FI_URL } from "@/lib/project-links";
import DirectionsPanel from "@/components/map/directions";
import DirectionsLayer, {
  MapPointPicker,
} from "@/components/map/directions/directions-layer";
import { useDirections } from "@/context/directions";
import { useDirectionsPlan } from "@/hooks/use-directions-plan";

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
const FLOATING_BUTTON = "bg-card dark:bg-card dark:hover:bg-accent shadow-lg";

/**
 * The map's actions in the right rail: one 48px square each, icon only, so the
 * rail is a single column with both edges straight and the same height as the
 * desktop bar it shares a bottom line with. The name is the `aria-label` and,
 * for a pointer, the `title`, lowercased in source because a native tooltip is
 * outside the DOM the body's `lowercase` class reaches.
 */
const MAP_ACTION = cn(
  FLOATING_BUTTON,
  "pointer-events-auto size-12 rounded-xl [&_svg:not([class*='size-'])]:size-5",
);

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

/**
 * The tip jar. The same square as the rail's actions, so the column stays
 * straight, and at the top, furthest from the thumb, because it is an ask and
 * not a tool. `/informacio` says what it is for.
 */
const KoFiLink = () => (
  <Button asChild variant="outline" size="icon" className={MAP_ACTION}>
    <a
      href={KO_FI_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="fes una donació al projecte a ko-fi"
      title="fes una donació a ko-fi"
    >
      <HandCoins aria-hidden="true" />
    </a>
  </Button>
);

const BusMap = () => {
  const {
    stops,
    busPositions,
    preferidesStops,
    stopsError,
    retryStops,
    selectedStopId,
    debouncedSearchQuery,
    requestCloseStop,
  } = useBusFinder();
  const { resolvedTheme } = useSettings();
  const isDesktop = useIsDesktop();
  const nav = useNavPanel();
  const colorByLine = useColorByLine();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    status,
    position,
    shouldPan,
    requestLocation,
    watchLocation,
    onPanned,
  } = useGeolocation();
  const directions = useDirections();
  const plan = useDirectionsPlan(
    position,
    status === "error" || status === "unsupported",
  );
  // On a phone directions take the whole screen, chrome and all.
  const directionsFullScreen = directions.isOpen && !isDesktop;

  const locateTitle =
    status === "error"
      ? "no s'ha pogut obtenir la ubicació"
      : status === "unsupported"
        ? "el navegador no suporta la geolocalització"
        : "la meva ubicació";

  // Picking a stop is a request to see that stop, and from `lg` the line
  // browser and the search results sit in the only place it can be shown.
  // Nothing else closes them, so without this a tap on a pin reads as the map
  // ignoring it. Settings is exempt — `dismissPanels` leaves it alone, because
  // it is a sheet over the whole layout and never competing for that slot.
  const { dismissPanels } = nav;
  useEffect(() => {
    if (selectedStopId) dismissPanels();
  }, [selectedStopId, dismissPanels]);

  // Directions share that slot too, and the same two rules hold: opening them
  // closes the destination they cover, and a stop picked from the map (outside
  // pick mode, where a pin fills a field instead) is a request to see that
  // stop. The second is what lets a pin tap leave directions at all on desktop,
  // where the panel would otherwise keep the slot.
  const { isOpen: directionsOpen, close: closeDirections } = directions;
  useEffect(() => {
    if (directionsOpen) dismissPanels();
  }, [directionsOpen, dismissPanels]);
  useEffect(() => {
    if (selectedStopId) closeDirections();
  }, [selectedStopId, closeDirections]);

  const toggleDirections = () => {
    if (directions.isOpen) {
      directions.close();
      return;
    }
    directions.open({}, "button");
    if (selectedStopId) requestCloseStop();
  };

  // The field and the `Cerca` tab are one control, so a query typed straight
  // into the field opens the same destination the tab does.
  //
  // On the *debounced* edge rather than on focus. A bare focus handler would,
  // on desktop, evict an open timetable from the column's slot the moment
  // someone clicked into the field to clear a leftover query — and it would
  // open an empty panel before the first result had been asked for.
  const { open: openPanel } = nav;
  const hasQuery = debouncedSearchQuery.trim().length > 0;
  useEffect(() => {
    if (hasQuery) openPanel("search", "typing");
  }, [hasQuery, openPanel]);

  const openSearch = () => {
    nav.open("search", "nav");
    // After the commit that mounts the panel, so nothing it renders can take
    // focus back off the field this tab is an alias for.
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  // A second tap on the live tab closes it — and must not re-focus the field,
  // or the software keyboard springs back up over the map you just asked to see.
  const onNavSelect = (panel: Parameters<typeof nav.open>[0]) => {
    directions.close();
    if (nav.isOpen(panel)) {
      nav.close();
      return;
    }
    if (panel === "search") {
      openSearch();
      return;
    }
    nav.open(panel, "nav");
  };

  const tools = (
    <>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <SearchInput inputRef={searchInputRef} />
        </div>
        {/* From `lg` only: below it the nav's `Configuració` tab is the door, and
            two doors to one sheet is how you end up with two of the sheet. */}
        <SettingsButton
          onOpen={() => nav.open("settings", "tools")}
          className="hidden lg:inline-flex"
        />
      </div>
      <BusRoutes />
      {stopsError && <StopsError onRetry={retryStops} />}
    </>
  );

  /** The desktop column's one content slot, and the order it resolves in. */
  const desktopSlot = directions.isOpen ? (
    <DirectionsPanel
      variant="panel"
      plan={plan}
      locationStatus={status}
      requestLocation={watchLocation}
    />
  ) : nav.isOpen("search") ? (
    <SearchPanel variant="panel" onClose={nav.close} />
  ) : selectedStopId ? (
    <Panel aria-label="hores d'arribada" className="h-full">
      <StopDetails externalId={selectedStopId} variant="panel" />
    </Panel>
  ) : null;

  return (
    <div className="relative">
      {/*
        Two layouts, not one that stretches. On a phone the chrome sits at the
        top of the map and the stop timetable arrives as a sheet from the bottom.
        From `lg` there is room to show the map *and* the data at once, which is
        the point of a map-first transit tool, so the chrome gathers into one
        floating column down the left and the map beside it stays live.

        The column stops short of the bottom navigation below `lg` — it is the
        search results, its one growing child, that would otherwise run under
        the bar. `--nav-height` is `0px` from `lg`, so this one offset is right
        in both layouts with no breakpoint of its own.

        From `lg` the bottom inset is 32px, not 16: the column's last card sits
        over the map's bottom-left corner, where Google's logo is (26px tall,
        and the Maps terms want it visible). The right rail uses the same inset
        so the two keep one bottom line.
      */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[var(--nav-height)] z-10 flex flex-col lg:w-[28rem] lg:gap-3 lg:p-4 lg:pb-8">
        {/* Directions bring their own two fields; the stop search above them
            would be a third, asking a different question. */}
        {!directions.isOpen && (
          <div
            className={cn(
              TOOLS_PANEL,
              // Below `md` this card has no surface of its own — it is painted
              // onto the map. With results underneath it that leaves the search
              // field floating over an opaque list, so it takes one on demand.
              nav.isOpen("search") && "bg-card",
            )}
          >
            {tools}
          </div>
        )}

        {/* One content panel at a time. Opening a destination covers the open
            stop rather than discarding it — the stop is still selected, still
            pinned on the map, and comes back when the destination closes.

            Gated on `isDesktop` and not only on `lg:flex`, because the two
            containers are alternatives: mounting both would run the line
            browser's per-card path queries twice. Nothing is open at first
            paint except a `?stop=` link, and `useIsDesktop` settles in a layout
            effect before the browser gets to draw that. */}
        <div className="pointer-events-auto hidden min-h-0 flex-1 flex-col lg:flex">
          {isDesktop && desktopSlot}
        </div>

        {/* The phone's search results: a plain surface between the tools card
            and the bar, not a drawer. The field it belongs to is *outside* it,
            at the top of the map, and a drawer would focus-trap that field out
            of reach — you would have to switch off the scrim, the trap and the
            auto-focus, which is everything a drawer is. It also keeps a third
            vaul root out of the race the stop sheet already runs. */}
        {!isDesktop && nav.isOpen("search") && (
          <div className="pointer-events-auto flex min-h-0 flex-1 flex-col lg:hidden">
            <SearchPanel variant="overlay" onClose={nav.close} />
          </div>
        )}

        <DesktopNav className="pointer-events-auto" />
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
          {/* An itinerary is drawn in its lines' colours; the selected lines'
              full routes underneath would read as part of it. */}
          {!directions.isOpen && <RoutePaths />}
          {stops.length > 0 && <MapPinsRenderer stops={stops} />}
          {/* Saved stops that no selected line already draws — the context has
              removed the overlap, so nothing here doubles up on `stops`. */}
          {preferidesStops.length > 0 && (
            <MapPinsRenderer stops={preferidesStops} />
          )}
          {busPositions.length > 0 && !directions.isOpen && (
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
          <DirectionsLayer plan={plan} isDesktop={isDesktop} />
          <MapPointPicker />
        </StopEtasProvider>
      </MapComponent>

      {/* The map's right rail: one column of 48px squares in the bottom-right
          corner, quietest control at the top and the primary action nearest
          the thumb. Same insets as the desktop column, so the two share their
          lines. The bottom offset clears the bar below `lg` and collapses to
          nothing from `lg`, where `--nav-height` is `0px` and there is no
          bar. */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 bottom-[var(--nav-height)] z-10 flex flex-col gap-3 p-4 lg:pb-8",
          directionsFullScreen && "hidden",
        )}
      >
        <KoFiLink />
        <Button
          variant="outline"
          size="icon"
          onClick={requestLocation}
          aria-label={locateTitle}
          title={locateTitle}
          disabled={status === "unsupported"}
          className={cn(
            MAP_ACTION,
            status === "active" && "border-blue-500 text-blue-500",
            status === "error" && "border-destructive text-destructive",
          )}
        >
          {status === "loading" ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <LocateFixed aria-hidden />
          )}
        </Button>
        {/* The primary action, so the filled one and nearest the thumb. */}
        <Button
          size="icon"
          onClick={toggleDirections}
          aria-pressed={directions.isOpen}
          aria-label="com arribar-hi"
          title="com arribar-hi"
          className={cn(
            MAP_ACTION,
            "border-transparent bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
          )}
        >
          <Route aria-hidden />
        </Button>
      </div>

      <MapNav
        active={nav.panel}
        onSelect={onNavSelect}
        visible={nav.barVisible && !directionsFullScreen}
      />

      {directionsFullScreen && (
        <DirectionsPanel
          variant="overlay"
          plan={plan}
          locationStatus={status}
          requestLocation={watchLocation}
        />
      )}

      {/* Mounted once, for both doors: the gear from `lg`, the nav tab below it. */}
      <SettingsSurface
        open={nav.isOpen("settings")}
        onOpenChange={(open) => {
          if (!open) nav.close();
        }}
      />
    </div>
  );
};

export default BusMap;
