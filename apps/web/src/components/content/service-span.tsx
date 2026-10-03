import type { DaySummary, DayType, ServiceDays } from "@moventis/api";
import {
  DAY_TYPE_LABELS,
  DAY_TYPE_ORDER,
  formatServiceTime,
} from "@/lib/service-time";

/**
 * The service day the bars are drawn on: 05:00 to 05:00 the next morning. Every
 * day line starts after 06:30 and the night line ends by 05:00, so a whole day
 * fits and n1 lands on the right-hand end, where night is.
 */
const AXIS_START = 5 * 60;
const AXIS_SPAN = 24 * 60;

/** Where a time sits on the track, as a CSS percentage. */
const offset = (minutes: number) =>
  `${(((minutes - AXIS_START) / AXIS_SPAN) * 100).toFixed(2)}%`;

/** How much of the track a stretch of minutes covers, as a CSS percentage. */
const length = (minutes: number) =>
  `${((minutes / AXIS_SPAN) * 100).toFixed(2)}%`;

/**
 * When a line runs, as one bar per day type on a 24-hour track, with the first
 * and last bus beside it. Lets the index be scanned for "which lines still run
 * late" without reading fourteen pairs of times. The bar is drawn in
 * `var(--line)`; the times beside it carry the same information as text.
 */
export const ServiceSpan = ({
  summary,
  days,
}: {
  summary: Partial<Record<DayType, DaySummary>>;
  days: ServiceDays;
}) => (
  <dl className="space-y-1.5">
    {DAY_TYPE_ORDER.filter((type) => days[type]).map((type) => {
      const day = summary[type];
      return (
        <div
          key={type}
          className="grid grid-cols-[5rem_1fr] items-center gap-2 text-sm"
        >
          <dt className="text-muted-foreground">{DAY_TYPE_LABELS[type]}</dt>
          <dd className="flex items-center gap-2">
            <span
              className="bg-muted relative h-2 flex-1 rounded-full"
              aria-hidden
            >
              {day && (
                <span
                  className="absolute inset-y-0 rounded-full bg-(--line)"
                  style={{
                    left: offset(day.first),
                    width: length(day.last - day.first),
                  }}
                />
              )}
            </span>
            <span className="w-[6.75rem] shrink-0 text-right tabular-nums">
              {day ? (
                `${formatServiceTime(day.first)}–${formatServiceTime(day.last)}`
              ) : (
                <span className="text-muted-foreground">no circula</span>
              )}
            </span>
          </dd>
        </div>
      );
    })}
  </dl>
);
