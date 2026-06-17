import React, { useMemo } from "react";
import { Badge } from "../../ui/badge";
import { Plus, Check } from "lucide-react";
import { useBusFinder } from "@/context/buses";
import { ScrollArea, ScrollBar } from "../../ui/scroll-area";
import { getContrastTextColor } from "@/lib/contrast";

const codeOrder = (code: string) => {
  const n = parseInt(code, 10);
  return isNaN(n) ? Infinity : n;
};

const sortByCodes = (a: { code: string }, b: { code: string }) => {
  const diff = codeOrder(a.code) - codeOrder(b.code);
  return diff !== 0 ? diff : a.code.localeCompare(b.code);
};

const Divider = () => (
  <li className="mx-0.5 self-stretch w-px bg-border shrink-0" aria-hidden="true" />
);

const BusRoutes = () => {
  const { routes, isRouteSelected, toggleRoute, selectedRoutes, searchQuery, activeRouteCodes } =
    useBusFinder();

  const activeSet = useMemo(() => new Set(activeRouteCodes), [activeRouteCodes]);

  const { selected, unselected, unavailable } = useMemo(() => {
    const selected = [];
    const unselected = [];
    const unavailable = [];
    for (const r of routes) {
      const isActive = activeSet.size === 0 || activeSet.has(r.code);
      if (!isActive) {
        unavailable.push(r);
      } else if (isRouteSelected(r.code)) {
        selected.push(r);
      } else {
        unselected.push(r);
      }
    }
    selected.sort(sortByCodes);
    unselected.sort(sortByCodes);
    unavailable.sort(sortByCodes);
    return { selected, unselected, unavailable };
  }, [routes, activeSet, isRouteSelected]);

  const renderBadge = (r: (typeof routes)[number], isActive: boolean) => {
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
  };

  return (
    <>
      <div className="relative">
        <ScrollArea className="pb-3">
          <ol className="flex gap-1">
            {selected.map((r) => renderBadge(r, true))}
            {selected.length > 0 && unselected.length > 0 && <Divider />}
            {unselected.map((r) => renderBadge(r, true))}
            {(selected.length > 0 || unselected.length > 0) && unavailable.length > 0 && (
              <Divider />
            )}
            {unavailable.map((r) => renderBadge(r, false))}
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
