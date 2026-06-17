"use client";
import StopDetails from "@/components/map/stop-details";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import type { Lines, Line } from "@moventis/shared";
import type { Stop } from "@moventis/db";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface BusFinderValue {
  routes: Line[];
  stops: Stop[];
  selectedRoutes: Lines[];
  isLoadingStops: boolean;
  toggleRoute: (routeId: Lines) => void;
  isRouteSelected: (routeId: Lines) => boolean;
  selectStop: (stop: Stop) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedStop: Stop | undefined;
  /** Returns the active direction for a route ("I" = outbound, "V" = return). Default "I". */
  getDirectionForRoute: (code: Lines) => "I" | "V";
  setDirectionFilter: (code: Lines, dir: "I" | "V") => void;
  /** Look up a full Stop object by id from the currently loaded route stops. */
  findStop: (id: string) => Stop | undefined;
}

const BusFinderContext = createContext<BusFinderValue | undefined>(undefined);

export const BusFinderProvider = ({
  children,
  initialRoutes,
}: {
  children: React.ReactNode;
  initialRoutes: Line[];
}) => {
  const [selectedRoutes, setSelectedRoutes] = useState<Lines[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilters, setDirectionFilters] = useState<Record<string, "I" | "V">>({});

  const debouncedQuery = useDebounce(searchQuery);
  const debouncedSelectedRoutes = useDebounce(selectedRoutes);

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
      { enabled: debouncedSelectedRoutes.length === 0 && debouncedQuery.trim().length > 0 },
    );

  // All stops for selected routes, deduplicated — used for navigation lookups.
  const allRouteStopsMap = useMemo(() => {
    const map = new Map<string, Stop>();
    for (const q of routeQueries) {
      for (const stop of q.data ?? []) {
        map.set(stop.id, stop);
      }
    }
    return map;
  }, [routeQueries]);

  const routeStops = useMemo(() => [...allRouteStopsMap.values()], [allRouteStopsMap]);

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

  function toggleRoute(routeCode: Lines) {
    setSelectedRoutes((currentRoutes) =>
      currentRoutes.includes(routeCode)
        ? currentRoutes.filter((id) => id !== routeCode)
        : [...currentRoutes, routeCode],
    );
    setSelectedStop(undefined);
  }

  function isRouteSelected(routeCode: Lines): boolean {
    return selectedRoutes.includes(routeCode);
  }

  function selectStop(stop: Stop) {
    setSelectedStop(stop);
  }

  const getDirectionForRoute = useCallback(
    (code: Lines): "I" | "V" => directionFilters[code] ?? "I",
    [directionFilters],
  );

  function setDirectionFilter(code: Lines, dir: "I" | "V") {
    setDirectionFilters((prev) => ({ ...prev, [code]: dir }));
  }

  const findStop = useCallback(
    (id: string): Stop | undefined => allRouteStopsMap.get(id),
    [allRouteStopsMap],
  );

  const value = {
    routes: initialRoutes,
    stops,
    selectedRoutes,
    isLoadingStops,
    toggleRoute,
    isRouteSelected,
    selectStop,
    searchQuery,
    setSearchQuery,
    selectedStop,
    getDirectionForRoute,
    setDirectionFilter,
    findStop,
  } satisfies BusFinderValue;

  return (
    <BusFinderContext.Provider value={value}>
      {children}
      <Drawer
        open={!!selectedStop}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedStop(undefined);
          }
        }}
      >
        <DrawerContent>
          {selectedStop && (
            <>
              <DrawerTitle className="sr-only">{selectedStop.name}</DrawerTitle>
              <DrawerDescription className="sr-only">
                hores d&apos;arribada per la parada {selectedStop.name}
              </DrawerDescription>
              <StopDetails stop={selectedStop} />
            </>
          )}
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
