"use client";

import { ChevronDown } from "lucide-react";
import { FOCUS_RING } from "@/components/content/styles";
import { formatServiceTime } from "@/lib/service-time";
import { cn } from "@/lib/utils";

/** Parts of the day the times are grouped under, by start minute. */
const PERIODS = [
  { label: "matí", until: 12 * 60 },
  { label: "tarda", until: 20 * 60 },
  // Open-ended: n1's times past midnight are stored past 1440 and stay here.
  { label: "nit", until: Infinity },
] as const;

const byPeriod = (times: number[]) => {
  let from = 0;
  return PERIODS.map((period) => {
    const group = times.filter((t) => t >= from && t < period.until);
    from = period.until;
    return { label: period.label, times: group };
  }).filter((group) => group.times.length > 0);
};

const PeriodChips = ({
  times,
  next,
  faded = false,
}: {
  times: number[];
  /** The time to fill in and label "pròxim". */
  next?: number;
  faded?: boolean;
}) => (
  <div className="space-y-3">
    {byPeriod(times).map((group) => (
      <div key={group.label} className="space-y-1.5">
        <h4 className="text-muted-foreground text-sm">{group.label}</h4>
        <ul className="flex flex-wrap gap-1.5">
          {group.times.map((t) => (
            <li
              key={t}
              className={cn(
                "rounded-md px-2 py-1 text-sm font-medium tabular-nums",
                t === next
                  ? "bg-foreground text-background"
                  : faded
                    ? "bg-muted/50 text-muted-foreground"
                    : "bg-muted",
              )}
            >
              {formatServiceTime(t)}
              {t === next && <span className="ml-1.5 font-normal">pròxim</span>}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

/**
 * Timetable times as chips, grouped into matí, tarda and nit.
 *
 * Given `now` (minutes after Lleida's midnight, passed only when the times are
 * today's), it leads with what is still to come, the next bus filled in and
 * labelled, and folds the ones already gone behind a toggle underneath. At
 * eight in the evening that is the difference between the next bus on top and
 * eighty spent times to scroll past first.
 */
export const TimeChips = ({
  times,
  now,
}: {
  times: number[];
  now?: number | null;
}) => {
  if (now === null || now === undefined) return <PeriodChips times={times} />;

  const upcoming = times.filter((t) => t >= now);
  const gone = times.filter((t) => t < now);

  return (
    <div className="space-y-3">
      {upcoming.length > 0 ? (
        <PeriodChips times={upcoming} next={upcoming[0]} />
      ) : (
        <p className="bg-muted/60 rounded-lg px-3 py-2 text-sm">
          avui ja no en passa cap més.
        </p>
      )}
      {gone.length > 0 && (
        <details className="group">
          <summary
            className={cn(
              "text-muted-foreground hover:text-foreground flex min-h-10 w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm transition-colors [&::-webkit-details-marker]:hidden",
              FOCUS_RING,
            )}
          >
            {gone.length === 1
              ? "veure l'1 que ja ha passat"
              : `veure els ${gone.length} que ja han passat`}
            <ChevronDown
              size={16}
              aria-hidden
              className="shrink-0 group-open:rotate-180 motion-safe:transition-transform"
            />
          </summary>
          <div className="pt-2">
            <PeriodChips times={gone} faded />
          </div>
        </details>
      )}
    </div>
  );
};
