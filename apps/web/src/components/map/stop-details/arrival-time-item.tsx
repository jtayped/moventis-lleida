import { ClockAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import CountdownTimer from "../../ui/countdown";
import { formatRelativeTime, formatAbsoluteTime } from "@/lib/time";
import { useState, useEffect } from "react";

interface ScheduledTime {
  arrivalTime: Date;
  isRealTime: boolean;
}

interface ArrivalTimeCardProps {
  journey: ScheduledTime;
  isClosest: boolean;
}

export const ArrivalTimeCard = ({
  journey,
  isClosest,
}: ArrivalTimeCardProps) => {
  const [diffInSeconds, setDiffInSeconds] = useState(() =>
    Math.round((journey.arrivalTime.getTime() - Date.now()) / 1000),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setDiffInSeconds(
        Math.round((journey.arrivalTime.getTime() - Date.now()) / 1000),
      );
    }, 30_000);
    return () => clearInterval(id);
  }, [journey.arrivalTime]);

  return (
    <Card className={`flex h-auto flex-col items-center p-2`}>
      <span className="flex items-center text-sm font-bold">
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
      <span className="font-mono text-xs">
        {formatAbsoluteTime(journey.arrivalTime)}
      </span>
    </Card>
  );
};

export default ArrivalTimeCard;
