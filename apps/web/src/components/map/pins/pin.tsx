import React, { useMemo } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Stop } from "@moventis/db";
import { Bus, Sparkle, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContrastTextColor } from "@/lib/contrast";
import { isNewStop } from "@/lib/stops";
import CountdownTimer from "@/components/ui/countdown";
import type { StopEta } from "@/context/stop-etas";

interface MapPinProps {
  stop: Stop;
  zoomBucket: "small" | "medium" | "large";
  isSelected: boolean;
  onClick: (stop: Stop) => void;
  pinColor?: string;
  /** Saved stop: gets a star on its free shoulder, and stays clickable when deleted. */
  isPreferida?: boolean;
  /**
   * The next bus here, already narrowed to one line by `StopEtasProvider`. Only
   * drawn in the `large` bucket — below it the pin is a 28px circle with no room
   * beside it, and the prefetcher does not spend a request on those zooms either.
   */
  eta?: StopEta;
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
 *
 * Offset far enough to clear the circle's edge rather than straddle it. A stop can
 * carry two of these at once, and two marks sitting half-on the circle leave very
 * little of the bus showing — which is the glyph that says what the pin is.
 *
 * Normally the top-right shoulder. A {@link NextBusPill} is tall enough to reach
 * into that corner, so when one is shown the mark moves to the bottom-left — the
 * last free corner, since the star holds top-left and the tail holds bottom
 * centre. Letting them overlap is not an option either way round: the mark would
 * sit on the time, or the capsule would hide the fact that the stop is new.
 */
function StopMark({
  kind,
  displaced,
}: {
  kind: "new" | "deleted";
  displaced?: boolean;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute z-20 flex size-3 items-center justify-center rounded-full bg-zinc-900 text-white ring-2 ring-white",
        displaced ? "-bottom-1 -left-1" : "-top-1 -right-1",
      )}
      aria-hidden
    >
      {kind === "new" ? (
        <Sparkle size={7} className="fill-current" />
      ) : (
        <X size={8} strokeWidth={3.5} />
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
      className="pointer-events-none absolute -top-1 -left-1 z-20 flex size-3 items-center justify-center rounded-full bg-amber-400 text-zinc-900 ring-2 ring-white"
      aria-hidden
    >
      <Star size={7} className="fill-current" />
    </span>
  );
}

/**
 * The next bus at this stop: the drawer's line strip cut down to its one most
 * useful row, fused to the side of the pin.
 *
 * It reads as part of the marker rather than a chip floating near it, and the
 * geometry is what does that. The capsule is centred on the circle's own axis
 * (`top-5` is the 40px circle's midline) and starts *inside* it, tucked behind
 * at `z-0` so the circle's white border cuts across its left end — the same
 * trick the tail below already uses. Anchored to a corner and nudged clear
 * instead, it sat at a different height from everything else on the pin and
 * belonged to nothing.
 *
 * The capsule is fully rounded — at ~22px tall a 6px radius is too tight to read
 * as a capsule and too loose to read as a rectangle, which is what made the
 * first attempt look unfinished. The line chip inside it is not: every badge
 * that carries a line code in this app is `rounded-md` (the drawer header's
 * `Badge`, `StopNavigation`'s `LineChip`), and a round one here would be the
 * only exception in the product.
 *
 * `left-[14px]` with `pl-8` is a matched pair and the numbers are not arbitrary.
 * The capsule has to start far enough inside the circle that its rounded left
 * cap is *entirely* covered, or the curve peeks out and the pill reads as a
 * separate object again. The circle is only 40px wide across its middle — at the
 * capsule's top and bottom edges, 16px off centre, it has narrowed to
 * 2·√(20² − 16²) = 24px, and a cap starting at 26px cleared it there. The cap's
 * corners sit at (left + 16, centre ± 16), which stays inside a radius-20 circle
 * only while left ≲ 16. The padding grows by exactly what the offset lost, so
 * the content lands in the same place either way.
 *
 * Light-themed like the shoulder marks, because it sits on map tiles rather than
 * an app surface, and `pointer-events-none` so it can never eat the tap that
 * opens the stop. The time keeps a fixed width for the same reason it does in
 * the drawer header — otherwise the capsule resizes every second as the
 * countdown loses a digit, and at this size that twitch is the most visible
 * thing on the map.
 */
function NextBusPill({ lineCode, color, arrivalTime }: StopEta) {
  return (
    <span
      className="pointer-events-none absolute top-5 left-[14px] z-0 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-white py-1.5 pr-2.5 pl-8 shadow-lg"
      aria-hidden
    >
      <span
        className="flex h-5 min-w-6 items-center justify-center rounded-md px-1 text-[11px] leading-none font-bold"
        style={{ backgroundColor: color, color: getContrastTextColor(color) }}
      >
        {lineCode}
      </span>
      <span className="w-10 text-center text-[13px] leading-none font-semibold text-zinc-900 tabular-nums">
        <CountdownTimer targetDate={arrivalTime} compact />
      </span>
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
    eta,
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

    // A withdrawn stop is not served any more, so whatever the upstream response
    // said about it is not a bus that will stop for you.
    const pill = zoomBucket === "large" && !isDeleted ? eta : undefined;

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
                    : "bg-primary text-primary-foreground"),
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
        // A pill overhangs its neighbours, so it outranks them — otherwise the
        // pin to its right draws its circle straight over the time.
        zIndex={isSelected ? 10 : pill ? 5 : isPreferida ? 4 : mark ? 3 : 1}
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
                    : "bg-primary text-primary-foreground"),
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
            {mark && <StopMark kind={mark} displaced={!!pill} />}
            {isPreferida && <PreferidaMark />}
            {pill && <NextBusPill {...pill} />}
          </div>
        </div>
      </AdvancedMarker>
    );
  },
);

MapPin.displayName = "MapPin";

export default MapPin;
