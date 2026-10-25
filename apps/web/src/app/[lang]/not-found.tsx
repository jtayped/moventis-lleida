"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/link";
import React from "react";
import { useLang } from "@/i18n/lang-context";
import { mapCopy } from "@/i18n/copy/map";

const NotFound = () => {
  const t = mapCopy[useLang()].notFound;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">{t.title}</h1>
      <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
        {t.text}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">{t.backToMap}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/linies">{t.lines}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/parades">{t.stops}</Link>
        </Button>
      </div>
    </main>
  );
};

export default NotFound;
