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
  approximateCount = 0,
}: {
  status: LiveBusStatusValue;
  /** Buses drawn for the lines that serve this stop. */
  count: number;
  /**
   * How many of those sit in a bracket wider than two adjacent stops — their
   * marker is a point estimate inside that bracket, not a fix. The banner says
   * so rather than let every marker read as equally precise.
   */
  approximateCount?: number;
}) {
  if (status === "idle") return null;

  const base =
    "mt-2 flex items-start gap-2 rounded-lg border px-3 py-1.5 text-sm";
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
          cap bus d&apos;aquesta línia té una hora en temps real ara mateix.
          <span className="block text-xs opacity-80">
            per això no en podem situar cap al mapa.
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${base} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300`}
      aria-live="polite"
    >
      <span aria-hidden className="relative mt-1.5 flex size-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
      </span>
      <span>
        <span className="font-medium">
          {count === 1
            ? "1 autobús situat al mapa"
            : `${count} autobusos situats al mapa`}
        </span>
        {/* Said every time, not only when a position is a loose one: *all* of
            them are deduced. "en directe al mapa" read as a vehicle reporting
            its coordinates, which is not something Moventis publishes. */}
        <span className="block text-xs opacity-80">
          deduïm el tram de les hores d&apos;arribada; moventis no en publica la
          posició.
        </span>
        {approximateCount > 0 && (
          <span className="block text-xs opacity-80">
            {approximateCount === 1
              ? "1 amb el tram aproximat"
              : `${approximateCount} amb el tram aproximat`}
          </span>
        )}
      </span>
    </div>
  );
}
