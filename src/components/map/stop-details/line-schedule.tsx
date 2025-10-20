import { Badge } from "@/components/ui/badge";
import ArrivalTimeCard from "./arrival-time-item";
import type { Schedules } from "@/types/schedules";

type Line = Schedules[number];

interface StopScheduleLineProps {
  line: Line;
  closestJourneyId: string | null;
}

export const StopScheduleLine = ({
  line,
  closestJourneyId,
}: StopScheduleLineProps) => {
  return (
    <div key={line.externalLineId} className="py-3">
      <div className="flex items-center gap-3 pr-2 pb-2">
        <span className="text-xl font-bold text-blue-600">{line.lineCode}</span>
        <span className="truncate text-lg text-muted-foreground">{line.lineName}</span>
      </div>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
        }}
      >
        {line.journeys.length > 0 ? (
          line.journeys.map((journey) => (
            <ArrivalTimeCard
              key={journey.externalJourneyId}
              journey={journey}
              isClosest={journey.externalJourneyId === closestJourneyId}
            />
          ))
        ) : (
          <Badge variant="outline" className="font-normal">
            No buses
          </Badge>
        )}
      </div>
    </div>
  );
};

export default StopScheduleLine;
