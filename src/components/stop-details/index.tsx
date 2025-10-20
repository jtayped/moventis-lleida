import { api } from "@/trpc/react";
import type { Stop } from "@prisma/client";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo } from "react";

// Import the new modular components
import StopDetailsSkeleton from "./loading";
import StopDetailsError from "./error";
import StopDetailsHeader from "./header";
import StopScheduleLine from "./line-schedule";

const StopDetails = ({ stop }: { stop: Stop }) => {
  const {
    data: details,
    isLoading,
    isFetching,
    isError,
    dataUpdatedAt,
    refetch,
  } = api.stops.get.useQuery({
    stopId: stop.id,
  });

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

  const sortedSchedules = useMemo(() => {
    if (!details?.schedules) return [];
    return [...details.schedules].sort((a, b) => {
      return (b.selected ? 1 : 0) - (a.selected ? 1 : 0);
    });
  }, [details?.schedules]);

  if (isLoading) {
    return <StopDetailsSkeleton />;
  }

  if (isError || !details) {
    return <StopDetailsError refetch={refetch} />;
  }

  return (
    <div className="mt-4 flex flex-col p-4 md:mx-auto md:w-lg">
      <StopDetailsHeader
        name={details.name}
        dataUpdatedAt={dataUpdatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      <ScrollArea className="h-[400px] pr-3">
        <div className="border-t">
          {sortedSchedules.length > 0 ? (
            <div className="divide-gray-300 divide-y">
              {sortedSchedules.map((line) => (
                <StopScheduleLine
                  key={line.externalLineId}
                  line={line}
                  closestJourneyId={closestJourney?.externalJourneyId ?? null}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
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
