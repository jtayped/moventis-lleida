import { ClockAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import CountdownTimer from "../ui/countdown";
import { formatRelativeTime, formatAbsoluteTime } from "@/lib/time";
import type { Schedules } from "@/types/schedules";

// Define minimal types based on usage in the original component
type Journey = Schedules[number]["journeys"][number];

interface ArrivalTimeCardProps {
  journey: Journey;
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
    <Card
      key={journey.externalJourneyId}
      className={`flex h-auto flex-col items-center p-2`}
    >
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
