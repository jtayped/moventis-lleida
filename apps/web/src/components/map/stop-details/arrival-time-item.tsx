import { Accessibility } from "lucide-react";
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
}

export const ArrivalTimeCard = ({
  journey,
  isClosest,
  now,
}: ArrivalTimeCardProps) => {
  const diffInSeconds = Math.round((journey.arrivalTime.getTime() - now) / 1000);

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
          isClosest ? "text-sm text-muted-foreground" : "text-xs",
        )}
      >
        {formatAbsoluteTime(journey.arrivalTime)}
      </span>
      <TimeSourceBadge
        isRealTime={journey.isRealTime}
        className={isClosest ? "mt-0.5 text-xs" : "text-[10px]"}
      />
    </Card>
  );
};

export default ArrivalTimeCard;
