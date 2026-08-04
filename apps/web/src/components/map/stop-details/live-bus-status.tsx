import { Loader2, MapPinOff, Radar } from "lucide-react";

export type LiveBusStatusValue = "idle" | "loading" | "done" | "error";

/**
 * Status of the *bus pins on the map* — not of this stop's arrival times.
 *
 * Keeping those two apart is the whole job of this component. It reports on
 * `buses.byLine`, which infers where each bus physically is and draws it on the
 * map; the timetable below is a separate request that keeps working when this
 * one fails. The old copy ("no s'ha pogut localitzar els autobusos", under a
 * crossed-out wifi icon) read as a total outage, so a failure here looked like
 * the arrival times had died too.
 *
 * So every branch names the map explicitly, and the failure branch says outright
 * that the times are unaffected.
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
    "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm";
  const muted = `${base} text-muted-foreground border-border bg-muted/40`;

  if (status === "loading") {
    return (
      <div className={muted} aria-live="polite">
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" />
        <span>situant els autobusos al mapa…</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={muted}>
        <MapPinOff size={16} className="mt-0.5 shrink-0" />
        <span>
          no podem situar els autobusos al mapa ara mateix.
          <span className="block text-xs opacity-80">
            les hores d&apos;arribada d&apos;aquí sota segueixen funcionant.
          </span>
        </span>
      </div>
    );
  }

  // status === "done"
  if (count === 0) {
    return (
      <div className={muted}>
        <Radar size={16} className="mt-0.5 shrink-0" />
        <span>
          cap autobús d&apos;aquesta línia envia la seva posició ara mateix.
          <span className="block text-xs opacity-80">
            per això no en veuràs cap al mapa.
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${base} items-center border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300`}
      aria-live="polite"
    >
      <span aria-hidden className="relative flex size-2.5 shrink-0">
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
