import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

const NotFound = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">aquesta pàgina no existeix</h1>
      <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
        potser l&apos;enllaç ha canviat. des del mapa hi trobaràs totes les
        línies i parades.
      </p>
      <Button asChild>
        <Link href="/">torna al mapa</Link>
      </Button>
    </main>
  );
};

export default NotFound;
