import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export const StopDetailsSkeleton = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // We'll increment the progress every 44ms.
    // 90 steps * 44ms = 3960ms (approx 4 seconds)
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 1));
    }, 44);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-4 p-4 md:mx-auto md:w-lg">
      <div className="flex h-[400px] flex-col items-center justify-center text-center">
        <h3 className="text-lg font-semibold text-gray-700">
          carregant horaris...
        </h3>

        {/* The Progress Bar */}
        <Progress value={progress} className="my-4 w-3/4 max-w-sm" />

        <p className="mt-1 max-w-sm text-sm text-gray-500">
          estem consultant les dades de moventis, pot tardar uns segons :/
        </p>
      </div>
    </div>
  );
};

export default StopDetailsSkeleton;
