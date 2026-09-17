"use client";
import StopDetails from "@/components/map/stop-details";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { useLineBuses, type BusLineStatus } from "@/hooks/use-line-buses";
import { usePreferides } from "@/hooks/use-preferides";
import { useSettings } from "@/hooks/use-settings";
import { useUrlSelection } from "@/hooks/use-url-selection";
import { track, type StopOpenSource } from "@/lib/analytics";
import { keepPreviousData } from "@tanstack/react-query";
import type { BusPosition, Lines, Line } from "@moventis/shared";
import type { Stop } from "@moventis/db";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface BusFinderValue {
  routes: Line[];
  stops: Stop[];
  selectedRoutes: Lines[];
  isLoadingStops: boolean;
  toggleRoute: (routeId: Lines) => void;
  isRouteSelected: (routeId: Lines) => boolean;
  /** Routes that have at least one operating day today. */
  activeRouteCodes: Lines[];
  /**
   * Opens the stop drawer. Takes a `Stop.externalId` (the `?stop=` param).
   *
   * `source` is for the analytics event only — it never changes what opens, and
   * defaults to "pin" because the map is where most of these come from and
   * every other caller is a single known place.
   */
  selectStop: (externalId: string, source?: StopOpenSource) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** `externalId` of the stop whose drawer is open, if any. */
  selectedStopId: string | null;
  /**
   * Inferred live bus positions across all selected lines (each tagged with its
   * `lineCode`). Populated whenever ≥1 line is selected; independent of any open
   * stop or drawer.
   */
  busPositions: BusPosition[];
  /** Per-line fetch status of the live bus prediction, for loading/empty/error UI. */
  lineBusStatus: Record<string, BusLineStatus>;
  /**
   * Whether live bus prediction is turned on — the device's own opt-in from the
   * settings panel (`useSettings`), off by default since it's still
   * experimental. Consumers must gate any live-bus UI on this directly rather
   * than inferring it from `lineBusStatus` being empty, which reads as "error".
   */
  isBusLocationEnabled: boolean;

  /*
   * Saved stops (`preferides`). A device-local list held in localStorage that
   * behaves like a line in the UI — one toggleable badge in the same strip — but
   * is plumbed entirely separately from `selectedRoutes`, which feeds per-line
   * stop queries, the live bus prediction, the drawer's selected/correspondence
   * split and the `?lines=` param. A synthetic code in that array would poison
   * all five, and preferides have no line to poison them with.
   */
  /**
   * Saved stops as they should be drawn: empty while hidden, and with anything
   * already on the map through a selected line removed, so no stop gets two
   * markers stacked at identical coordinates.
   */
  preferidesStops: Stop[];
  /** How many stops are saved, whether or not they're being shown. */
  preferidesCount: number;
  /** Whether saved stops are drawn on the map. */
  showPreferides: boolean;
  /**
   * Unlike `toggleRoute`, this leaves an open drawer alone — hiding the list
   * changes nothing about what that drawer is showing.
   */
  togglePreferides: () => void;
  /** True saved state, ungated by visibility — the drawer's star needs the truth. */
  isPreferida: (externalId: string) => boolean;
  togglePreferida: (externalId: string) => void;
  /**
   * The device declined the storage notice, so nothing can be saved. Distinct
   * from "nothing saved yet": the star has to say why it does nothing rather
   * than look broken. The line strip's badge needs no such treatment — it is
   * already hidden while `preferidesCount` is 0, which declining guarantees.
   */
  preferidesDisabled: boolean;
  /** Unsaves every stop at once — the settings panel's data-management action. */
  clearPreferides: () => void;
}

const BusFinderContext = createContext<BusFinderValue | undefined>(undefined);

export const BusFinderProvider = ({
  children,
  initialLines = [],
  initialStopId = null,
}: {
  children: React.ReactNode;
  /** Line codes from `?lines=`, already validated against existing routes. */
  initialLines?: Lines[];
  /** `Stop.externalId` from `?stop=`. */
  initialStopId?: string | null;
}) => {
  const [selectedRoutes, setSelectedRoutes] = useState<Lines[]>(initialLines);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    initialStopId,
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Written from the undebounced selection: a refresh within the debounce
  // window would otherwise drop the most recent toggle.
  useUrlSelection(selectedRoutes, selectedStopId);

  const debouncedQuery = useDebounce(searchQuery);
  const debouncedSelectedRoutes = useDebounce(selectedRoutes);

  const { data: routes = [] } = api.routes.getAll.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000, // treat as fresh for 24h; seeded by SSR prefetch
  });

  const { data: activeRouteCodes = [] } = api.routes.getTodayActive.useQuery(
    undefined,
    {
      staleTime: 60 * 60 * 1000, // treat as fresh for 1 hour
    },
  );

  // One query per selected route so React Query caches each line independently.
  const routeQueries = api.useQueries((t) =>
    debouncedSelectedRoutes.map((code) =>
      t.stops.getByRoute({ routeCode: code }),
    ),
  );

  // Search-only query: only runs when there are no selected routes but the user
  // is typing a name search.
  const { data: searchStops, isLoading: isSearchLoading } =
    api.stops.getMany.useQuery(
      { routeCodes: [], query: debouncedQuery },
      {
        enabled:
          debouncedSelectedRoutes.length === 0 &&
          debouncedQuery.trim().length > 0,
      },
    );

  // Stops of all selected routes, deduplicated (lines share stops).
  const routeStops = useMemo(() => {
    const map = new Map<string, Stop>();
    for (const q of routeQueries) {
      for (const stop of q.data ?? []) {
        map.set(stop.id, stop);
      }
    }
    return [...map.values()];
  }, [routeQueries]);

  // Apply client-side name filter when routes are selected and a query is typed.
  const stops = useMemo(() => {
    if (debouncedSelectedRoutes.length === 0) {
      return searchStops ?? [];
    }
    if (!debouncedQuery.trim()) {
      return routeStops;
    }
    const q = debouncedQuery.toLowerCase();
    return routeStops.filter((s) => s.name.toLowerCase().includes(q));
  }, [debouncedSelectedRoutes.length, searchStops, routeStops, debouncedQuery]);

  const isLoadingStops =
    routeQueries.some((q) => q.isLoading) ||
    (debouncedSelectedRoutes.length === 0 && isSearchLoading);

  const {
    ids: preferidesIds,
    visible: showPreferides,
    disabled: preferidesDisabled,
    isPreferida,
    togglePreferida,
    toggleVisible: togglePreferides,
    clear: clearPreferides,
  } = usePreferides();

  // The settings panel's own opt-in for the live bus prediction — off by
  // default, since it's still experimental. Read here rather than inside
  // `useLineBuses` so the one flag drives both the fetch below and
  // `isBusLocationEnabled` in the context value, instead of two copies of the
  // same setting drifting apart.
  const {
    settings: { liveBusPrediction: isBusLocationEnabled },
  } = useSettings();

  // Resolves the saved ids to stops. Cached for an hour: a stop's coordinates and
  // name barely move, and this runs on every page load for every saved stop.
  //
  // Every save changes the id set, and so the query key. Holding the previous
  // result keeps the other saved pins on the map while the new set resolves,
  // instead of blanking the whole layer to add one stop to it.
  const { data: savedStops = [] } = api.stops.getByExternalIds.useQuery(
    { externalIds: preferidesIds },
    {
      enabled: preferidesIds.length > 0,
      staleTime: 60 * 60 * 1000,
      placeholderData: keepPreviousData,
    },
  );

  // Kept out of `isLoadingStops` on purpose. That flag drives the search field's
  // spinner, which is about the query the user just typed; a background resolve
  // of the saved list has nothing to do with it.
  //
  // Intersected with the live ids, and not merely deduplicated against the map:
  // `keepPreviousData` answers a disabled query with the *previous* id set's
  // stops and never replaces them, so emptying the list — unsaving the last one,
  // or declining the storage notice — would otherwise leave its pins on the map
  // until a reload. Declining has to clear them in the same tick it clears the
  // device.
  const preferidesStops = useMemo(() => {
    if (!showPreferides || preferidesIds.length === 0) return [];
    const saved = new Set(preferidesIds);
    const onMap = new Set(stops.map((s) => s.externalId));
    return savedStops.filter(
      (s) => saved.has(s.externalId) && !onMap.has(s.externalId),
    );
  }, [showPreferides, preferidesIds, savedStops, stops]);

  function toggleRoute(routeCode: Lines) {
    track("line toggled", {
      code: routeCode,
      selected: !selectedRoutes.includes(routeCode),
    });
    setSelectedRoutes((currentRoutes) =>
      currentRoutes.includes(routeCode)
        ? currentRoutes.filter((id) => id !== routeCode)
        : [...currentRoutes, routeCode],
    );
    setSelectedStopId(null);
  }

  function isRouteSelected(routeCode: Lines): boolean {
    return selectedRoutes.includes(routeCode);
  }

  // Stable so the memoized map pins don't re-render on every provider update.
  const selectStop = useCallback(
    (externalId: string, source: StopOpenSource = "pin") => {
      track("stop opened", { source });
      setSelectedStopId(externalId);
    },
    [],
  );

  // The `?stop=` open, which `selectStop` never sees: the drawer is already open
  // on the first render, seeded from `initialStopId`. Fired from a mount effect
  // rather than at module scope so it counts once per visit, not once per render
  // — and only once, since `initialStopId` is a prop that can't change here.
  const reportedInitialStop = useRef(false);
  useEffect(() => {
    if (!initialStopId || reportedInitialStop.current) return;
    reportedInitialStop.current = true;
    track("stop opened", { source: "url" });
  }, [initialStopId]);

  // One event per search, not one per keystroke: fired on the edge from an empty
  // debounced query to a non-empty one, and reset when the field is cleared. The
  // query text is deliberately never sent — see `lib/analytics.ts`.
  const hadQuery = useRef(false);
  useEffect(() => {
    const hasQuery = debouncedQuery.trim().length > 0;
    if (hasQuery && !hadQuery.current) track("search used");
    hadQuery.current = hasQuery;
  }, [debouncedQuery]);

  // Wrapped rather than tracked inside `usePreferides`: the hook is the storage
  // layer and has no business knowing about analytics, and `saved` is the state
  // the toggle is moving *to*, which only the caller's side of it can name.
  // Both wrappers stay silent when saving is off, since nothing then happens.
  const trackedTogglePreferida = useCallback(
    (externalId: string) => {
      if (preferidesDisabled) return;
      track("preferida toggled", { saved: !isPreferida(externalId) });
      togglePreferida(externalId);
    },
    [preferidesDisabled, isPreferida, togglePreferida],
  );

  const trackedTogglePreferides = useCallback(() => {
    track("preferides visibility toggled", { visible: !showPreferides });
    togglePreferides();
  }, [showPreferides, togglePreferides]);

  // Live bus prediction runs for every selected line, independent of any open
  // stop. Lifted here so both the map markers and the stop drawer read one source
  // (aggregated positions + per-line status).
  const { positions: busPositions, statusByLine: lineBusStatus } =
    useLineBuses(selectedRoutes, isBusLocationEnabled);

  const value = {
    routes: routes as Line[],
    stops,
    selectedRoutes,
    isLoadingStops,
    toggleRoute,
    isRouteSelected,
    activeRouteCodes,
    selectStop,
    searchQuery,
    setSearchQuery,
    selectedStopId,
    busPositions,
    lineBusStatus,
    isBusLocationEnabled,
    preferidesStops,
    preferidesCount: preferidesIds.length,
    showPreferides,
    togglePreferides: trackedTogglePreferides,
    isPreferida,
    togglePreferida: trackedTogglePreferida,
    preferidesDisabled,
    clearPreferides,
  } satisfies BusFinderValue;

  return (
    <BusFinderContext.Provider value={value}>
      {children}
      <Drawer
        open={!!selectedStopId}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedStopId(null);
          }
        }}
      >
        <DrawerContent>
          {selectedStopId && <StopDetails externalId={selectedStopId} />}
        </DrawerContent>
      </Drawer>
    </BusFinderContext.Provider>
  );
};

export const useBusFinder = () => {
  const context = useContext(BusFinderContext);
  if (!context) {
    throw new Error("useBusFinder must be used within a BusFinderProvider");
  }
  return context;
};
