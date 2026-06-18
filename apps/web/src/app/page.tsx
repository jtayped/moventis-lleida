import BusMap from "@/components/map";
import { BusFinderProvider } from "@/context/buses";
import { api, HydrateClient } from "@/trpc/server";
import React from "react";

const HomePage = async () => {
  await Promise.all([
    api.routes.getAll.prefetch(),
    api.routes.getTodayActive.prefetch(),
  ]);
  return (
    <HydrateClient>
      <BusFinderProvider>
        <BusMap />
      </BusFinderProvider>
    </HydrateClient>
  );
};

export default HomePage;
