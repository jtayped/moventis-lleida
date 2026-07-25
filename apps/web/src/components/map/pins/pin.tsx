import React, { useMemo } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Stop } from "@moventis/db";
import { Bus, Sparkle, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContrastTextColor } from "@/lib/contrast";
import { isNewStop } from "@/lib/stops";

interface MapPinProps {
  stop: Stop;
  zoomBucket: "small" | "medium" | "large";
  isSelected: boolean;
  onClick: (stop: Stop) => void;
  pinColor?: string;
  /** Saved stop: gets a star on its free shoulder, and stays clickable when deleted. */
  isPreferida?: boolean;
}

/**
 * Small mark stuck to the pin's shoulder, in place of the word that used to float
 * beside it. When a whole new branch of the network appears at once, a dozen loose
 * labels read as scattered noise; at this size the mark stays attached to the stop
 * it belongs to. The word itself lives in the drawer, on the stop it describes.
 *
 * Dark on a white casing, so it holds against both the near-black default pin and
 * the pale line colours. Always light-themed: it sits on the map, not on an app
 * surface. A new stop is not an alarm, so it stays out of the destructive red.
 */
function StopMark({ kind }: { kind: "new" | "deleted" }) {
  return (
    <span
      className="pointer-events-none absolute -top-0.5 -right-0.5 z-20 flex size-3.5 items-center justify-center rounded-full bg-zinc-900 text-white ring-2 ring-white"
      aria-hidden
    >
      {kind === "new" ? (
        <Sparkle size={8} className="fill-current" />
      ) : (
        <X size={9} strokeWidth={3.5} />
      )}
    </span>
  );
}

/**
 * The saved-stop mark, on the shoulder opposite `StopMark`. A stop can be both new
 * and saved, so the two marks need separate corners — and the right one was taken
 * first.
 *
 * Gold on a light casing, inverting the network marks' dark one. That inversion is
 * the point: every other mark reports something the network did, this one reports
 * a choice the person looking at it made. Dark glyph on gold rather than the
 * reverse, because amber is too light to carry white text.
 */
function PreferidaMark() {
  return (
    <span
      className="pointer-events-none absolute -top-0.5 -left-0.5 z-20 flex size-3.5 items-center justify-center rounded-full bg-amber-400 text-zinc-900 ring-2 ring-white"
      aria-hidden
    >
      <Star size={8} className="fill-current" />
    </span>
  );
}

const MapPin = React.memo(
  ({
    stop,
    zoomBucket,
    isSelected,
    onClick,
    pinColor,
    isPreferida,
  }: MapPinProps) => {
    const isDeleted = !!stop.deletedAt;
    const isNew = useMemo(
      () => !isDeleted && isNewStop(stop.createdAt),
      [isDeleted, stop.createdAt],
    );

    const mark = isNew ? "new" : isDeleted ? "deleted" : null;

    // A deleted stop is normally inert — there is nothing live to show. A saved one
    // has to stay open-able even so, because the control that unsaves it lives in
    // the drawer behind it; without this, a stop leaving the network would strand a
    // star on the map that nothing could remove.
    const clickable = !isDeleted || !!isPreferida;

    if (zoomBucket === "small") {
      // No mark slot at 10px, and none needed: `MapPinsRenderer` promotes a saved
      // stop out of this bucket before it gets here.
      return (
        <AdvancedMarker
          position={{ lat: stop.latitude, lng: stop.longitude }}
          onClick={clickable ? () => onClick(stop) : undefined}
          title={stop.name}
          zIndex={isSelected ? 10 : 1}
        >
          <div
            className={cn(
              "size-2.5 rounded-full",
              isDeleted ? "opacity-30" : "opacity-70",
              !pinColor && "bg-primary",
            )}
            style={pinColor ? { backgroundColor: pinColor } : undefined}
          />
        </AdvancedMarker>
      );
    }

    if (zoomBucket === "medium") {
      return (
        <AdvancedMarker
          position={{ lat: stop.latitude, lng: stop.longitude }}
          onClick={clickable ? () => onClick(stop) : undefined}
          title={stop.name}
          zIndex={isSelected ? 10 : isPreferida ? 4 : mark ? 3 : 1}
        >
          {/* The marks are siblings of the circle, not children: a deleted stop dims
              its marker, and the marks on its shoulders have to stay legible. */}
          <div className="relative size-7">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full border-2 border-white shadow-lg transition-all",
                clickable && "hover:scale-110",
                !pinColor &&
                  (isDeleted
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-white"),
                isSelected && "ring-primary/40 scale-105 ring-4",
                isDeleted && "opacity-50",
                !clickable && "cursor-not-allowed",
              )}
              style={
                pinColor && !isDeleted
                  ? {
                      backgroundColor: pinColor,
                      color: getContrastTextColor(pinColor),
                    }
                  : undefined
              }
            >
              <Bus size={16} />
            </div>
            {mark && <StopMark kind={mark} />}
            {isPreferida && <PreferidaMark />}
          </div>
        </AdvancedMarker>
      );
    }

    return (
      <AdvancedMarker
        position={{ lat: stop.latitude, lng: stop.longitude }}
        onClick={clickable ? () => onClick(stop) : undefined}
        title={stop.name}
        zIndex={isSelected ? 10 : isPreferida ? 4 : mark ? 3 : 1}
      >
        <div
          className="absolute"
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <div
            className={cn(
              "group relative flex flex-col items-center transition-transform",
              clickable
                ? "cursor-pointer hover:scale-110!"
                : "cursor-not-allowed",
              isSelected ? "scale-105" : "scale-100",
            )}
          >
            <div
              className={cn(
                "z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white shadow-lg",
                !pinColor &&
                  (isDeleted
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-white"),
                isSelected && "ring-primary/40 ring-4",
                // Dims the marker rather than the whole group, so the mark on its
                // shoulder keeps its contrast.
                isDeleted && "opacity-50",
              )}
              style={
                pinColor && !isDeleted
                  ? {
                      backgroundColor: pinColor,
                      color: getContrastTextColor(pinColor),
                    }
                  : undefined
              }
            >
              <Bus size={22} />
            </div>
            <div
              className={cn(
                "z-0 h-4 w-4 -translate-y-2.5 rotate-45 transform",
                !pinColor && (isDeleted ? "bg-muted" : "bg-primary"),
                isDeleted && "opacity-50",
              )}
              style={
                pinColor && !isDeleted
                  ? { backgroundColor: pinColor }
                  : undefined
              }
            />
            {/* Anchor to the group's top corners, which are the circle's — the tail
                hanging below it doesn't enter into the position. */}
            {mark && <StopMark kind={mark} />}
            {isPreferida && <PreferidaMark />}
          </div>
        </div>
      </AdvancedMarker>
    );
  },
);

MapPin.displayName = "MapPin";

export default MapPin;
