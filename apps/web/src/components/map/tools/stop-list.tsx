"use client";

import { useMemo, useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { useBusFinder } from "@/context/buses";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LINE_COLORS, type Lines } from "@moventis/shared";
import { getContrastTextColor } from "@/lib/contrast";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function StopListContent({ routeCode }: { routeCode: Lines }) {
  const { selectedStop, findStop, selectStop, getDirectionForRoute, setDirectionFilter } =
    useBusFinder();

  const dir = getDirectionForRoute(routeCode);
  const color = LINE_COLORS[routeCode];
  const contrastColor = getContrastTextColor(color);

  const { data: variants } = api.routes.getVariantStops.useQuery(
    { code: routeCode },
    { staleTime: Infinity },
  );

  const orderedStops = useMemo(() => {
    if (!variants) return [];
    // Prefer principal variant in the selected direction; fall back to any variant in that direction.
    const inDir = variants.filter((v) => v.direction === dir);
    const principal = inDir.find((v) => v.isPrincipal);
    return (principal ?? inDir[0])?.stops ?? [];
  }, [variants, dir]);

  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selectedStop?.id]);

  if (orderedStops.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={dir === "I" ? "default" : "outline"}
          className="h-7 gap-1 text-xs"
          style={dir === "I" ? { backgroundColor: color, color: contrastColor } : undefined}
          onClick={() => setDirectionFilter(routeCode, "I")}
        >
          <ArrowRight size={12} />
          Anada
        </Button>
        <Button
          size="sm"
          variant={dir === "V" ? "default" : "outline"}
          className="h-7 gap-1 text-xs"
          style={dir === "V" ? { backgroundColor: color, color: contrastColor } : undefined}
          onClick={() => setDirectionFilter(routeCode, "V")}
        >
          <ArrowLeft size={12} />
          Tornada
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex items-center py-1">
          {orderedStops.map((s, idx) => {
            const isSelected = s.id === selectedStop?.id;
            return (
              <div key={s.id} className="flex items-center">
                {idx > 0 && <div className="mx-0.5 h-px w-2 shrink-0 bg-gray-300" />}
                <button
                  ref={isSelected ? selectedRef : undefined}
                  className="shrink-0 rounded px-2 py-1 text-xs whitespace-nowrap transition-colors hover:bg-accent"
                  style={
                    isSelected
                      ? { backgroundColor: color, color: contrastColor, fontWeight: 600 }
                      : undefined
                  }
                  onClick={() => {
                    const stop = findStop(s.id);
                    if (stop) selectStop(stop);
                  }}
                >
                  {s.name}
                </button>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export function StopList() {
  const { selectedRoutes } = useBusFinder();
  const firstRoute = selectedRoutes[0];
  if (!firstRoute) return null;
  return <StopListContent routeCode={firstRoute} />;
}

export default StopList;
