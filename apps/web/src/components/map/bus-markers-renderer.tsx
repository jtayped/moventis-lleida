"use client";

import React from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { Bus } from "lucide-react";
import type { BusPosition } from "@moventis/shared";
import { cn } from "@/lib/utils";

interface BusMarkersRendererProps {
  positions: BusPosition[];
  /** Hex colour per line code; each bus is coloured by its own `lineCode`. */
  colorByLine: Record<string, string | undefined>;
}

const FALLBACK_COLOR = "#059669"; // emerald-600

/**
 * What the marker's tooltip claims. A position is a bracket between two stops
 * (`spanStops` segments wide) with a point estimate inside it; the copy should
 * not promise more than that. "high" is an adjacent-stop bracket; the wider
 * ones say so.
 */
function titleFor(pos: BusPosition): string {
  const line = `Bus línia ${pos.lineCode}`;
  if (pos.confidence === "high") return `${line} — entre dues parades consecutives`;
  const span = `entre parades (${pos.spanStops} trams)`;
  return pos.confidence === "medium"
    ? `${line} — ${span}, posició estimada`
    : `${line} — ${span}, posició poc precisa`;
}

/**
 * Renders inferred live bus positions on the map. Deliberately distinct from the
 * static stop pins (which are solid line-coloured circles with a white bus glyph):
 * a bus is a *white* vehicle chip with a green pulsing "live" dot and a pulsing
 * halo, so a moving vehicle never reads as a stop. Wider (less certain) brackets
 * are dimmed, and the widest also lose the solid outline. Each marker uses its
 * own line's colour. Markers carry a Catalan label.
 */
const BusMarkersRenderer = React.memo(
  ({ positions, colorByLine }: BusMarkersRendererProps) => {
    return (
      <>
        {positions.map((pos, i) => {
          const accent = colorByLine[pos.lineCode] ?? FALLBACK_COLOR;

          return (
            <AdvancedMarker
              key={`${pos.lineCode}-${pos.journeyName}-${pos.segment.fromStopId}-${pos.segment.toStopId}-${pos.etaSeconds}-${i}`}
              position={{ lat: pos.lat, lng: pos.lng }}
              title={titleFor(pos)}
              zIndex={20}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center",
                  pos.confidence === "medium" && "opacity-80",
                  pos.confidence === "low" && "opacity-60",
                )}
              >
                {/* Pulsing halo — stop pins never animate, so this reads as motion. */}
                <span
                  aria-hidden
                  className="absolute inline-flex size-10 animate-ping rounded-full opacity-30"
                  style={{ backgroundColor: accent }}
                />
                {/* White vehicle chip: pill shape clearly differs from round stops. */}
                <div
                  className={cn(
                    "relative flex items-center gap-1 rounded-full border-2 bg-white py-1 pr-2 pl-1.5 shadow-lg",
                    pos.confidence === "low" && "border-dashed",
                  )}
                  style={{ borderColor: accent }}
                >
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <Bus size={15} style={{ color: accent }} />
                </div>
              </div>
            </AdvancedMarker>
          );
        })}
      </>
    );
  },
);

BusMarkersRenderer.displayName = "BusMarkersRenderer";

export default BusMarkersRenderer;
