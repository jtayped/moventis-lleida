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
  initialRoutes, // <-- 1. Accept routes as a prop
}: {
  children: React.ReactNode;
  initialRoutes: Route[]; // <-- This data comes from the server
}) => {
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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

  // Debounce effect for selected routes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSelectedRoutes(selectedRoutes);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [selectedRoutes]);

  // 2. Remove the client-side query for routes
  // const { data: routes, isLoading: isLoadingRoutes } =
  //   api.routes.getAll.useQuery();

  // 3. Use the prop directly
  const routes = initialRoutes;

  // The query for stops remains, as it's dynamic
  const { data: stops, isLoading: isLoadingStops } = api.stops.getMany.useQuery(
    {
      routeIds: debouncedSelectedRoutes,
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
