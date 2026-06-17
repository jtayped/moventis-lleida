import React, { useMemo } from "react";
import { Badge } from "../../ui/badge";
import { Plus, Check } from "lucide-react";
import { useBusFinder } from "@/context/buses";
import { ScrollArea, ScrollBar } from "../../ui/scroll-area";
import { getContrastTextColor } from "@/lib/contrast";

const BusRoutes = () => {
  const { routes, isRouteSelected, toggleRoute, selectedRoutes, searchQuery, activeRouteCodes } =
    useBusFinder();

  const activeSet = useMemo(() => new Set(activeRouteCodes), [activeRouteCodes]);

  const sortedRoutes = useMemo(
    () =>
      [...routes].sort((a, b) => {
        const aSelected = isRouteSelected(a.code);
        const bSelected = isRouteSelected(b.code);
        return Number(bSelected) - Number(aSelected);
      }),
    [routes, isRouteSelected],
  );

  return (
    <>
      <div className="relative">
        <ScrollArea className="pb-3">
          <ol className="flex gap-1">
            {sortedRoutes.map((r) => {
              const isActive = activeSet.size === 0 || activeSet.has(r.code);
              const isSelected = isRouteSelected(r.code);
              return (
                <Badge
                  key={r.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => toggleRoute(r.code)}
                  className="cursor-pointer gap-1.5 px-2.5 py-1.5 transition-opacity"
                  style={!isActive ? { opacity: 0.4 } : undefined}
                  title={!isActive ? "fora d'horari avui" : undefined}
                >
                  {isSelected ? <Check /> : <Plus />}
                  <span
                    style={{
                      backgroundColor: r.color,
                      color: getContrastTextColor(r.color),
                      filter: !isActive ? "grayscale(1)" : undefined,
                    }}
                    className="flex size-5 items-center justify-center rounded-sm text-[11px] font-semibold"
                  >
                    {r.code}
                  </span>
                </Badge>
              );
            })}
          </ol>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-transparent to-transparent md:from-card"
          aria-hidden="true"
        />
      </div>
      {selectedRoutes.length === 0 && !searchQuery && (
        <p className="mt-1 text-xs text-foreground md:text-muted-foreground">
          Selecciona una línia per veure les parades al mapa
        </p>
      )}
    </>
  );
};

export default BusRoutes;
