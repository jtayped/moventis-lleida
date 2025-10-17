import BusMap from "@/components/map";
import { BusFinderProvider } from "@/context/buses";
import { api } from "@/trpc/server";
import React from "react";

const HomePage = async () => {
  void api.routes.getAll.prefetch();
  return (
    <BusFinderProvider>
      <BusMap />
    </BusFinderProvider>
  );
};

export default HomePage;
