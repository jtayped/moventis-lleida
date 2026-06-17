"use client";

import { useMemo } from "react";
import { api } from "@/trpc/react";
import { useBusFinder } from "@/context/buses";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LINE_COLORS, type Lines } from "@moventis/shared";
import { getContrastTextColor } from "@/lib/contrast";

interface NavItem {
  code: Lines;
  prev: { id: string; name: string } | null;
  next: { id: string; name: string } | null;
}

function RouteNav({
  routeCode,
  stopId,
}: {
  routeCode: Lines;
  stopId: string;
}) {
  const { findStop, selectStop, getDirectionForRoute } = useBusFinder();
  const dir = getDirectionForRoute(routeCode);
  const color = LINE_COLORS[routeCode];

  const { data: variants } = api.routes.getVariantStops.useQuery(
    { code: routeCode },
    { staleTime: Infinity },
  );

  const nav = useMemo((): NavItem | null => {
    if (!variants) return null;
    const dirVariants = variants.filter((v) => v.direction === dir);
    for (const variant of dirVariants) {
      const idx = variant.stops.findIndex((s) => s.id === stopId);
      if (idx === -1) continue;
      return {
        code: routeCode,
        prev: idx > 0 ? (variant.stops[idx - 1] ?? null) : null,
        next: idx < variant.stops.length - 1 ? (variant.stops[idx + 1] ?? null) : null,
      };
    }
    return null;
  }, [variants, dir, stopId, routeCode]);

  if (!nav) return null;

  const textColor = getContrastTextColor(color);

  function navigate(targetId: string) {
    const stop = findStop(targetId);
    if (stop) selectStop(stop);
  }

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-lg px-1 py-1"
      style={{ borderLeft: `3px solid ${color}`, paddingLeft: "8px" }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-xs"
        disabled={!nav.prev}
        onClick={() => nav.prev && navigate(nav.prev.id)}
      >
        <ChevronLeft size={14} />
        <span className="max-w-28 truncate">{nav.prev?.name ?? ""}</span>
      </Button>

      <span
        className="shrink-0 rounded px-2 py-0.5 text-xs font-bold"
        style={{ backgroundColor: color, color: textColor }}
      >
        {routeCode}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-xs"
        disabled={!nav.next}
        onClick={() => nav.next && navigate(nav.next.id)}
      >
        <span className="max-w-28 truncate">{nav.next?.name ?? ""}</span>
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}

export function StopNavigation({ stopId }: { stopId: string }) {
  const { selectedRoutes } = useBusFinder();
  if (selectedRoutes.length === 0) return null;

  return (
    <div className="mt-3 space-y-1">
      {selectedRoutes.map((code) => (
        <RouteNav key={code} routeCode={code} stopId={stopId} />
      ))}
    </div>
  );
}

export default StopNavigation;
