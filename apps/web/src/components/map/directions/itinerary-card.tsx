"use client";

import React from "react";
import { ChevronRight, Footprints } from "lucide-react";
import type { BusLeg, Itinerary } from "@moventis/shared";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/time";
import TimeSourceBadge from "../stop-details/time-source-badge";
import { LineChip } from "./line-chip";
import { clock, distance, duration } from "./format";

/**
 * The itinerary at a glance: when to leave and arrive, how long, and the
 * sequence of lines with the walking between them — the row someone compares
 * against the one below it.
 */
export const ItinerarySummary = ({
  itinerary,
  now,
}: {
  itinerary: Itinerary;
  now: number;
}) => {
  const firstBus = itinerary.legs.find((l): l is BusLeg => l.kind === "bus");
  const leaveIn = (itinerary.departAt.getTime() - now) / 1000;
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-semibold tabular-nums">
          {clock(itinerary.departAt)} – {clock(itinerary.arriveAt)}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {duration(itinerary.durationS)}
        </span>
      </div>
      <ol className="flex flex-wrap items-center gap-1" aria-label="trajecte">
        {itinerary.legs.map((leg, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className="text-muted-foreground size-3.5"
                aria-hidden
              />
            )}
            {leg.kind === "walk" ? (
              <span className="text-muted-foreground flex items-center">
                <Footprints className="size-4" aria-label="a peu" />
              </span>
            ) : (
              <LineChip code={leg.lineCode} color={leg.color} />
            )}
          </li>
        ))}
      </ol>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
        <span className="tabular-nums">
          {leaveIn <= 30
            ? "surt ara"
            : `surt d'aquí a ${formatRelativeTime(leaveIn)}`}
        </span>
        {itinerary.walkMeters > 0 && (
          <span>{distance(itinerary.walkMeters)} a peu</span>
        )}
        {itinerary.transfers > 0 && (
          <span>
            {itinerary.transfers}{" "}
            {itinerary.transfers === 1 ? "transbord" : "transbords"}
          </span>
        )}
        {firstBus && <TimeSourceBadge isRealTime={firstBus.live} />}
      </div>
    </div>
  );
};

/** One option in the list; selecting it draws it on the map. */
export const ItineraryCard = React.memo(
  ({
    itinerary,
    selected,
    now,
    onSelect,
    children,
  }: {
    itinerary: Itinerary;
    selected: boolean;
    now: number;
    onSelect: (id: string) => void;
    /** The steps, when this card is the open one and there is room for them inline. */
    children?: React.ReactNode;
  }) => (
    <li
      className={cn(
        "rounded-xl border transition-colors",
        selected
          ? "bg-accent/40 border-blue-600 dark:border-blue-400"
          : "border-border",
      )}
    >
      <button
        type="button"
        aria-expanded={selected}
        onClick={() => onSelect(itinerary.id)}
        className="hover:bg-accent/60 focus-visible:ring-ring/50 w-full rounded-xl px-4 py-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <ItinerarySummary itinerary={itinerary} now={now} />
      </button>
      {children}
    </li>
  ),
);
ItineraryCard.displayName = "ItineraryCard";
