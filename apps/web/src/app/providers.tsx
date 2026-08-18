import CookieBanner from "@/components/cookie-banner";
import { TRPCReactProvider } from "@/trpc/react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import React from "react";

const RootProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <TRPCReactProvider>
      {children}
      {/* Sits outside `BusFinderProvider` on purpose — the notice is about the
          device, not about the map, and shows on every route. It reaches
          `usePreferides` through the module-level fan-out in
          `use-cookie-consent.ts`, not through this tree. */}
      <CookieBanner />
      <SpeedInsights />
      <Analytics />
    </TRPCReactProvider>
  );
};

export default RootProviders;
