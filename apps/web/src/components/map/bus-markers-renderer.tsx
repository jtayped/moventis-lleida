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
 * Renders inferred live bus positions on the map. Deliberately distinct from the
 * static stop pins (which are solid line-coloured circles with a white bus glyph):
 * a bus is a *white* vehicle chip with a green pulsing "live" dot and a pulsing
 * halo, so a moving vehicle never reads as a stop. Lower-confidence positions are
 * dimmed. Each marker uses its own line's colour. Markers carry a Catalan label.
 */
const BusMarkersRenderer = React.memo(
  ({ positions, colorByLine }: BusMarkersRendererProps) => {
    return (
      <>
        {positions.map((pos, i) => {
          const accent = colorByLine[pos.lineCode] ?? FALLBACK_COLOR;
          const dimmed = pos.confidence !== "high";
          const title =
            pos.confidence === "low"
              ? `Bus línia ${pos.lineCode} — posició aproximada (poc precisa)`
              : `Bus línia ${pos.lineCode} — posició aproximada`;

          return (
            <AdvancedMarker
              key={`${pos.lineCode}-${pos.journeyName}-${pos.segment.fromStopId}-${pos.segment.toStopId}-${pos.etaSeconds}-${i}`}
              position={{ lat: pos.lat, lng: pos.lng }}
              title={title}
              zIndex={20}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center",
                  dimmed && "opacity-70",
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
                  className="relative flex items-center gap-1 rounded-full border-2 bg-white py-1 pr-2 pl-1.5 shadow-lg"
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
