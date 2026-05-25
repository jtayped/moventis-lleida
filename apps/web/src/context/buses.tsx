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
import React, { createContext, useContext, useState } from "react";

interface BusFinderValue {
  routes: Line[];
  stops: Stop[] | undefined;
  selectedRoutes: string[];
  isLoadingStops: boolean;
  toggleRoute: (routeId: Lines) => void;
  isRouteSelected: (routeId: Lines) => boolean;
  selectStop: (stop: Stop) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedStop: Stop | undefined;
}

const BusFinderContext = createContext<BusFinderValue | undefined>(undefined);

export const BusFinderProvider = ({
  children,
  initialRoutes, // <-- 1. Accept routes as a prop
}: {
  children: React.ReactNode;
  initialRoutes: Line[]; // <-- This data comes from the server
}) => {
  const [selectedRoutes, setSelectedRoutes] = useState<Lines[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedQuery = useDebounce(searchQuery);
  const debouncedSelectedRoutes = useDebounce(selectedRoutes);

  // 2. Remove the client-side query for routes
  // const { data: routes, isLoading: isLoadingRoutes } =
  //   api.routes.getAll.useQuery();

  // 3. Use the prop directly
  const routes = initialRoutes;

  // The query for stops remains, as it's dynamic
  const { data: stops, isLoading: isLoadingStops } = api.stops.getMany.useQuery(
    { routeCodes: debouncedSelectedRoutes, query: debouncedQuery },
    {
      enabled:
        debouncedSelectedRoutes.length > 0 || debouncedQuery.trim().length > 0,
    },
  );

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

  // 4. This check is no longer needed, as initialRoutes are guaranteed
  // if (!routes) return null;

  const value = {
    routes, // Use the prop
    stops,
    selectedRoutes,
    isLoadingStops,
    toggleRoute,
    isRouteSelected,
    selectStop,
    searchQuery,
    setSearchQuery,
    selectedStop,
  } satisfies BusFinderValue;

  return (
    <BusFinderContext.Provider value={value}>
      {children}
      <Drawer
        open={!!selectedStop}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedStop(undefined); // Close the dialog by clearing the selected stop
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
