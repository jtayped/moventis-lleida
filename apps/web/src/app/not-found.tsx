import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

const NotFound = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">aquesta pàgina no existeix</h1>
      <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
        potser l&apos;enllaç ha canviat.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">torna al mapa</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/linies">línies</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/parades">parades</Link>
        </Button>
      </div>
    </main>
  );
};

export default NotFound;
