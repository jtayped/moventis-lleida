import { Skeleton } from "@/components/ui/skeleton";
import {
  StopDetailsShell,
  type StopDetailsVariant,
} from "@/components/map/stop-details/shell";

const StopDetailsSkeleton = ({ variant }: { variant: StopDetailsVariant }) => (
  <StopDetailsShell variant={variant} className="gap-4">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </StopDetailsShell>
);

export default StopDetailsSkeleton;
