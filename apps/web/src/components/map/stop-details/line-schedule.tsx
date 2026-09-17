import { Badge } from "@/components/ui/badge";
import ArrivalTimeCard from "./arrival-time-item";
import type { Journey, Schedules } from "@moventis/shared";
import type { DriftLookup } from "@/hooks/use-arrival-drift";
import { getContrastTextColor } from "@/lib/contrast";
import { TriangleAlert } from "lucide-react";

type ScheduledTime = Journey["scheduledTimes"][number];

interface StopScheduleLineProps {
  line: Schedules[number];
  color: string;
  closestScheduledTime: ScheduledTime | null;
  now: number;
  getDrift: DriftLookup;
}

export const StopScheduleLine = ({
  line,
  color,
  closestScheduledTime,
  now,
  getDrift,
}: StopScheduleLineProps) => {
  return (
    <div className="py-3">
      <div className="flex items-center gap-3 pr-2 pb-2">
        <span
          className="flex size-8 items-center justify-center rounded-lg text-lg"
          style={{
            backgroundColor: color,
            color: getContrastTextColor(color),
          }}
        >
          {line.lineCode}
        </span>
        <span className="text-muted-foreground truncate text-lg">
          {line.lineName}
        </span>
      </div>

      {line.incidencias != null && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>incidència de servei en aquesta línia</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {line.journeys.length > 0 ? (
          line.journeys.map((journeyGroup) => {
            // By reference, not by timestamp: `closestScheduledTime` is picked
            // from these very objects, and two lines arriving at the same minute
            // used to *both* render as the big highlighted next bus.
            const closestTime = journeyGroup.scheduledTimes.find(
              (t) => t === closestScheduledTime,
            );
            const otherTimes = journeyGroup.scheduledTimes.filter((t) => t !== closestTime);

            return (
              <div key={journeyGroup.name}>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium capitalize">
                  {journeyGroup.name}
                </h4>
                {closestTime && (
                  <ArrivalTimeCard
                    journey={closestTime}
                    isClosest
                    now={now}
                    drift={getDrift(closestTime)}
                  />
                )}
                {otherTimes.length > 0 && (
                  <div
                    className={closestTime ? "mt-2 grid gap-2" : "grid gap-2"}
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}
                  >
                    {/* Two buses of the same journey can be due in the same
                        minute, and a timestamp key collides when they are. */}
                    {otherTimes.map((time, idx) => (
                      <ArrivalTimeCard
                        key={idx}
                        journey={time}
                        isClosest={false}
                        now={now}
                        drift={getDrift(time)}
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
