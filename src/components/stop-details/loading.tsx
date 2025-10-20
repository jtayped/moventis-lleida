import { Skeleton } from "@/components/ui/skeleton";

export const StopDetailsSkeleton = () => {
  return (
    <div className="mt-4 p-4 md:mx-auto md:w-lg">
      <div className="mb-4 flex items-center justify-between pb-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <Skeleton className="h-6 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20 rounded-md" />
              <Skeleton className="h-10 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StopDetailsSkeleton;
