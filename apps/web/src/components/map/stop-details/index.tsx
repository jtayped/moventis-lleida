import { api } from "@/trpc/react";
import type { Stop } from "@moventis/db";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo, useState, useEffect } from "react";
import StopDetailsSkeleton from "./loading";
import StopDetailsError from "./error";
import StopDetailsHeader from "./header";
import StopScheduleLine from "./line-schedule";
import { useBusFinder } from "@/context/buses";
import { CheckCheck, Spline } from "lucide-react";
import type { Journey } from "@moventis/shared";

type ScheduledTime = Journey["scheduledTimes"][number];

const StopDetails = ({ stop }: { stop: Stop }) => {
  const { selectedRoutes } = useBusFinder();

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

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // This memo now finds the closest *individual scheduled time*
  const closestScheduledTime = useMemo(() => {
    if (!details?.schedules) return null;

    let closest: ScheduledTime | null = null;
    let minDiff = Infinity;

    for (const line of details.schedules) {
      // Loop through journey groups (e.g., "agrònoms - pla d'urgell")
      for (const journey of line.journeys) {
        // Loop through the times for that journey group
        for (const scheduledTime of journey.scheduledTimes) {
          const diff = (scheduledTime.arrivalTime.getTime() - now) / 1000;
          if (diff > 0 && diff < minDiff) {
            minDiff = diff;
            closest = scheduledTime;
          }
        }
      }
    }
    return closest;
  }, [details, now]);

  const filteredSchedules = useMemo(() => {
    if (!details?.schedules) return [];
    return details.schedules.map((line) => ({
      ...line,
      journeys: line.journeys.map((journey) => ({
        ...journey,
        scheduledTimes: journey.scheduledTimes.filter(
          (t) => t.arrivalTime.getTime() > now,
        ),
      })),
    }));
  }, [details, now]);

  const { selectedLines, otherLines } = useMemo(() => {
    if (!filteredSchedules.length) {
      return { selectedLines: [], otherLines: [] };
    }

    const selectedRoutesSet = new Set(selectedRoutes);
    const selected: typeof filteredSchedules = [];
    const other: typeof filteredSchedules = [];

    for (const line of filteredSchedules) {
      if (selectedRoutesSet.has(line.lineCode)) {
        selected.push(line);
      } else {
        other.push(line);
      }
    }

    return { selectedLines: selected, otherLines: other };
  }, [filteredSchedules, selectedRoutes]);

  const showSections = selectedRoutes.length > 0;

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
        lines={details.routes}
        dataUpdatedAt={dataUpdatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      <ScrollArea className="h-100 pr-3">
        <div>
          {filteredSchedules.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <p>no hi ha horaris disponibles per a aquesta parada.</p>
            </div>
          ) : (
            <div>
              {showSections ? (
                <>
                  {selectedLines.length > 0 && (
                    <div className="py-2">
                      <div className="my-4 mb-2 flex items-center gap-2 px-1">
                        <CheckCheck className="h-5 w-5" />
                        <h3 className="text-lg font-bold">
                          línies seleccionades
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-300">
                        {selectedLines.map((line) => (
                          <StopScheduleLine
                            key={line.externalLineId}
                            line={line}
                            closestScheduledTime={closestScheduledTime}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {otherLines.length > 0 && (
                    <div className="py-2">
                      {selectedLines.length > 0 && (
                        <hr className="my-2 border-gray-200" />
                      )}
                      <div className="my-4 mb-2 flex items-center gap-2 px-1">
                        <Spline className="h-5 w-5" />
                        <h3 className="text-lg font-bold">correspondències</h3>
                      </div>
                      <div className="divide-y divide-gray-300">
                        {otherLines.map((line) => (
                          <StopScheduleLine
                            key={line.externalLineId}
                            line={line}
                            closestScheduledTime={closestScheduledTime}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="divide-y divide-gray-300">
                  {filteredSchedules.map((line) => (
                    <StopScheduleLine
                      key={line.externalLineId}
                      line={line}
                      closestScheduledTime={closestScheduledTime}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};

export default StopDetails;
