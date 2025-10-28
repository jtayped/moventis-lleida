import { Badge } from "@/components/ui/badge";
import ArrivalTimeCard from "./arrival-time-item";
import type { Journey, Schedules } from "@/types/schedules"; // Import Journey
import { LINE_COLORS } from "@/constants/lines";

type ScheduledTime = Journey["scheduledTimes"][number];
type Line = Schedules[number] & {
  lineCode: keyof typeof LINE_COLORS;
};

interface StopScheduleLineProps {
  line: Line;
  closestScheduledTime: ScheduledTime | null;
}

export const StopScheduleLine = ({
  line,
  closestScheduledTime,
}: StopScheduleLineProps) => {
  return (
    <div key={line.externalLineId} className="py-3">
      {/* 1. Line Header */}
      <div className="flex items-center gap-3 pr-2 pb-2">
        <span
          className="flex size-8 items-center justify-center rounded-lg text-lg text-white"
          style={{ backgroundColor: LINE_COLORS[line.lineCode] }}
        >
          {line.lineCode}
        </span>
        <span className="text-muted-foreground truncate text-lg">
          {line.lineName}
        </span>
      </div>

      {/* 2. Wrapper for all journey groups */}
      <div className="flex flex-col gap-3">
        {line.journeys.length > 0 ? (
          // 3. Map over each journey group (e.g., "agrònoms - pla d'urgell")
          line.journeys.map((journeyGroup) => (
            <div key={journeyGroup.name}>
              {/* 4. Display the journey group's name */}
              <h4 className="mb-2 text-sm font-medium text-gray-700 capitalize">
                {journeyGroup.name}
              </h4>

              {/* 5. Grid for this group's scheduled times */}
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                }}
              >
                {/* 6. Map over the scheduledTimes *within* this group */}
                {journeyGroup.scheduledTimes.map((time) => (
                  <ArrivalTimeCard
                    key={time.arrivalTime.getTime()}
                    journey={time}
                    isClosest={
                      time.arrivalTime.getTime() ===
                      closestScheduledTime?.arrivalTime.getTime()
                    }
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Fallback if there are no journeys at all
          <Badge variant="outline" className="font-normal">
            sense busos
          </Badge>
        )}
      </div>
    </div>
  );
};

export default StopScheduleLine;
