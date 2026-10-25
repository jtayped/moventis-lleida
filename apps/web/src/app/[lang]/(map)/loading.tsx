"use client";

import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import React from "react";
import { useLang } from "@/i18n/lang-context";
import { mapCopy } from "@/i18n/copy/map";

const LoadingScreen = () => {
  const t = mapCopy[useLang()].loading;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="grid">
        <Image
          src="/android-chrome-192x192.png"
          className="size-28"
          width={192}
          height={192}
          alt={t.logoAlt}
          priority
        />
        <div className="text-muted-foreground mx-auto mt-4 flex items-center gap-2">
          <Spinner />
          <p className="text-xs font-medium">{t.text}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
