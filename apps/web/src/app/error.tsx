"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";

const ErrorScreen = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">alguna cosa ha fallat</h1>
      <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
        no hem pogut mostrar aquesta pàgina. si estàs a la parada, torna-ho a
        provar — sol ser cosa de la connexió.
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={reset}>torna-ho a provar</Button>
        <Button asChild variant="outline">
          <Link href="/">torna al mapa</Link>
        </Button>
      </div>
    </main>
  );
};

export default ErrorScreen;
