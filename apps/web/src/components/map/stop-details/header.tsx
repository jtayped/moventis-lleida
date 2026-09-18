import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  dataUpdatedAt: number | null;
  isFetching: boolean;
  refetch: () => void;
}

export const StopDetailsHeader = ({
  externalId,
  name,
  lines,
  dataUpdatedAt,
  isFetching,
  refetch,
}: StopDetailsHeaderProps) => {
  const { requestCloseStop } = useBusFinder();

  return (
    <div className="flex items-start justify-between">
      <div>
        {/* `li`s, not badges loose inside a list — a screen reader reading an
            `ol` with no list items announces a list of nothing. */}
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label="línies d'aquesta parada"
        >
          {lines.map((l) => (
            <li key={l.code}>
              <Badge
                className="px-2 py-0 text-[11px]"
                style={{
                  backgroundColor: l.color,
                  color: getContrastTextColor(l.color),
                }}
              >
                {l.code}
              </Badge>
            </li>
          ))}
        </ul>
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
