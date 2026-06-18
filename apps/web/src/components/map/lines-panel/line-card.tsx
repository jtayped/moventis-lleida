"use client";
import React from "react";
import { api } from "@/trpc/react";
import { getContrastTextColor } from "@/lib/contrast";
import { ChevronRight } from "lucide-react";
import type { Line } from "@moventis/shared";

interface LineCardProps {
  route: Line;
  isActive: boolean;
  onClick: () => void;
}

const PathPreview = ({ code, color }: { code: string; color: string }) => {
  const { data: pathData } = api.routes.getPath.useQuery({ code });

  if (!pathData?.paths.length) {
    return (
      <div
        className="h-8 w-20 shrink-0 rounded opacity-20"
        style={{ backgroundColor: color }}
      />
    );
  }

  const allCoords = pathData.paths
    .flat()
    .filter((c): c is [number, number] => c.length === 2);
  if (allCoords.length === 0) return null;

  const lngs = allCoords.map(([lng]) => lng);
  const lats = allCoords.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngRange = maxLng - minLng || 1;
  const latRange = maxLat - minLat || 1;

  const W = 80, H = 32, PAD = 3;
  const toX = (lng: number) =>
    PAD + ((lng - minLng) / lngRange) * (W - PAD * 2);
  // Flip y: higher lat = lower SVG y
  const toY = (lat: number) =>
    H - PAD - ((lat - minLat) / latRange) * (H - PAD * 2);

  return (
    <div className="h-8 w-20 shrink-0 overflow-hidden" aria-hidden="true">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {pathData.paths
          .filter((p) => p.length >= 2)
          .map((path, i) => (
            <polyline
              key={i}
              points={path
                .map(([lng, lat]) => `${toX(lng).toFixed(1)},${toY(lat).toFixed(1)}`)
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
      </svg>
    </div>
  );
};

const LineCard = ({ route, isActive, onClick }: LineCardProps) => {
  const textColor = getContrastTextColor(route.color);

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${!isActive ? "opacity-50" : ""}`}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-bold"
        style={{ backgroundColor: route.color, color: textColor }}
      >
        {route.code}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{route.name}</p>
        {!isActive && (
          <p className="text-xs text-muted-foreground">fora d&apos;horari avui</p>
        )}
      </div>
      <PathPreview code={route.code} color={route.color} />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
};

export default LineCard;
