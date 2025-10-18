import { api } from "@/trpc/react";
import type { Stop } from "@prisma/client";
import { RefreshCw, Antenna } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/**
 * Formats seconds into a relative time string (e.g., "Now", "12 min").
 */
const formatRelativeTime = (seconds: number): string => {
  if (seconds < 30) return "Now";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
};

/**
 * Formats a Date object into an absolute time string (e.g., "03:38").
 */
const formatAbsoluteTime = (date: Date | null): string | null => {
  if (!date) return null;
  // Get time in 24-hour format with leading zeros for local timezone
  return date.toLocaleTimeString(navigator.language, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const StopDetails = ({ stop }: { stop: Stop }) => {
  const {
    data: details,
    isLoading,
    isError,
    refetch,
  } = api.stops.get.useQuery({
    stopId: stop.id,
  });

  if (isLoading) {
    return (
      <div className="mt-4 p-4">
        {/* Header Skeleton */}
        <div className="mb-4 flex items-center justify-between pb-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        {/* Content Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <Skeleton className="h-6 w-1/3" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-20 rounded-md" />
                <Skeleton className="h-10 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !details) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <h3 className="text-destructive font-semibold">
          Failed to load bus times.
        </h3>
        <Button
          onClick={() => refetch()}
          variant="destructive"
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4">
      {/* --- Header --- */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-2xl font-bold text-gray-800">{details.name}</h2>
        <Button
          onClick={() => refetch()}
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-800"
          aria-label="Refresh bus times"
        >
          <RefreshCw size={20} />
        </Button>
      </div>

      {/* --- Compact Bus Lines List --- */}
      <div className="border-t">
        {details.schedules && details.schedules.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {details.schedules.map((line) => (
              <div
                key={line.lineId}
                className="flex flex-col justify-between gap-4 py-3"
              >
                {/* Line Info */}
                <div className="flex gap-3 pr-2">
                  <span className="text-lg font-bold text-blue-600">
                    {line.lineCode}
                  </span>
                  <span className="truncate text-lg text-gray-600">
                    {line.lineName}
                  </span>
                </div>
                {/* Arrival Times */}
                <div className="flex flex-wrap gap-2">
                  {line.buses.length > 0 ? (
                    line.buses.map((bus, index) => (
                      <Badge
                        key={index}
                        variant={bus.isRealTime ? "default" : "secondary"}
                        className="flex h-auto flex-col items-center px-3 py-1.5"
                      >
                        <span className="flex items-center text-sm font-bold">
                          {formatRelativeTime(bus.timeToArrivalInSeconds)}
                          {bus.isRealTime && (
                            <Antenna size={12} className="ml-1" />
                          )}
                        </span>
                        <span className="font-mono text-xs">
                          {formatAbsoluteTime(bus.estimatedArrivalTime)}
                        </span>
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="font-normal">
                      No buses
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <p>No bus schedules available for this stop.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StopDetails;
