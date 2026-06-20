import { Bus, Loader2, WifiOff } from "lucide-react";

export type LiveBusStatusValue = "idle" | "loading" | "done" | "error";

/**
 * Compact status row for the live bus prediction, shown in the stop drawer when
 * at least one line is selected. Mirrors the four states of `buses.byLine`
 * aggregated across the selected lines: searching, found (with count), none right
 * now, and unavailable.
 */
export default function LiveBusStatus({
  status,
  count,
}: {
  status: LiveBusStatusValue;
  count: number;
}) {
  if (status === "idle") return null;

  const base =
    "mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm";

  if (status === "loading") {
    return (
      <div
        className={`${base} text-muted-foreground border-border bg-muted/40`}
        aria-live="polite"
      >
        <Loader2 size={16} className="shrink-0 animate-spin" />
        <span>cercant autobusos en directe…</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`${base} text-muted-foreground border-border bg-muted/40`}>
        <WifiOff size={16} className="shrink-0" />
        <span>no s&apos;ha pogut localitzar els autobusos.</span>
      </div>
    );
  }

  // status === "done"
  if (count === 0) {
    return (
      <div className={`${base} text-muted-foreground border-border bg-muted/40`}>
        <Bus size={16} className="shrink-0" />
        <span>cap autobús en directe en aquesta línia ara mateix.</span>
      </div>
    );
  }

  return (
    <div
      className={`${base} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300`}
      aria-live="polite"
    >
      <span className="relative flex size-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
      </span>
      <span className="font-medium">
        {count === 1
          ? "1 autobús en directe al mapa"
          : `${count} autobusos en directe al mapa`}
      </span>
    </div>
  );
}
