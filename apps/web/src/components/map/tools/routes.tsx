import React, { useMemo } from "react";
import { Badge } from "../../ui/badge";
import { Plus, Check } from "lucide-react"; // 1. Import the Check icon
import { useBusFinder } from "@/context/buses";
import { ScrollArea, ScrollBar } from "../../ui/scroll-area";
import { getContrastTextColor } from "@/lib/contrast";

const BusRoutes = () => {
  const { routes, isRouteSelected, toggleRoute, selectedRoutes, searchQuery } = useBusFinder();

  // Create a sorted copy of the routes array
  // We use [...routes] to create a shallow copy before sorting
  const sortedRoutes = useMemo(
    () =>
      [...routes].sort((a, b) => {
        const aIsSelected = isRouteSelected(a.code);
        const bIsSelected = isRouteSelected(b.code);

        // This moves selected items (true) to the front
        return Number(bIsSelected) - Number(aIsSelected);
      }),
    [routes, isRouteSelected],
  );

  return (
    <>
      <div className="relative">
        <ScrollArea className="pb-3">
          <ol className="flex gap-1">
            {sortedRoutes.map((r) => (
              <Badge
                key={r.id}
                variant={isRouteSelected(r.code) ? "default" : "outline"}
                onClick={() => toggleRoute(r.code)}
                className="cursor-pointer gap-1.5 px-2.5 py-1.5"
              >
                {isRouteSelected(r.code) ? <Check /> : <Plus />}
                <span
                  style={{ backgroundColor: r.color, color: getContrastTextColor(r.color) }}
                  className="flex size-5 items-center justify-center rounded-sm text-[11px] font-semibold"
                >
                  {r.code}
                </span>
              </Badge>
            ))}
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
