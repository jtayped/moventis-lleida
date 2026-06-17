import React, { useMemo } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Stop } from "@moventis/db";
import { Bus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getContrastTextColor } from "@/lib/contrast";

interface MapPinProps {
  stop: Stop;
  zoomBucket: "small" | "medium" | "large";
  selectedStopId: string | undefined;
  onClick: (stop: Stop) => void;
  pinColor?: string;
}

const MapPin = React.memo(
  ({ stop, zoomBucket, selectedStopId, onClick, pinColor }: MapPinProps) => {
    const isSelected = stop.id === selectedStopId;
    const isDeleted = !!stop.deletedAt;
    // Check if the stop is newer than 14 days
    const isNew = useMemo(() => {
      if (isDeleted || !stop.createdAt) return false;

      const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
      const ageInMs = Date.now() - new Date(stop.createdAt).getTime();

      return ageInMs < fourteenDaysInMs;
    }, [isDeleted, stop.createdAt]);

    if (zoomBucket === "small") {
      return (
        <AdvancedMarker
          position={{ lat: stop.latitude, lng: stop.longitude }}
          onClick={isDeleted ? undefined : () => onClick(stop)}
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
          onClick={isDeleted ? undefined : () => onClick(stop)}
          title={stop.name}
          zIndex={isSelected ? 10 : 1}
        >
          <div
            className={cn(
              "relative flex size-7 items-center justify-center rounded-full border-2 border-white shadow-lg transition-all",
              !isDeleted && "hover:scale-110",
              !pinColor && (isDeleted ? "bg-muted text-muted-foreground" : "bg-primary text-white"),
              isSelected && "scale-105 ring-4 ring-primary/40",
              isDeleted && "opacity-50 cursor-not-allowed",
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
            {isNew && (
              <Badge className="absolute -top-4 left-1/2 z-20 flex h-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-red-600">
                nova
              </Badge>
            )}
            {isDeleted && (
              <Badge className="absolute -top-4 left-1/2 z-20 flex h-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-zinc-500 px-1.5 text-xs font-extrabold text-white shadow-sm">
                eliminada
              </Badge>
            )}
            <Bus size={16} />
          </div>
        </AdvancedMarker>
      );
    }

    return (
      <AdvancedMarker
        position={{ lat: stop.latitude, lng: stop.longitude }}
        onClick={isDeleted ? undefined : () => onClick(stop)}
        title={stop.name}
        zIndex={isSelected ? 10 : 1}
      >
        <div
          className="absolute"
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <div
            className={cn(
              "group relative flex flex-col items-center transition-transform",
              isDeleted ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110!",
              isSelected ? "scale-105" : "scale-100",
            )}
          >
            {isNew && (
              <Badge className="absolute -top-3 left-1/2 z-20 flex h-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 font-bold tracking-wider text-white shadow-sm hover:bg-red-600">
                nova
              </Badge>
            )}
            {isDeleted && (
              <Badge className="absolute -top-3 left-1/2 z-20 flex h-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-zinc-500 px-1.5 font-bold tracking-wider text-white shadow-sm">
                eliminada
              </Badge>
            )}
            <div
              className={cn(
                "z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white shadow-lg",
                !pinColor && (isDeleted ? "bg-muted text-muted-foreground" : "bg-primary text-white"),
                isSelected && "ring-4 ring-primary/40",
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
              )}
              style={pinColor && !isDeleted ? { backgroundColor: pinColor } : undefined}
            />
          </div>
        </div>
      </AdvancedMarker>
    );
  },
);

MapPin.displayName = "MapPin";

export default MapPin;
