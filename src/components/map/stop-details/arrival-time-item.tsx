import { ClockAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import CountdownTimer from "../../ui/countdown";
import { formatRelativeTime, formatAbsoluteTime } from "@/lib/time";

type ScheduledTime = {
  arrivalTime: Date;
  isRealTime: boolean;
};

interface ArrivalTimeCardProps {
  journey: ScheduledTime;
  isClosest: boolean;
}

export const ArrivalTimeCard = ({
  journey,
  isClosest,
}: ArrivalTimeCardProps) => {
  const diffInSeconds = Math.round(
    (journey.arrivalTime.getTime() - Date.now()) / 1000,
  );

  return (
    <Card className={`flex h-auto flex-col items-center p-2`}>
      <span className="flex items-center text-sm font-bold">
        {isClosest ? (
          <CountdownTimer targetDate={journey.arrivalTime} />
        ) : (
          formatRelativeTime(diffInSeconds)
        )}
        {!journey.isRealTime && <ClockAlert size={12} className="ml-1" />}
      </span>
      <span className="font-mono text-xs">
        {formatAbsoluteTime(journey.arrivalTime)}
      </span>
    </Card>
  );
};

export default ArrivalTimeCard;
