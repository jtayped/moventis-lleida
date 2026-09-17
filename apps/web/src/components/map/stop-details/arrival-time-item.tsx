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
  isClosest: boolean;
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
 * Renders nothing under a minute: at a 30 s refresh, sub-minute movement is
 * fetch-time jitter rather than a bus running late, and a chip that flickers on
 * and off is worse than no chip.
 */
const DriftChip = ({
  drift,
  isClosest,
}: {
  drift: ArrivalDrift;
  isClosest: boolean;
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
        isClosest ? "text-sm" : "text-[10px]",
        later
          ? "text-red-600 dark:text-red-400"
          : "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {later ? "▲ +" : "▼ −"}
      {magnitude} min
    </span>
  );
};

export const ArrivalTimeCard = ({
  journey,
  isClosest,
  now,
  drift,
}: ArrivalTimeCardProps) => {
  const diffInSeconds = Math.round(
    (journey.arrivalTime.getTime() - now) / 1000,
  );

  return (
    <Card
      className={cn(
        "flex h-auto flex-col items-center gap-0.5 p-2",
        isClosest && "border-foreground/20 bg-foreground/[0.04] py-4",
      )}
    >
      <span
        className={cn(
          "flex items-center font-bold",
          isClosest ? "text-3xl" : "text-sm",
        )}
      >
        {isClosest ? (
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
      <span
        className={cn(
          "font-mono",
          isClosest ? "text-muted-foreground text-sm" : "text-xs",
        )}
      >
        {formatAbsoluteTime(journey.arrivalTime)}
      </span>
      {/* Nothing reserved when there is no chip: the cards sit in an `auto-fill`
          grid that sizes rows to their tallest member, so a card without one
          simply ends sooner. */}
      {drift && <DriftChip drift={drift} isClosest={isClosest} />}
      <TimeSourceBadge
        isRealTime={journey.isRealTime}
        className={isClosest ? "mt-0.5 text-xs" : "text-[10px]"}
      />
    </Card>
  );
};

export default ArrivalTimeCard;
