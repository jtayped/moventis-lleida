"use client";
import React, { useState } from "react";
import { api } from "@/trpc/react";
import { DrawerClose, DrawerHeader } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ChevronLeft, X } from "lucide-react";
import { getContrastTextColor } from "@/lib/contrast";
import { useBusFinder } from "@/context/buses";
import type { Lines } from "@moventis/shared";

interface LineStopListProps {
  code: Lines;
  onBack: () => void;
}

const LineStopList = ({ code, onBack }: LineStopListProps) => {
  const { routes } = useBusFinder();
  const route = routes.find((r) => r.code === code);
  const { data: variants, isLoading } = api.routes.getVariantStops.useQuery({ code });
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  const activeVariant = variants?.[activeVariantIdx];
  const textColor = route ? getContrastTextColor(route.color) : "#ffffff";

  return (
    <>
      <DrawerHeader className="flex flex-row items-center gap-2 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="-ml-1 shrink-0"
        >
          <ChevronLeft />
        </Button>
        {route && (
          <span
            className="flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-md px-1.5 text-sm font-bold"
            style={{ backgroundColor: route.color, color: textColor }}
          >
            {route.code}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {route?.name}
        </span>
        <DrawerClose asChild>
          <Button variant="ghost" size="icon" className="-mr-1 shrink-0">
            <X />
          </Button>
        </DrawerClose>
      </DrawerHeader>

      {variants && variants.length > 1 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {variants.map((v, i) => (
            <button
              key={i}
              onClick={() => setActiveVariantIdx(i)}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                i === activeVariantIdx
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {v.description ?? (v.direction === "I" ? "anada" : "tornada")}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            carregant...
          </p>
        ) : activeVariant ? (
          <ol className="relative ml-3 border-l border-border">
            {activeVariant.stops.map((stop, idx) => {
              const isTerminus =
                idx === 0 || idx === activeVariant.stops.length - 1;
              return (
                <li key={`${stop.id}-${idx}`} className="relative pb-4 pl-5 last:pb-0">
                  <span
                    className="absolute -left-[7px] top-[3px] size-3.5 rounded-full border-2 border-background"
                    style={{
                      backgroundColor: isTerminus
                        ? (route?.color ?? "hsl(var(--foreground))")
                        : "hsl(var(--muted-foreground))",
                    }}
                  />
                  <span
                    className={`text-sm leading-snug ${isTerminus ? "font-medium" : "text-muted-foreground"}`}
                  >
                    {stop.name}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            no hi ha parades
          </p>
        )}
      </div>
    </>
  );
};

export default LineStopList;
