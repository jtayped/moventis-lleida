"use client";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/link";
import { useEffect } from "react";
import { useLang } from "@/i18n/lang-context";
import { mapCopy } from "@/i18n/copy/map";

const ErrorScreen = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  const t = mapCopy[useLang()].errorPage;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">{t.title}</h1>
      <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
        {t.text}
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={reset}>{t.retry}</Button>
        <Button asChild variant="outline">
          <Link href="/">{t.backToMap}</Link>
        </Button>
      </div>
    </main>
  );
};

export default ErrorScreen;
