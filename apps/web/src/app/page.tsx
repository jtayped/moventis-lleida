import BusMap from "@/components/map";
import { BusFinderProvider } from "@/context/buses";
import { api, HydrateClient } from "@/trpc/server";
import React from "react";

const HomePage = async () => {
  void api.routes.getAll.prefetch();
  return (
    <HydrateClient>
      <BusFinderProvider>
        <BusMap />
      </BusFinderProvider>
    </HydrateClient>
  );
};

export default HomePage;
