import { Badge } from "@/components/ui/badge";
import ArrivalTimeCard from "./arrival-time-item";
import type { Journey, Schedules } from "@moventis/shared";
import { LINE_COLORS } from "@moventis/shared";
import { getContrastTextColor } from "@/lib/contrast";

type ScheduledTime = Journey["scheduledTimes"][number];

interface StopScheduleLineProps {
  line: Schedules[number];
  closestScheduledTime: ScheduledTime | null;
  now: number;
}

export const StopScheduleLine = ({
  line,
  closestScheduledTime,
  now,
}: StopScheduleLineProps) => {
  const lineColor = LINE_COLORS[line.lineCode];

  return (
    <div className="py-3">
      <div className="flex items-center gap-3 pr-2 pb-2">
        <span
          className="flex size-8 items-center justify-center rounded-lg text-lg"
          style={{
            backgroundColor: lineColor,
            color: getContrastTextColor(lineColor),
          }}
        >
          {line.lineCode}
        </span>
        <span className="text-muted-foreground truncate text-lg">
          {line.lineName}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {line.journeys.length > 0 ? (
          line.journeys.map((journeyGroup) => {
            const closestTime = journeyGroup.scheduledTimes.find(
              (t) => t.arrivalTime.getTime() === closestScheduledTime?.arrivalTime.getTime(),
            );
            const otherTimes = journeyGroup.scheduledTimes.filter((t) => t !== closestTime);

            return (
              <div key={journeyGroup.name}>
                <h4 className="mb-2 text-sm font-medium text-gray-700 capitalize">
                  {journeyGroup.name}
                </h4>
                {closestTime && (
                  <ArrivalTimeCard journey={closestTime} isClosest now={now} />
                )}
                {otherTimes.length > 0 && (
                  <div
                    className={closestTime ? "mt-2 grid gap-2" : "grid gap-2"}
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}
                  >
                    {otherTimes.map((time) => (
                      <ArrivalTimeCard
                        key={time.arrivalTime.getTime()}
                        journey={time}
                        isClosest={false}
                        now={now}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <Badge variant="outline" className="font-normal">
            sense busos
          </Badge>
        )}
      </div>
    </div>
  );
};

export default StopScheduleLine;
