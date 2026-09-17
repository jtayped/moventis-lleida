import CookieBanner from "@/components/cookie-banner";
import { TRPCReactProvider } from "@/trpc/react";
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
    </TRPCReactProvider>
  );
};

export default RootProviders;
