import { ClockAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import CountdownTimer from "../../ui/countdown";
import { formatRelativeTime, formatAbsoluteTime } from "@/lib/time";
import { cn } from "@/lib/utils";

interface ScheduledTime {
  arrivalTime: Date;
  isRealTime: boolean;
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
        "flex h-auto flex-col items-center p-2",
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
        {!journey.isRealTime && (
          <ClockAlert
            size={12}
            className="ml-1"
            aria-label="Hora estimada (no en temps real)"
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
    </Card>
  );
};

export default ArrivalTimeCard;
