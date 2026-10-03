"use client";

import React, { useId, useState } from "react";
import { ChevronDown, ListOrdered } from "lucide-react";
import type { DayType, LinePageSegment, ServiceDays } from "@moventis/api";
import { Disclosure } from "@/components/content/note";
import { StopDiagram } from "@/components/content/stop-diagram";
import { FOCUS_RING } from "@/components/content/styles";
import {
  DAY_TYPE_LABELS,
  DAY_TYPE_ORDER,
  DAY_TYPE_PHRASES,
  formatServiceTime,
} from "@/lib/service-time";
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

const endpoints = (segment: LinePageSegment) => ({
  first: segment.stops[0]?.name,
  last: segment.stops[segment.stops.length - 1]?.name,
});

/** The name {@link SegmentName} draws, as plain text, for comparing. */
const segmentTitle = (segment: LinePageSegment) => {
  const { first, last } = endpoints(segment);
  if (!first || !last) return segment.description;
  return first === last ? `circular des de ${first}` : `${first} → ${last}`;
};

/**
 * A label per route picker button. Normally the route's ends; where two routes
 * share them (line 2 runs two loops from the same stop), Moventis' own variant
 * name tells them apart, and the stop count where even that repeats.
 */
const pickerLabels = (segments: LinePageSegment[]) => {
  const count = (values: string[], value: string) =>
    values.filter((v) => v === value).length;
  const titles = segments.map(segmentTitle);
  const names = segments.map((s) => s.description);
  return segments.map((segment, i) => {
    if (count(titles, titles[i]!) === 1) return null;
    return count(names, names[i]!) === 1
      ? segment.description
      : `${segment.description} · ${segment.stops.length} parades`;
  });
};

/** "pla d'urgell → agrònoms", read out as "pla d'urgell fins a agrònoms". */
const SegmentName = ({ segment }: { segment: LinePageSegment }) => {
  const { first, last } = endpoints(segment);
  if (!first || !last) return <>{segment.description}</>;
  if (first === last) return <>circular des de {first}</>;
  return (
    <>
      {first}
      <span aria-hidden> → </span>
      <span className="sr-only"> fins a </span>
      {last}
    </>
  );
};

const Choice = ({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    className={cn(
      "min-h-10 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
      pressed
        ? "bg-foreground text-background"
        : "bg-muted text-foreground hover:bg-muted/70",
      FOCUS_RING,
    )}
  >
    {children}
  </button>
);

/** Above this many routes the picker is a dropdown: line 6 has twelve. */
const MAX_ROUTE_BUTTONS = 4;

const runsOn = (segment: LinePageSegment, type: DayType) =>
  (segment.departures[type]?.length ?? 0) > 0;

/**
 * A line's timetable: pick the day, then the route, read the times.
 *
 * The day comes first and the route picker only offers routes that run that
 * day, so no choice leads to "no circula". Every route and day is still
 * rendered, the unpicked ones `hidden`, so the full timetable is in the HTML
 * for crawlers and without JavaScript. Times are printed whole ("06:53"): an
 * hour column with bare minutes beside it read as unexplained numbers.
 */
export const TimetableViewer = ({
  segments,
  days,
  initialDay,
}: {
  segments: LinePageSegment[];
  days: ServiceDays;
  /** Today's day type in Lleida, so the page opens on what runs today. */
  initialDay: DayType;
}) => {
  const id = useId();
  const labels = pickerLabels(segments);
  const dayTypes = DAY_TYPE_ORDER.filter((type) => days[type]);
  const [day, setDay] = useState<DayType>(
    dayTypes.includes(initialDay) ? initialDay : (dayTypes[0] ?? "weekday"),
  );
  const [picked, setPicked] = useState<number | null>(null);

  const running = segments.filter((segment) => runsOn(segment, day));
  // Until someone picks, show the route with the most buses that day: line 6's
  // first route runs four times on a Saturday. A route picked on another day
  // that does not run on this one falls back the same way.
  const busiest = running.reduce<LinePageSegment | undefined>(
    (best, segment) =>
      !best || segment.departures[day]!.length > best.departures[day]!.length
        ? segment
        : best,
    undefined,
  );
  const current =
    running.find((segment) => segment.trayectoId === picked) ?? busiest;
  const labelOf = (segment: LinePageSegment) =>
    labels[segments.indexOf(segment)] ?? <SegmentName segment={segment} />;
  const textLabelOf = (segment: LinePageSegment) =>
    labels[segments.indexOf(segment)] ?? segmentTitle(segment);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p id={`${id}-days`} className="text-sm font-medium">
          dia
        </p>
        <div
          role="group"
          aria-labelledby={`${id}-days`}
          className="grid grid-cols-3 gap-2"
        >
          {dayTypes.map((type) => (
            <Choice
              key={type}
              pressed={type === day}
              onClick={() => setDay(type)}
            >
              <span className="block text-center">{DAY_TYPE_LABELS[type]}</span>
            </Choice>
          ))}
        </div>
      </div>

      {running.length > 1 && (
        <div className="space-y-2">
          {running.length > MAX_ROUTE_BUTTONS ? (
            <>
              <label
                htmlFor={`${id}-route`}
                className="block text-sm font-medium"
              >
                recorregut{" "}
                <span className="text-muted-foreground font-normal">
                  ({running.length} {DAY_TYPE_PHRASES[day]})
                </span>
              </label>
              <div className="relative">
                <select
                  id={`${id}-route`}
                  value={current?.trayectoId}
                  onChange={(e) => setPicked(Number(e.target.value))}
                  className={cn(
                    "border-border bg-background min-h-11 w-full appearance-none rounded-lg border py-2 pr-10 pl-3 text-sm font-medium",
                    FOCUS_RING,
                  )}
                >
                  {running.map((segment) => (
                    <option key={segment.trayectoId} value={segment.trayectoId}>
                      {textLabelOf(segment)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                />
              </div>
            </>
          ) : (
            <>
              <p id={`${id}-routes`} className="text-sm font-medium">
                recorregut
              </p>
              <div
                role="group"
                aria-labelledby={`${id}-routes`}
                className="flex flex-wrap gap-2"
              >
                {running.map((segment) => (
                  <Choice
                    key={segment.trayectoId}
                    pressed={segment === current}
                    onClick={() => setPicked(segment.trayectoId)}
                  >
                    {labelOf(segment)}
                  </Choice>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {running.length === 0 && (
        <p className="bg-muted/60 rounded-lg px-4 py-3 text-sm">
          aquesta línia no circula {DAY_TYPE_PHRASES[day]}.
        </p>
      )}

      {segments.map((segment, i) => (
        <div
          key={segment.trayectoId}
          hidden={segment !== current}
          className="space-y-4"
        >
          <div className="border-border border-t pt-4">
            <h3 className="text-base leading-snug font-semibold">
              <SegmentName segment={segment} />
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {labels[i] && `${segment.description} · `}
              {segment.stops.length} parades · sortides de{" "}
              {segment.stops[0]?.name ?? "la primera parada"}
            </p>
          </div>

          {dayTypes.map((type) => {
            const times = segment.departures[type];
            return (
              <div
                key={type}
                hidden={segment !== current || type !== day}
                className="space-y-4"
              >
                {times?.length ? (
                  byPeriod(times).map((group) => (
                    <div key={group.label} className="space-y-2">
                      <h4 className="text-muted-foreground text-sm">
                        {group.label}
                      </h4>
                      <ul className="flex flex-wrap gap-1.5">
                        {group.times.map((t) => (
                          <li
                            key={t}
                            className="bg-muted rounded-md px-2 py-1 text-sm font-medium tabular-nums"
                          >
                            {formatServiceTime(t)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="bg-muted/50 text-muted-foreground rounded-lg px-4 py-3 text-sm">
                    aquest recorregut no circula {DAY_TYPE_PHRASES[type]}.
                  </p>
                )}
              </div>
            );
          })}

          <Disclosure
            summary={`veure les ${segment.stops.length} parades`}
            icon={<ListOrdered size={16} className="shrink-0" />}
          >
            <StopDiagram stops={segment.stops} />
          </Disclosure>
        </div>
      ))}
    </div>
  );
};
