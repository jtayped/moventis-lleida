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
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const { data: routes, isLoading: isLoadingRoutes } =
    api.routes.getAll.useQuery();

  // 4. Pass the debounced query to the tRPC hook
  const { data: stops, isLoading: isLoadingStops } = api.stops.getMany.useQuery(
    {
      routeIds: selectedRoutes,
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
    return selectedRoutes.includes(routeId);
  }

  function selectStop(stop: Stop) {
    setSelectedStop(stop);
  }

  if (!routes) return null;

  // 5. Provide the new state and setter function in the context value
  const value = {
    routes,
    stops,
    selectedRoutes,
    isLoadingRoutes,
    isLoadingStops,
    toggleRoute,
    isRouteSelected,
    selectStop,
    searchQuery,
    setSearchQuery,
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
