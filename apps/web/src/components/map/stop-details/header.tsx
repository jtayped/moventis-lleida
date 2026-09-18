import { RefreshCw, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import CountdownTimer from "@/components/ui/countdown";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import LastUpdated from "@/components/map/stop-details/last-updated";
import type { Line } from "@moventis/shared";
import { Badge } from "@/components/ui/badge";
import { getContrastTextColor } from "@/lib/contrast";
import PreferidaToggle from "@/components/map/stop-details/preferida-toggle";
import { track } from "@/lib/analytics";
import { useBusFinder } from "@/context/buses";
import { DrawerClose } from "@/components/ui/drawer";

interface StopDetailsHeaderProps {
  externalId: string;
  name: string;
  lines: Line[];
  /** Soonest arrival per line code. A line absent from it has none due. */
  nextByLine: Map<string, Date>;
  dataUpdatedAt: number | null;
  isFetching: boolean;
  refetch: () => void;
}

export const StopDetailsHeader = ({
  externalId,
  name,
  lines,
  nextByLine,
  dataUpdatedAt,
  isFetching,
  refetch,
}: StopDetailsHeaderProps) => {
  const { requestCloseStop } = useBusFinder();

  // Soonest first, so the bus you are about to miss is the one you do not have
  // to scroll for. Lines with nothing due sink to the end rather than dropping
  // out — "line 7 serves this stop and has no bus" is worth knowing, and a row
  // whose membership changed every refresh would be unreadable.
  const ordered = useMemo(
    () =>
      [...lines].sort((a, b) => {
        const ta = nextByLine.get(a.code)?.getTime();
        const tb = nextByLine.get(b.code)?.getTime();
        if (ta === undefined) return tb === undefined ? 0 : 1;
        if (tb === undefined) return -1;
        return ta - tb;
      }),
    [lines, nextByLine],
  );

  return (
    <div className="flex items-start justify-between gap-2">
      {/* `min-w-0` or the line strip sizes to its content and pushes the
          buttons off instead of scrolling inside its own width. */}
      <div className="min-w-0 flex-1">
        {/* One row, scrolled sideways rather than wrapped: this sits above a
            timetable that wants every pixel, and a stop with eight lines would
            otherwise spend three rows saying what one can.

            `li`s, not badges loose inside a list — a screen reader reading an
            `ol` with no list items announces a list of nothing. */}
        <ScrollArea className="-mx-1 w-full">
          <ul
            className="flex w-max items-center gap-1.5 px-1 pb-1"
            aria-label="línies d'aquesta parada i pròxim bus"
          >
            {ordered.map((l) => {
              const next = nextByLine.get(l.code);
              return (
                <li
                  key={l.code}
                  className="bg-muted/60 flex shrink-0 items-center gap-1 rounded-md py-0.5 pr-1.5 pl-0.5"
                >
                  <Badge
                    className="px-2 py-0 text-[11px]"
                    style={{
                      backgroundColor: l.color,
                      color: getContrastTextColor(l.color),
                    }}
                    aria-label={`línia ${l.code}`}
                  >
                    {l.code}
                  </Badge>
                  {/* `CountdownTimer` so the one that matters — the bus inside
                      ten minutes — counts down in seconds, and anything further
                      out stays a flat "24 min". */}
                  <span className="text-[11px] font-semibold tabular-nums">
                    {next ? (
                      <CountdownTimer targetDate={next} />
                    ) : (
                      <span className="text-muted-foreground font-normal">
                        —
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <h2 className="mt-2 text-xl font-bold">{name}</h2>
        <LastUpdated timestamp={dataUpdatedAt} />
      </div>
      <div className="flex items-center gap-1">
        <PreferidaToggle externalId={externalId} />
        <Button
          onClick={() => {
            track("stop refreshed");
            refetch();
          }}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Refresh bus times"
          disabled={isFetching}
        >
          <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
        </Button>
        {/* On pointer down, not on click: the drawer is `dismissible={false}`
            so a drag cannot discard the stop, and `requestCloseStop` has to be
            committed before `DrawerClose`'s click arrives or vaul refuses it.
            `onKeyDown` is the same arming for Enter/Space on the button. */}
        <DrawerClose asChild>
          <Button
            onPointerDown={requestCloseStop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") requestCloseStop();
            }}
            variant="ghost"
            size="icon"
            aria-label="Tanca"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerClose>
      </div>
    </div>
  );
};

export default StopDetailsHeader;
