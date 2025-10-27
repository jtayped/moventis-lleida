import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LastUpdated from "@/components/map/stop-details/last-updated";

interface StopDetailsHeaderProps {
  name: string;
  dataUpdatedAt: number | null;
  isFetching: boolean;
  refetch: () => void;
}

export const StopDetailsHeader = ({
  name,
  dataUpdatedAt,
  isFetching,
  refetch,
}: StopDetailsHeaderProps) => {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold">{name}</h2>
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
