"use client";

import { api } from "@/trpc/react";
import { LINE_COLORS, type Lines } from "@moventis/shared";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useBusFinder } from "@/context/buses";

interface StopSequenceProps {
  stopId: string;
}

function VariantStrip({
  routeCode,
  stopId,
}: {
  routeCode: Lines;
  stopId: string;
}) {
  const { data: variants } = api.routes.getVariantStops.useQuery(
    { code: routeCode },
    { staleTime: Infinity },
  );

  if (!variants?.length) return null;

  const color = LINE_COLORS[routeCode];

  const matchingVariants = variants
    .map((v) => {
      const idx = v.stops.findIndex((s) => s.id === stopId);
      return idx === -1 ? null : { ...v, stopIndex: idx };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  if (matchingVariants.length === 0) return null;

  return (
    <div className="space-y-2">
      {matchingVariants.map((variant) => {
        const { stopIndex, stops, direction, description } = variant;
        const prev = stops[stopIndex - 1];
        const current = stops[stopIndex]!;
        const next = stops[stopIndex + 1];

        return (
          <div
            key={`${routeCode}-${direction}-${description}`}
            className="rounded-lg border p-3"
          >
            <div className="mb-2 flex items-center gap-2 text-sm">
              {direction === "I" ? (
                <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
              ) : (
                <ArrowLeft size={14} className="shrink-0 text-muted-foreground" />
              )}
              <span className="truncate font-medium">{description}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {stopIndex + 1}/{current.total}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-hidden text-xs">
              {prev && (
                <span className="max-w-24 truncate text-muted-foreground">
                  {prev.name}
                </span>
              )}
              {prev && <span className="shrink-0 text-muted-foreground">·</span>}
              <span
                className="shrink-0 rounded px-2 py-0.5 font-semibold"
                style={{
                  backgroundColor: color + "25",
                  border: `1.5px solid ${color}`,
                  color,
                }}
              >
                {current.name}
              </span>
              {next && <span className="shrink-0 text-muted-foreground">·</span>}
              {next && (
                <span className="max-w-24 truncate text-muted-foreground">
                  {next.name}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StopSequence({ stopId }: StopSequenceProps) {
  const { selectedRoutes } = useBusFinder();

  if (selectedRoutes.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {selectedRoutes.map((code) => (
        <VariantStrip key={code} routeCode={code} stopId={stopId} />
      ))}
    </div>
  );
}

export default StopSequence;
