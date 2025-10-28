import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LastUpdated from "@/components/map/stop-details/last-updated";
import type { Line } from "@/types/lines";
import { Badge } from "@/components/ui/badge";

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
              style={{ backgroundColor: l.color }}
            >
              {l.code}
            </Badge>
          ))}
        </ol>
        <h2 className="mt-4 text-2xl font-bold">{name}</h2>
        <LastUpdated timestamp={dataUpdatedAt} />
      </div>
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
    </div>
  );
};

export default StopDetailsHeader;
