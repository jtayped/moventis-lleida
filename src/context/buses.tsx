"use client";
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
  const { data: stops, isLoading: isLoadingStops } = api.stops.get.useQuery({
    routeIds: selectedRoutes,
    query: debouncedQuery,
  });

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
    searchQuery,
    setSearchQuery,
  } satisfies BusFinderValue;

  return (
    <BusFinderContext.Provider value={value}>
      {children}
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
