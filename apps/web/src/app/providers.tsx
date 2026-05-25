import { TRPCReactProvider } from "@/trpc/react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import React from "react";

const RootProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <TRPCReactProvider>
      {children}
      <SpeedInsights />
      <Analytics />
    </TRPCReactProvider>
  );
};

export default RootProviders;
