import { Accessibility } from "lucide-react";
import { driftMinutes, type ArrivalDrift } from "@moventis/shared";
import { Card } from "@/components/ui/card";
import CountdownTimer from "../../ui/countdown";
import TimeSourceBadge from "./time-source-badge";
import { formatRelativeTime, formatAbsoluteTime } from "@/lib/time";
import { cn } from "@/lib/utils";

interface ScheduledTime {
  arrivalTime: Date;
  isRealTime: boolean;
  accessible: boolean | null;
}

interface ArrivalTimeCardProps {
  journey: ScheduledTime;
  /** The soonest bus in this direction — one headline card per journey group. */
  isNext: boolean;
  now: number;
  /** How far this bus has moved since we first showed it. Absent when the
   *  setting is off, or on the first refresh that listed it. */
  drift?: ArrivalDrift;
}

/**
 * "▲ +2 min" / "▼ −1 min": later than first promised, or earlier.
 *
 * The arrow carries the same meaning as the colour, deliberately — red and
 * green alone are the one pair of hues a good share of people cannot separate,
 * and this is the bit of the card that changes a decision.
 *
 * The headline card spells the arrow out ("+2 min tard"), because it is the one
 * a glance lands on and it has the width to say it. The small cards keep the
 * arrow alone rather than repeating the word a dozen times down the grid.
 *
 * Renders nothing under a minute: at a 30 s refresh, sub-minute movement is
 * fetch-time jitter rather than a bus running late, and a chip that flickers on
 * and off is worse than no chip.
 */
const DriftChip = ({
  drift,
  isNext,
}: {
  drift: ArrivalDrift;
  isNext: boolean;
}) => {
  const minutes = driftMinutes(drift.deltaMs);
  if (minutes === 0) return null;

  const later = minutes > 0;
  const magnitude = Math.abs(minutes);
  const baseline = formatAbsoluteTime(new Date(drift.baselineMs));
  // Without this the reading is "late against a prediction", which is not what
  // a timetable baseline means.
  const against = drift.baselineIsRealTime ? "" : " segons l'horari";
  const label = `${magnitude} ${magnitude === 1 ? "minut" : "minuts"} ${
    later ? "més tard" : "abans"
  } del previst (${baseline})${against}`;

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "font-semibold whitespace-nowrap tabular-nums",
        isNext ? "text-sm" : "text-[10px]",
        later
          ? "text-red-600 dark:text-red-400"
          : "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {later ? "▲ +" : "▼ −"}
      {magnitude} min{isNext ? (later ? " tard" : " aviat") : ""}
    </span>
  );
};

export const ArrivalTimeCard = ({
  journey,
  isNext,
  now,
  drift,
}: ArrivalTimeCardProps) => {
  const diffInSeconds = Math.round(
    (journey.arrivalTime.getTime() - now) / 1000,
  );
  const isTimetable = !journey.isRealTime;

  return (
    <Card
      className={cn(
        "flex h-auto flex-col items-center gap-0.5 p-2",
        // A timetable time is a printed promise, not a bus reporting in. The
        // dashed edge says so without leaning on colour, which is the half of
        // the signal that survives both themes and colour blindness.
        isTimetable && "bg-muted/40 border-dashed",
        isNext && "py-4",
        isNext &&
          (journey.isRealTime
            ? "border-foreground/20 bg-foreground/[0.04]"
            : "border-foreground/10"),
      )}
    >
      <span
        className={cn(
          "flex items-center font-bold",
          isNext ? "text-3xl" : "text-sm",
          // The headline keeps full contrast even off the timetable: it is what
          // the card is for, and the dashed surface already says where it came
          // from.
          isTimetable && !isNext && "text-muted-foreground",
        )}
      >
        {isNext ? (
          <CountdownTimer targetDate={journey.arrivalTime} />
        ) : (
          formatRelativeTime(diffInSeconds)
        )}
        {journey.accessible && (
          <Accessibility
            size={12}
            className="ml-1"
            aria-label="Vehicle accessible"
            role="img"
          />
        )}
      </span>
      {/* The source glyph sits with the clock time it qualifies, rather than on
          a line of its own — the legend above the list already carries the
          words, and a row per card is a row the timetable does not get. */}
      <span
        className={cn(
          "flex items-center gap-1",
          isNext ? "text-muted-foreground text-sm" : "text-xs",
        )}
      >
        <TimeSourceBadge isRealTime={journey.isRealTime} iconOnly />
        <span className="font-mono">
          {formatAbsoluteTime(journey.arrivalTime)}
        </span>
      </span>
      {/* Nothing reserved when there is no chip: the cards sit in an `auto-fill`
          grid that sizes rows to their tallest member, so a card without one
          simply ends sooner. */}
      {drift && <DriftChip drift={drift} isNext={isNext} />}
    </Card>
  );
};

export default ArrivalTimeCard;
