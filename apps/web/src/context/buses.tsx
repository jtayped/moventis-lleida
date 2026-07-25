"use client";
import StopDetails from "@/components/map/stop-details";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { useLineBuses, type BusLineStatus } from "@/hooks/use-line-buses";
import { usePreferides } from "@/hooks/use-preferides";
import { useUrlSelection } from "@/hooks/use-url-selection";
import type { BusPosition, Lines, Line } from "@moventis/shared";
import type { Stop } from "@moventis/db";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
  /** Opens the stop drawer. Takes a `Stop.externalId` (the `?stop=` param). */
  selectStop: (externalId: string) => void;
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
    isPreferida,
    togglePreferida,
    toggleVisible: togglePreferides,
  } = usePreferides();

  // Resolves the saved ids to stops. Cached for an hour: a stop's coordinates and
  // name barely move, and this runs on every page load for every saved stop.
  const { data: savedStops = [] } = api.stops.getByExternalIds.useQuery(
    { externalIds: preferidesIds },
    { enabled: preferidesIds.length > 0, staleTime: 60 * 60 * 1000 },
  );

  // Kept out of `isLoadingStops` on purpose. That flag drives the search field's
  // spinner, which is about the query the user just typed; a background resolve
  // of the saved list has nothing to do with it.
  const preferidesStops = useMemo(() => {
    if (!showPreferides) return [];
    const onMap = new Set(stops.map((s) => s.externalId));
    return savedStops.filter((s) => !onMap.has(s.externalId));
  }, [showPreferides, savedStops, stops]);

  function toggleRoute(routeCode: Lines) {
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
  const selectStop = useCallback((externalId: string) => {
    setSelectedStopId(externalId);
  }, []);

  // Live bus prediction runs for every selected line, independent of any open
  // stop. Lifted here so both the map markers and the stop drawer read one source
  // (aggregated positions + per-line status).
  const { positions: busPositions, statusByLine: lineBusStatus } =
    useLineBuses(selectedRoutes);

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
    preferidesStops,
    preferidesCount: preferidesIds.length,
    showPreferides,
    togglePreferides,
    isPreferida,
    togglePreferida,
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
