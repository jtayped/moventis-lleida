"use client";
import "@/styles/globals.css";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

/**
 * The root layout itself failed, so this replaces it — html and body included,
 * and with `globals.css` imported here since the layout's import never ran.
 * There is no theme script either, so this one screen is light-mode only.
 */
const GlobalError = ({
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
    <html lang="ca">
      <body className="lowercase">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-lg font-semibold">alguna cosa ha fallat</h1>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            no hem pogut carregar l&apos;aplicació. torna-ho a provar.
          </p>
          <Button onClick={reset}>torna-ho a provar</Button>
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
