import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LastUpdated from "@/components/stop-details/last-updated";

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
    <div className="flex items-start justify-between pb-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{name}</h2>
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
  );
};

export default StopDetailsHeader;
