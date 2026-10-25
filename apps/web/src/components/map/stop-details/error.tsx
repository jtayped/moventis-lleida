import { Button } from "@/components/ui/button";
import PreferidaToggle from "@/components/map/stop-details/preferida-toggle";
import {
  StopDetailsShell,
  type StopDetailsVariant,
} from "@/components/map/stop-details/shell";
import { useLang } from "@/i18n/lang-context";
import { stopDetailsCopy } from "@/i18n/copy/stop-details";

interface StopDetailsErrorProps {
  externalId: string;
  refetch: () => void;
  variant: StopDetailsVariant;
}

export const StopDetailsError = ({
  externalId,
  refetch,
  variant,
}: StopDetailsErrorProps) => {
  const t = stopDetailsCopy[useLang()].error;
  return (
    <StopDetailsShell variant={variant}>
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
        <h3 className="text-destructive font-semibold">{t.title}</h3>
        <Button
          onClick={() => refetch()}
          variant="destructive"
          className="mt-4"
        >
          {t.retry}
        </Button>
      </div>
    </StopDetailsShell>
  );
};

export default StopDetailsError;
