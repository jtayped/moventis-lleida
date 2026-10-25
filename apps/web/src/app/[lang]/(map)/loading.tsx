import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import React from "react";

const LoadingScreen = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="grid">
        <Image
          src="/android-chrome-192x192.png"
          className="size-28"
          width={192}
          height={192}
          alt="Logo"
          priority
        />
        <div className="text-muted-foreground mx-auto mt-4 flex items-center gap-2">
          <Spinner />
          <p className="text-xs font-medium">carregant...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
