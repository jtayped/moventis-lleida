"use client";
import StopDetails from "@/components/stop/details";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { api } from "@/trpc/react";
import type { Route, Stop } from "@prisma/client";
import React, { createContext, useContext, useEffect, useState } from "react";

interface BusFinderValue {
  routes: Route[];
  stops: Stop[] | undefined;
  selectedRoutes: string[];
  isLoadingRoutes: boolean;
  isLoadingStops: boolean;
  toggleRoute: (routeId: string) => void;
  isRouteSelected: (routeId: string) => boolean;
  selectStop: (stop: Stop) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedStop: Stop | undefined;
}

const BusFinderContext = createContext<BusFinderValue | undefined>(undefined);

export const BusFinderProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // --- Debouncing States ---
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // 1. Add new state for debounced routes
  const [debouncedSelectedRoutes, setDebouncedSelectedRoutes] = useState<
    string[]
  >([]);

  // Debounce effect for search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // 2. Add debounce effect for selected routes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSelectedRoutes(selectedRoutes);
    }, 200); // You can adjust the delay

    return () => {
      clearTimeout(timer);
    };
  }, [selectedRoutes]); // This effect runs whenever selectedRoutes changes

  const { data: routes, isLoading: isLoadingRoutes } =
    api.routes.getAll.useQuery();

  // 3. Pass the debounced states to the tRPC hook
  const { data: stops, isLoading: isLoadingStops } = api.stops.getMany.useQuery(
    {
      routeIds: debouncedSelectedRoutes, // Use the debounced routes
      query: debouncedQuery,
    },
  );

  function toggleRoute(routeId: string) {
    setSelectedRoutes((currentRoutes) =>
      currentRoutes.includes(routeId)
        ? currentRoutes.filter((id) => id !== routeId)
        : [...currentRoutes, routeId],
    );
  }

  function isRouteSelected(routeId: string): boolean {
    // This should still use the immediate state for responsive UI
    return selectedRoutes.includes(routeId);
  }

  function selectStop(stop: Stop) {
    setSelectedStop(stop);
  }

  if (!routes) return null;

  const value = {
    routes,
    stops,
    selectedRoutes, // Provide the immediate state to the context for responsive UI
    isLoadingRoutes,
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
          {selectedStop && <StopDetails stop={selectedStop} />}
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
