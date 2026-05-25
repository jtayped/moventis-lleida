import { Button } from "@/components/ui/button";

interface StopDetailsErrorProps {
  refetch: () => void;
}

export const StopDetailsError = ({ refetch }: StopDetailsErrorProps) => {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center p-4 text-center">
      <h3 className="text-destructive font-semibold">
        hi ha hagut un problema carregant els busos :(
      </h3>
      <Button onClick={() => refetch()} variant="destructive" className="mt-4">
        torna a intentar-ho
      </Button>
    </div>
  );
};

export default StopDetailsError;
