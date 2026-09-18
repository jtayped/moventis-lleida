import { Badge } from "@/components/ui/badge";
import ArrivalTimeCard from "./arrival-time-item";
import type { Schedules } from "@moventis/shared";
import type { DriftLookup } from "@/hooks/use-arrival-drift";
import { getContrastTextColor } from "@/lib/contrast";
import { TriangleAlert } from "lucide-react";

interface StopScheduleLineProps {
  line: Schedules[number];
  color: string;
  now: number;
  getDrift: DriftLookup;
}

export const StopScheduleLine = ({
  line,
  color,
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
            // The headline card is per direction, not per stop. One big card
            // for the whole drawer made the choice of line look arbitrary —
            // what you came to read is the next bus on *your* line.
            //
            // Held by reference, not by timestamp: `getDrift` is a Map keyed by
            // object identity, and two buses of one journey can share a minute.
            // Past times are already gone — these lines come from
            // `filteredSchedules` in `index.tsx`.
            const leadTime = journeyGroup.scheduledTimes.reduce<
              (typeof journeyGroup.scheduledTimes)[number] | undefined
            >(
              (soonest, t) =>
                !soonest ||
                t.arrivalTime.getTime() < soonest.arrivalTime.getTime()
                  ? t
                  : soonest,
              undefined,
            );
            const otherTimes = journeyGroup.scheduledTimes.filter(
              (t) => t !== leadTime,
            );

            return (
              <div key={journeyGroup.name}>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium capitalize">
                  {journeyGroup.name}
                </h4>
                {leadTime && (
                  <ArrivalTimeCard
                    journey={leadTime}
                    isNext
                    now={now}
                    drift={getDrift(leadTime)}
                  />
                )}
                {otherTimes.length > 0 && (
                  <div
                    className={leadTime ? "mt-2 grid gap-2" : "grid gap-2"}
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(100px, 1fr))",
                    }}
                  >
                    {/* Two buses of the same journey can be due in the same
                        minute, and a timestamp key collides when they are. */}
                    {otherTimes.map((time, idx) => (
                      <ArrivalTimeCard
                        key={idx}
                        journey={time}
                        isNext={false}
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
