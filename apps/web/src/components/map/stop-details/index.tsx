import { api } from "@/trpc/react";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo, useState, useEffect } from "react";
import StopDetailsSkeleton from "./loading";
import StopDetailsError from "./error";
import StopDetailsHeader from "./header";
import StopScheduleLine from "./line-schedule";
import StopNavigation from "./stop-navigation";
import LiveBusStatus, { type LiveBusStatusValue } from "./live-bus-status";
import ScheduleLegend from "./schedule-legend";
import { useBusFinder } from "@/context/buses";
import {
  CheckCheck,
  ArrowRightLeft,
  TriangleAlert,
  Sparkle,
} from "lucide-react";
import { isNewStop } from "@/lib/stops";
import { formatTimeAgo } from "@/lib/time";
import { Button } from "@/components/ui/button";
import type { Journey, Schedules } from "@moventis/shared";
import { useArrivalDrift, type DriftLookup } from "@/hooks/use-arrival-drift";
import { useSettings } from "@/hooks/use-settings";

type ScheduledTime = Journey["scheduledTimes"][number];

const ScheduleGroup = ({
  lines,
  colorMap,
  closestScheduledTime,
  now,
  getDrift,
}: {
  lines: Schedules;
  colorMap: Map<string, string>;
  closestScheduledTime: ScheduledTime | null;
  now: number;
  getDrift: DriftLookup;
}) => (
  <div className="divide-border divide-y">
    {lines.map((line) => (
      <StopScheduleLine
        key={line.externalLineId}
        line={line}
        color={colorMap.get(line.lineCode) ?? "#888888"}
        closestScheduledTime={closestScheduledTime}
        now={now}
        getDrift={getDrift}
      />
    ))}
  </div>
);

/**
 * The drawer's screen-reader labels. They live here rather than at the `Drawer`
 * because the stop name is only known once this query resolves — and Radix warns
 * about a drawer with no title, so they have to render in every branch, including
 * loading, where there is no name yet.
 */
const SrLabels = ({ name }: { name?: string }) => (
  <>
    <DrawerTitle className="sr-only">{name ?? "parada"}</DrawerTitle>
    <DrawerDescription className="sr-only">
      {name ? `hores d'arribada per la parada ${name}` : "hores d'arribada"}
    </DrawerDescription>
  </>
);

/**
 * A refetch that failed while a usable timetable is still on screen. Sits with
 * the header's "actualitzat X" rather than replacing the page, because the times
 * below it are still the best answer anyone at the stop has.
 */
const StaleNotice = ({
  dataUpdatedAt,
  isFetching,
  refetch,
}: {
  dataUpdatedAt: number | null;
  isFetching: boolean;
  refetch: () => void;
}) => {
  const ago = formatTimeAgo(dataUpdatedAt);

  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
      <TriangleAlert size={14} className="shrink-0" />
      <span className="min-w-0 flex-1">
        no s&apos;ha pogut actualitzar.{" "}
        {!ago
          ? "les hores poden estar desfasades"
          : ago === "ara"
            ? "les hores són d'ara mateix"
            : `les hores són de ${ago}`}
        .
      </span>
      <Button
        onClick={() => refetch()}
        variant="ghost"
        size="sm"
        disabled={isFetching}
        className="h-7 shrink-0 px-2 text-xs underline underline-offset-2"
      >
        torna-ho a provar
      </Button>
    </div>
  );
};

/** "4", "4 i 7", "4, 7 i 9" — a list a person would read aloud. */
const joinLines = (codes: string[]) =>
  codes.length <= 1
    ? (codes[0] ?? "")
    : `${codes.slice(0, -1).join(", ")} i ${codes[codes.length - 1]}`;

/**
 * Some of the stop's lines answered and some did not. The timetable below is
 * real but incomplete, and a missing line here looks exactly like a line with
 * no buses left today — so it has to be named, or the person waits for a bus
 * the drawer never mentions.
 */
const PartialNotice = ({
  failedRoutes,
  isFetching,
  refetch,
}: {
  failedRoutes: string[];
  isFetching: boolean;
  refetch: () => void;
}) => (
  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
    <TriangleAlert size={14} className="shrink-0" />
    <span className="min-w-0 flex-1">
      no s&apos;han pogut carregar les hores de{" "}
      {failedRoutes.length === 1 ? "la línia" : "les línies"}{" "}
      {joinLines(failedRoutes)}
    </span>
    <Button
      onClick={() => refetch()}
      variant="ghost"
      size="sm"
      disabled={isFetching}
      className="h-7 shrink-0 px-2 text-xs underline underline-offset-2"
    >
      torna-ho a provar
    </Button>
  </div>
);

const StopDetails = ({ externalId }: { externalId: string }) => {
  const {
    selectedRoutes,
    routes,
    lineBusStatus,
    busPositions,
    isBusLocationEnabled,
    isPreferida,
  } = useBusFinder();
  const { settings } = useSettings();

  const colorMap = useMemo(
    () => new Map(routes.map((r) => [r.code, r.color])),
    [routes],
  );

  const {
    data: details,
    isLoading,
    isFetching,
    isError,
    dataUpdatedAt,
    refetch,
  } = api.stops.get.useQuery(
    { externalId },
    {
      // A drawer left open on a bus stop is the whole product. Without this the
      // list only ever shrinks — `now` ticks every 30s and past arrivals are
      // filtered out — until it claims the stop has no schedules at all.
      refetchInterval: 30_000,
      // Nothing to keep fresh while the phone is in a pocket, and every poll is
      // a live Moventis request per route on the stop.
      refetchIntervalInBackground: false,
    },
  );

  // Fed the unfiltered schedules on purpose: the drift alignment compares each
  // refresh's whole list against the previous one, and handing it the filtered
  // list would make every departed bus read as one that vanished.
  const getDrift = useArrivalDrift({
    stopExternalId: externalId,
    schedules: details?.schedules,
    dataUpdatedAt,
    enabled: settings.arrivalDrift,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const closestScheduledTime = useMemo(() => {
    if (!details?.schedules) return null;

    let closest: ScheduledTime | null = null;
    let minDiff = Infinity;

    for (const line of details.schedules) {
      for (const journey of line.journeys) {
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
    return details.schedules.flatMap((line) => {
      const journeys = line.journeys
        .map((journey) => ({
          ...journey,
          scheduledTimes: journey.scheduledTimes.filter(
            (t) => t.arrivalTime.getTime() > now,
          ),
        }))
        // A destination heading with no times under it says nothing.
        .filter((journey) => journey.scheduledTimes.length > 0);

      // A line that never had a journey keeps its "sense busos" badge; one whose
      // every time has passed drops out, so the drawer can say so in one place.
      if (journeys.length === 0 && line.journeys.length > 0) return [];
      return [{ ...line, journeys }];
    });
  }, [details, now]);

  // Distinguishes "this stop has no schedules" from "the schedules we have are
  // all in the past" — the second is stale data, and says to refresh.
  const hadTimes = useMemo(
    () =>
      (details?.schedules ?? []).some((line) =>
        line.journeys.some((journey) => journey.scheduledTimes.length > 0),
      ),
    [details],
  );

  // Only worth explaining the two badges when a timetable-only time is on screen.
  const hasTimetableOnlyTime = useMemo(
    () =>
      filteredSchedules.some((line) =>
        line.journeys.some((journey) =>
          journey.scheduledTimes.some((t) => !t.isRealTime),
        ),
      ),
    [filteredSchedules],
  );

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

  // Live buses relevant to this stop: the selected lines that actually serve it.
  const relevantLines = useMemo(() => {
    const selected = new Set(selectedRoutes);
    return (details?.routes ?? [])
      .map((r) => r.code)
      .filter((code) => selected.has(code));
  }, [details, selectedRoutes]);

  const { liveCount, liveApproximateCount } = useMemo(() => {
    const relevant = busPositions.filter((p) =>
      relevantLines.includes(p.lineCode),
    );
    return {
      liveCount: relevant.length,
      liveApproximateCount: relevant.filter((p) => p.confidence !== "high")
        .length,
    };
  }, [busPositions, relevantLines]);

  const liveStatus = useMemo<LiveBusStatusValue>(() => {
    if (relevantLines.length === 0) return "idle";
    if (relevantLines.some((c) => lineBusStatus[c] === "loading"))
      return "loading";
    if (relevantLines.some((c) => lineBusStatus[c] === "done")) return "done";
    return "error";
  }, [relevantLines, lineBusStatus]);

  if (isLoading) {
    return (
      <>
        <SrLabels />
        <StopDetailsSkeleton />
      </>
    );
  }

  // Only when there is nothing to show. React Query keeps `data` when a
  // background refetch fails, and on a bad signal at the stop itself a readable
  // timetable — even a few minutes old — beats an error screen.
  if (!details) {
    return (
      <>
        <SrLabels />
        <StopDetailsError externalId={externalId} refetch={refetch} />
      </>
    );
  }

  return (
    <div className="mt-4 flex h-[62vh] flex-col p-4 md:mx-auto md:w-lg">
      <SrLabels name={details.name} />
      <StopDetailsHeader
        externalId={externalId}
        name={details.name}
        lines={details.routes}
        dataUpdatedAt={dataUpdatedAt}
        isFetching={isFetching}
        refetch={refetch}
      />

      {isError && (
        <StaleNotice
          dataUpdatedAt={dataUpdatedAt}
          isFetching={isFetching}
          refetch={refetch}
        />
      )}

      {details.failedRoutes.length > 0 && (
        <PartialNotice
          failedRoutes={details.failedRoutes}
          isFetching={isFetching}
          refetch={refetch}
        />
      )}

      <StopNavigation externalId={externalId} />

      {isBusLocationEnabled && !details.deletedAt && (
        <LiveBusStatus
          status={liveStatus}
          count={liveCount}
          approximateCount={liveApproximateCount}
        />
      )}

      {details.deletedAt && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            aquesta parada ja no es troba en servei. pot ser temporal per obres
            o canvis de ruta.
            {/* Answers the question a dead pin on your own map raises: why is
                this still here, and how do I get rid of it? */}
            {isPreferida(externalId) &&
              " la tens a preferides, i per això segueix al mapa — treu-la amb l'estrella de dalt."}
          </span>
        </div>
      )}

      {/* Says in words what the sparkle on the map pin means. */}
      {isNewStop(details.createdAt) && (
        <div className="text-muted-foreground border-border bg-muted/40 mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
          <Sparkle size={16} className="mt-0.5 shrink-0 fill-current" />
          <span>aquesta parada s&apos;ha afegit a la xarxa fa poc.</span>
        </div>
      )}

      {hasTimetableOnlyTime && <ScheduleLegend />}

      <ScrollArea className="min-h-0 flex-1 pr-3">
        <div>
          {filteredSchedules.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              {hadTimes ? (
                <>
                  <p>totes les hores han passat — actualitza.</p>
                  <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="sm"
                    disabled={isFetching}
                    className="mt-3"
                  >
                    actualitza
                  </Button>
                </>
              ) : (
                <p>no hi ha horaris disponibles per a aquesta parada.</p>
              )}
            </div>
          ) : showSections ? (
            <div>
              {selectedLines.length > 0 && (
                <div className="py-2">
                  <div className="my-4 mb-2 flex items-center gap-2 px-1">
                    <CheckCheck className="h-5 w-5" />
                    <h3 className="text-lg font-bold">línies seleccionades</h3>
                  </div>
                  <ScheduleGroup
                    lines={selectedLines}
                    colorMap={colorMap}
                    closestScheduledTime={closestScheduledTime}
                    now={now}
                    getDrift={getDrift}
                  />
                </div>
              )}
              {otherLines.length > 0 && (
                <div className="py-2">
                  {selectedLines.length > 0 && (
                    <hr className="border-border my-2" />
                  )}
                  <div className="my-4 mb-2 flex items-center gap-2 px-1">
                    <ArrowRightLeft className="h-5 w-5" />
                    <h3 className="text-lg font-bold">correspondències</h3>
                  </div>
                  <ScheduleGroup
                    lines={otherLines}
                    colorMap={colorMap}
                    closestScheduledTime={closestScheduledTime}
                    now={now}
                    getDrift={getDrift}
                  />
                </div>
              )}
            </div>
          ) : (
            <ScheduleGroup
              lines={filteredSchedules}
              colorMap={colorMap}
              closestScheduledTime={closestScheduledTime}
              now={now}
              getDrift={getDrift}
            />
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};

export default StopDetails;
