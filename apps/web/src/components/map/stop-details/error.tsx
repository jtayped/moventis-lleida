import { Button } from "@/components/ui/button";
import PreferidaToggle from "@/components/map/stop-details/preferida-toggle";

interface StopDetailsErrorProps {
  externalId: string;
  refetch: () => void;
}

export const StopDetailsError = ({
  externalId,
  refetch,
}: StopDetailsErrorProps) => {
  return (
    <div className="flex h-[400px] flex-col p-4">
      {/*
        The star survives the error state on purpose. A saved stop still has a pin
        on the map whether or not its arrival times load — and if the reason they
        never load is the stop itself (gone from the API, or left with no routes),
        this is the only control that can take that pin off again.
      */}
      <div className="flex justify-end">
        <PreferidaToggle externalId={externalId} />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h3 className="text-destructive font-semibold">
          hi ha hagut un problema carregant els busos :(
        </h3>
        <Button onClick={() => refetch()} variant="destructive" className="mt-4">
          torna a intentar-ho
        </Button>
      </div>
    </div>
  );
};

export default StopDetailsError;
