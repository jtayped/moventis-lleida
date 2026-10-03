"use client";

import React, { useId, useState } from "react";
import type { DayType, ServiceDays, StopPage } from "@moventis/api";
import { LineBadge } from "@/components/content/line-badge";
import { FOCUS_RING } from "@/components/content/styles";
import { TimeChips } from "@/components/content/time-chips";
import { useLleidaMinutes } from "@/hooks/use-lleida-minutes";
import {
  DAY_TYPE_LABELS,
  DAY_TYPE_ORDER,
  DAY_TYPE_PHRASES,
} from "@/lib/service-time";
import { cn } from "@/lib/utils";

/**
 * What leaves this stop on the chosen day: one card per line and destination.
 *
 * Opens on today, with gone buses struck through and the next one marked, so
 * the page answers "when is the next one" before anything else. Every day is in
 * the HTML, the unpicked ones `hidden`.
 */
export const StopTimetable = ({
  stopId,
  groups,
  lines,
  days,
  initialDay,
}: {
  stopId: string;
  groups: StopPage["groups"];
  lines: Record<string, { color: string }>;
  days: ServiceDays;
  /** Today's day type in Lleida. */
  initialDay: DayType;
}) => {
  const id = useId();
  const now = useLleidaMinutes();
  const dayTypes = DAY_TYPE_ORDER.filter((type) => days[type]);
  const [day, setDay] = useState<DayType>(
    dayTypes.includes(initialDay) ? initialDay : (dayTypes[0] ?? "weekday"),
  );
  // Only after a press: a live region filled on mount is read out on load.
  const [touched, setTouched] = useState(false);
  const runningOn = (type: DayType) =>
    groups.filter((g) => g.departures[type]?.length).length;

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite">
        {touched &&
          (runningOn(day) > 0
            ? `${DAY_TYPE_LABELS[day]}: ${runningOn(day)} ${runningOn(day) === 1 ? "línia i direcció" : "línies i direccions"}`
            : `cap bus para aquí ${DAY_TYPE_PHRASES[day]}`)}
      </p>
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
            <button
              key={type}
              type="button"
              aria-pressed={type === day}
              onClick={() => {
                setDay(type);
                setTouched(true);
              }}
              className={cn(
                "min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                type === day
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/70",
                FOCUS_RING,
              )}
            >
              {DAY_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {dayTypes.map((type) => {
        const running = groups.filter((g) => g.departures[type]?.length);
        return (
          <div key={type} hidden={type !== day} className="space-y-3">
            {running.length === 0 && (
              <p className="bg-muted/60 rounded-lg px-4 py-3 text-sm">
                cap bus para aquí {DAY_TYPE_PHRASES[type]}.
              </p>
            )}
            {running.map((group) => (
              <article
                key={`${group.lineCode}/${group.destination}`}
                className="border-border space-y-3 rounded-xl border p-4"
              >
                <header className="flex items-center gap-3">
                  <LineBadge
                    code={group.lineCode}
                    color={lines[group.lineCode]?.color ?? "#888888"}
                    decorative
                  />
                  {/* Names the line too: line 1 and line 20 both loop back
                      here, and two headings that both say "fa la volta i
                      torna aquí" are no help to anyone jumping by heading. */}
                  <h3 className="min-w-0 flex-1 text-base leading-snug font-semibold">
                    <span className="sr-only">línia {group.lineCode}: </span>
                    {group.destination === stopId
                      ? "fa la volta i torna aquí"
                      : `cap a ${group.destinationName ?? "final de línia"}`}
                  </h3>
                </header>
                <TimeChips
                  times={group.departures[type]!}
                  now={type === initialDay ? now : null}
                />
              </article>
            ))}
          </div>
        );
      })}
    </div>
  );
};
