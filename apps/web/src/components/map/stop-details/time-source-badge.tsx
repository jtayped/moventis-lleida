import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * States, in words, where one arrival time came from.
 *
 * The Moventis API marks each departure `real:"S"` (the bus is reporting, so the
 * time is a live prediction) or `real:"N"` (nothing is reporting, so the time is
 * the published timetable). That difference decides whether you can trust the
 * countdown, and it used to be carried only by a bare `ClockAlert` glyph with an
 * `aria-label` — legible to whoever wrote it and to nobody else.
 *
 * Both states are labelled, not just the fallback: a marked exception with an
 * unmarked default reads as "something is wrong here", when in fact both are
 * normal. The green pulse is the same one the live buses wear on the map, so
 * "pulsing green" means one thing across the whole app.
 */
export default function TimeSourceBadge({
  isRealTime,
  className,
}: {
  isRealTime: boolean;
  className?: string;
}) {
  const base = "flex items-center gap-1 leading-none font-medium";

  if (isRealTime) {
    return (
      <span
        className={cn(base, "text-emerald-700 dark:text-emerald-400", className)}
        title="hora en temps real: el bus està enviant la seva posició"
      >
        <span aria-hidden className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        en directe
      </span>
    );
  }

  return (
    <span
      className={cn(base, "text-muted-foreground", className)}
      title="hora de l'horari oficial: aquest bus no envia la seva posició ara mateix"
    >
      <Clock size={10} className="shrink-0" aria-hidden />
      horari
    </span>
  );
}
