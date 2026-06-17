import { Skeleton } from "@/components/ui/skeleton";

const StopDetailsSkeleton = () => (
  <div className="mt-4 flex flex-col gap-4 p-4 md:mx-auto md:w-lg">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

export default StopDetailsSkeleton;
