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
import LinesPanel from "@/components/map/lines-panel";
import SearchPanel from "@/components/map/search-panel";
import StopDetails from "@/components/map/stop-details";
import { Panel } from "@/components/map/panel";
import StopsError from "@/components/map/stops-error";
import MapNav from "@/components/map/nav";
import { Coffee, LayoutList, LocateFixed, Loader2 } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSettings } from "@/hooks/use-settings";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useNavPanel } from "@/hooks/use-nav-panel";
import { useColorByLine } from "@/hooks/use-color-by-line";
import UserLocationLayer from "@/components/map/user-location-layer";
import { cn } from "@/lib/utils";
import { StopEtasProvider } from "@/context/stop-etas";
import { CONTENT_LINKS } from "@/lib/content-links";
import { KO_FI_URL } from "@/lib/project-links";
import Link from "next/link";

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

/**
 * The desktop door to the line browser. Below `lg` the bottom nav's `Línies` tab
 * is the only one — this used to be rendered a second time as a floating pill
 * down there, which is exactly the scattered chrome the nav replaces.
 */
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

/**
 * Plain links to the content pages, beside the desktop "línies" button.
 *
 * These are the only `<a>` elements in the map's server HTML. Every other way
 * into a line or a stop is a button, which a crawler does not follow, so without
 * this row nothing on `/` leads anywhere. The row is hidden below `lg` but stays
 * in the DOM, and links in the DOM are still followed; phone users reach the
 * same pages from the settings panel.
 *
 * Beside the button and not under it: under it, the row takes the column's last
 * slot, which is where Google's logo sits on the map, and the logo must stay
 * visible.
 */
const ContentLinks = () => (
  <nav aria-label="més informació" className="pointer-events-auto">
    <ul className="bg-card text-muted-foreground flex gap-3 rounded-xl border px-4 py-2 text-xs shadow-lg">
      {CONTENT_LINKS.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

/**
 * The tip jar. 40px against the location button's 48, outlined, muted: the
 * quietest control on the map on purpose, because it is an ask and not a tool.
 * `/informacio` says what it is for.
 */
const KoFiLink = () => (
  <a
    href={KO_FI_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="dona suport al projecte a ko-fi"
    title="convida'm a un cafè a ko-fi"
    className="bg-card dark:bg-card text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent pointer-events-auto grid size-10 place-items-center rounded-full border shadow-lg transition-colors"
  >
    <Coffee className="size-4" aria-hidden="true" />
  </a>
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
  } = useBusFinder();
  const { resolvedTheme } = useSettings();
  const isDesktop = useIsDesktop();
  const nav = useNavPanel();
  const colorByLine = useColorByLine();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { status, position, shouldPan, requestLocation, onPanned } =
    useGeolocation();

  const locateTitle =
    status === "error"
      ? "No s'ha pogut obtenir la ubicació"
      : status === "unsupported"
        ? "El navegador no suporta la geolocalització"
        : "La meva ubicació";

  // Picking a stop is a request to see that stop, and from `lg` the line
  // browser and the search results sit in the only place it can be shown.
  // Nothing else closes them, so without this a tap on a pin reads as the map
  // ignoring it. Settings is exempt — `dismissPanels` leaves it alone, because
  // it is a sheet over the whole layout and never competing for that slot.
  const { dismissPanels } = nav;
  useEffect(() => {
    if (selectedStopId) dismissPanels();
  }, [selectedStopId, dismissPanels]);

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
  const desktopSlot = nav.isOpen("search") ? (
    <SearchPanel variant="panel" onClose={nav.close} />
  ) : nav.isOpen("lines") ? (
    <LinesPanel variant="panel" open onClose={nav.close} />
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
      */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[var(--nav-height)] z-10 flex flex-col lg:w-[28rem] lg:gap-3 lg:p-4">
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

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <LinesButton
            open={nav.isOpen("lines")}
            onToggle={() => nav.toggle("lines", "tools")}
            className="pointer-events-auto shrink-0"
          />
          <ContentLinks />
        </div>
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

      {/* The map's right rail: a column parked in the bottom-right corner,
          quietest control at the top and the primary action nearest the thumb.
          A plain flex column with no fixed heights, so a control added later
          drops in as a sibling. The bottom offset clears the bar below `lg`
          and collapses to nothing from `lg`, where `--nav-height` is `0px` and
          there is no bar. */}
      <div className="pointer-events-none absolute bottom-[var(--nav-height)] z-10 flex w-full items-end p-4 md:p-6">
        <div className="pointer-events-none ml-auto flex flex-col items-end gap-3">
          <KoFiLink />
          <Button
            variant="outline"
            onClick={requestLocation}
            title={locateTitle}
            disabled={status === "unsupported"}
            className={cn(
              FLOATING_BUTTON,
              "pointer-events-auto",
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
      </div>

      <MapNav
        active={nav.panel}
        onSelect={onNavSelect}
        visible={nav.barVisible}
      />

      {!isDesktop && (
        <LinesPanel open={nav.isOpen("lines")} onClose={nav.close} />
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
