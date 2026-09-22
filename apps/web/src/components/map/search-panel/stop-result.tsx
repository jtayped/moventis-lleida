"use client";

import React from "react";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getContrastTextColor } from "@/lib/contrast";
import type { StopWithLines } from "@moventis/api";

interface StopResultProps {
  stop: StopWithLines;
  /** Every line's colour, keyed by code. See `useColorByLine`. */
  colorByLine: Map<string, string>;
  saved: boolean;
  onSelect: (externalId: string) => void;
}

/** A line whose colour we do not have — a stop can outlive a route's removal. */
const UNKNOWN_LINE_COLOR = "#71717a";

/**
 * One row of search results: the stop's name, the lines that serve it, and a
 * star if it is saved.
 *
 * Takes everything as props and reads no context, which is what keeps
 * `React.memo` worth having — a context read bypasses it, and typing into the
 * field re-renders this list on every debounce tick.
 *
 * It issues no query of its own, and must not gain one. The stops it draws are
 * already fetched for the map's pins; giving the list its own `stops.getMany`
 * would put a second search on the wire for every keystroke and, worse, let the
 * list and the pins disagree about what matched.
 */
export const StopResult = React.memo(
  ({ stop, colorByLine, saved, onSelect }: StopResultProps) => (
    <li>
      <button
        type="button"
        onClick={() => onSelect(stop.externalId)}
        className="hover:bg-accent focus-visible:ring-ring/50 flex w-full flex-col items-start gap-1.5 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <span className="flex w-full items-center gap-2">
          <span className="min-w-0 flex-1 text-sm font-medium">
            {stop.name}
          </span>
          {saved && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-amber-400 text-zinc-900">
              <Star size={12} className="fill-current" aria-hidden="true" />
              <span className="sr-only">preferida</span>
            </span>
          )}
        </span>
        {stop.lineCodes.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {stop.lineCodes.map((code) => {
              const color = colorByLine.get(code) ?? UNKNOWN_LINE_COLOR;
              return (
                <Badge
                  key={code}
                  className="size-5 justify-center rounded-sm p-0 text-[11px] font-semibold"
                  style={{
                    backgroundColor: color,
                    color: getContrastTextColor(color),
                  }}
                  aria-label={`línia ${code}`}
                >
                  {code}
                </Badge>
              );
            })}
          </span>
        )}
      </button>
    </li>
  ),
);
StopResult.displayName = "StopResult";
