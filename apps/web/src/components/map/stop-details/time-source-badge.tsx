import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * States, in words, where one arrival time came from.
 *
 * The Moventis API marks each departure `real:"S"` (Moventis is tracking that
 * vehicle, so the time is a live estimate) or `real:"N"` (nothing is tracking
 * it, so the time is the published timetable). Note what this is *not*: the
 * feed carries no position and no vehicle id, only a time, so neither state
 * may be described as a bus sending its location. That difference decides whether you can trust the
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
  iconOnly = false,
}: {
  isRealTime: boolean;
  className?: string;
  /**
   * Glyph alone, word hidden. On an arrival card the legend above the list has
   * already said what the pulse and the clock mean, so repeating it on every
   * card costs a line of height per card and tells you nothing new. The word
   * stays in the accessible name — this is a visual shorthand, not a quieter
   * label.
   */
  iconOnly?: boolean;
}) {
  const base = "flex items-center gap-1 leading-none font-medium";
  const Label = ({ children }: { children: string }) =>
    iconOnly ? <span className="sr-only">{children}</span> : <>{children}</>;

  if (isRealTime) {
    return (
      <span
        className={cn(
          base,
          "text-emerald-700 dark:text-emerald-400",
          className,
        )}
        title="hora en temps real: moventis segueix aquest bus i n'estima l'arribada. no en rebem la posició, només l'hora."
      >
        <span aria-hidden className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        <Label>en directe</Label>
      </span>
    );
  }

  return (
    <span
      className={cn(base, "text-muted-foreground", className)}
      title="hora de l'horari oficial: ara mateix no hi ha cap estimació en temps real per a aquest bus."
    >
      <Clock size={10} className="shrink-0" aria-hidden />
      <Label>horari</Label>
    </span>
  );
}
