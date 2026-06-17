import BusMap from "@/components/map";
import { BusFinderProvider } from "@/context/buses";
import { api } from "@/trpc/server";
import React from "react";

const HomePage = async () => {
  const routes = await api.routes.getAll();
  return (
    <BusFinderProvider initialRoutes={routes}>
      <BusMap />
    </BusFinderProvider>
  );
};

export default HomePage;
