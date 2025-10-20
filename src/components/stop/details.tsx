import { api } from "@/trpc/react";
import type { Stop } from "@prisma/client";
import { RefreshCw, Antenna } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";

/**
 * Formats seconds into a relative time string (e.g., "Now", "12 min", "1h 30m").
 */
const formatRelativeTime = (seconds: number): string => {
  if (seconds < 30) return "arribant";
  const totalMinutes = Math.round(seconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Formats a Date object into an absolute time string (e.g., "03:38").
 */
const formatAbsoluteTime = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toLocaleTimeString(navigator.language, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * A component that displays a live countdown for an arriving bus.
 */
const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.round((targetDate.getTime() - Date.now()) / 1000),
  );

  useEffect(() => {
    setSecondsRemaining(Math.round((targetDate.getTime() - Date.now()) / 1000));

    const interval = setInterval(() => {
      setSecondsRemaining((prevSeconds) => prevSeconds - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (secondsRemaining < 30) return <>Now</>;
  if (secondsRemaining < 60 * 10) {
    const m = Math.floor(secondsRemaining / 60);
    const s = secondsRemaining % 60;
    return <>{`${m}:${s.toString().padStart(2, "0")}`}</>;
  }
  return <>{formatRelativeTime(secondsRemaining)}</>;
};

/**
 * Formats the last updated timestamp into a readable "ago" string.
 */
const formatTimeAgo = (timestamp: number | null): string => {
  if (!timestamp) return "";
  const now = Date.now();
  const secondsAgo = Math.round((now - timestamp) / 1000);

  if (secondsAgo < 10) return "ara";
  if (secondsAgo < 60) return `fa ${secondsAgo}s`;
  const minutesAgo = Math.floor(secondsAgo / 60);
  return `fa ${minutesAgo}m`;
};

/**
 * Displays the "Updated X ago" message and auto-updates it.
 */
const LastUpdated = ({ timestamp }: { timestamp: number | null }) => {
  const [displayTime, setDisplayTime] = useState(formatTimeAgo(timestamp));

  useEffect(() => {
    setDisplayTime(formatTimeAgo(timestamp));
    const interval = setInterval(() => {
      setDisplayTime(formatTimeAgo(timestamp));
    }, 5000);

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;

  return (
    <span className="text-xs text-gray-500">actualitzat {displayTime}</span>
  );
};

const StopDetails = ({ stop }: { stop: Stop }) => {
  const {
    data: details,
    isLoading,
    isFetching,
    isError,
    dataUpdatedAt,
    refetch,
  } = api.stops.get.useQuery(
    {
      stopId: stop.id,
    },
    {
      refetchInterval: 15000,
    },
  );

  const closestJourney = useMemo(() => {
    if (!details?.schedules) return null;
    let closest = null;
    let minDiff = Infinity;
    const now = Date.now();

    for (const line of details.schedules) {
      for (const journey of line.journeys) {
        const diff = (journey.arrivalTime.getTime() - now) / 1000;
        if (diff > 0 && diff < minDiff) {
          minDiff = diff;
          closest = journey;
        }
      }
    }
    return closest;
  }, [details]);

  // FIX: Create a memoized, sorted list of schedules
  const sortedSchedules = useMemo(() => {
    if (!details?.schedules) return [];
    // Create a new array to avoid mutating the cache
    return [...details.schedules].sort((a, b) => {
      // Sort selected (true) before not-selected (false)
      // This works because true=1 and false=0, so (1 - 0) = 1 (b comes first)
      return (b.selected ? 1 : 0) - (a.selected ? 1 : 0);
    });
  }, [details?.schedules]);

  if (isLoading) {
    return (
      <div className="mt-4 p-4 md:mx-auto md:w-lg">
        <div className="mb-4 flex items-center justify-between pb-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
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
      <div className="flex h-[400px] flex-col items-center justify-center p-4 text-center">
        <h3 className="text-destructive font-semibold">
          hi ha hagut un problema carregant els busos :(
        </h3>
        <Button
          onClick={() => refetch()}
          variant="destructive"
          className="mt-4"
        >
          torna a intentar-ho
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col p-4 md:mx-auto md:w-lg">
      <div className="flex items-start justify-between pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{details.name}</h2>
          <LastUpdated timestamp={dataUpdatedAt} />
        </div>
        <Button
          onClick={() => refetch()}
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-800"
          aria-label="Refresh bus times"
          disabled={isFetching}
        >
          <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
        </Button>
      </div>

      <ScrollArea className="h-[400px] pr-3">
        <div className="border-t">
          {/* FIX: Use the new sortedSchedules array */}
          {sortedSchedules.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {/* FIX: Map over the new sortedSchedules array */}
              {sortedSchedules.map((line) => (
                <div key={line.externalLineId} className="py-3">
                  <div className="flex items-center gap-3 pr-2 pb-2">
                    <span className="text-xl font-bold text-blue-600">
                      {line.lineCode}
                    </span>
                    <span className="truncate text-lg text-gray-600">
                      {line.lineName}
                    </span>
                  </div>
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(100px, 1fr))",
                    }}
                  >
                    {line.journeys.length > 0 ? (
                      line.journeys.map((journey) => {
                        const isClosest =
                          journey.externalJourneyId ===
                          closestJourney?.externalJourneyId;

                        const diffInSeconds = Math.round(
                          (journey.arrivalTime.getTime() - Date.now()) / 1000,
                        );

                        return (
                          // Your Card component is preserved
                          <Card
                            key={journey.externalJourneyId}
                            className={`flex h-auto flex-col items-center p-2`}
                          >
                            <span className="flex items-center text-sm font-bold">
                              {isClosest ? (
                                <CountdownTimer
                                  targetDate={journey.arrivalTime}
                                />
                              ) : (
                                formatRelativeTime(diffInSeconds)
                              )}
                              {journey.isRealTime && (
                                <Antenna size={12} className="ml-1" />
                              )}
                            </span>
                            <span className="font-mono text-xs">
                              {formatAbsoluteTime(journey.arrivalTime)}
                            </span>
                          </Card>
                        );
                      })
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
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};

export default StopDetails;
