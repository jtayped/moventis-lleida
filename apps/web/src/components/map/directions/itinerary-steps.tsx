"use client";

import { Flag, Footprints } from "lucide-react";
import type { Itinerary } from "@moventis/shared";

import { LineChip } from "./line-chip";
import { LiveBadge } from "./live-badge";
import { clock, distance, towards } from "./format";

/**
 * The itinerary as instructions, one row per leg, on a rail that carries the
 * line's colour while riding and a dotted grey one while walking — the same
 * two strokes the map draws.
 */
export const ItinerarySteps = ({
  itinerary,
  destinationLabel,
}: {
  itinerary: Itinerary;
  destinationLabel: string;
}) => (
  <ol className="space-y-0 px-4 pb-4" aria-label="indicacions pas a pas">
    {itinerary.legs.map((leg, i) => {
      if (leg.kind === "walk") {
        const target = leg.toStop?.name ?? destinationLabel;
        return (
          <li key={i} className="flex gap-3">
            <div className="flex w-6 flex-col items-center">
              <Footprints className="text-muted-foreground mt-2.5 size-4 shrink-0" />
              <div className="border-muted-foreground/40 mt-1 w-0 flex-1 border-l-2 border-dotted" />
            </div>
            <div className="min-w-0 flex-1 py-2 text-sm">
              <p>
                camina {distance(leg.meters)} fins a{" "}
                <span className="font-medium">{target}</span>
              </p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {clock(leg.startAt)} – {clock(leg.endAt)}
              </p>
            </div>
          </li>
        );
      }
      const between = leg.stops.length - 2;
      return (
        <li key={i} className="flex gap-3">
          <div className="flex w-6 flex-col items-center">
            <span
              className="mt-3 size-3 shrink-0 rounded-full border-2 bg-white"
              style={{ borderColor: leg.color }}
            />
            <div
              className="w-1 flex-1 rounded-full"
              style={{ backgroundColor: leg.color }}
            />
            <span
              className="mb-3 size-3 shrink-0 rounded-full border-2 bg-white"
              style={{ borderColor: leg.color }}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2 py-2 text-sm">
            <div>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold tabular-nums">
                  {clock(leg.departAt)}
                </span>
                <span className="font-medium">{leg.from.name}</span>
              </p>
              <LiveBadge leg={leg} />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <LineChip code={leg.lineCode} color={leg.color} />
              <span className="min-w-0">
                direcció {towards(leg.headsign)}
                {between > 0 &&
                  ` · ${between} ${between === 1 ? "parada" : "parades"}`}
              </span>
            </div>
            <p className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold tabular-nums">
                {clock(leg.arriveAt)}
              </span>
              <span>
                baixa a <span className="font-medium">{leg.to.name}</span>
              </span>
            </p>
          </div>
        </li>
      );
    })}
    <li className="flex gap-3">
      <div className="flex w-6 justify-center">
        <Flag className="mt-2.5 size-4 shrink-0" />
      </div>
      <p className="py-2 text-sm">
        <span className="font-semibold tabular-nums">
          {clock(itinerary.arriveAt)}
        </span>{" "}
        arribada a <span className="font-medium">{destinationLabel}</span>
      </p>
    </li>
  </ol>
);
