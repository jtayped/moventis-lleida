import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LastUpdated from "@/components/map/stop-details/last-updated";
import type { Line } from "@moventis/shared";
import { Badge } from "@/components/ui/badge";
import { DrawerClose } from "@/components/ui/drawer";
import { getContrastTextColor } from "@/lib/contrast";

interface StopDetailsHeaderProps {
  name: string;
  lines: Line[];
  dataUpdatedAt: number | null;
  isFetching: boolean;
  refetch: () => void;
}

export const StopDetailsHeader = ({
  name,
  lines,
  dataUpdatedAt,
  isFetching,
  refetch,
}: StopDetailsHeaderProps) => {
  return (
    <div className="flex items-start justify-between">
      <div>
        <ol className="flex flex-wrap gap-2">
          {lines.map((l) => (
            <Badge
              key={l.code}
              className="px-4 text-xs"
              style={{ backgroundColor: l.color, color: getContrastTextColor(l.color) }}
            >
              {l.code}
            </Badge>
          ))}
        </ol>
        <h2 className="mt-4 text-2xl font-bold">{name}</h2>
        <LastUpdated timestamp={dataUpdatedAt} />
      </div>
      <div className="flex items-center gap-1">
        <Button
          onClick={() => refetch()}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Refresh bus times"
          disabled={isFetching}
        >
          <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
        </Button>
        <DrawerClose asChild>
          <Button variant="ghost" size="icon" aria-label="Tanca">
            <X className="h-4 w-4" />
          </Button>
        </DrawerClose>
      </div>
    </div>
  );
};

export default StopDetailsHeader;
