"use client";

import { useMemo } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { useBusFinder } from "@/context/buses";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getContrastTextColor } from "@/lib/contrast";
import { cn } from "@/lib/utils";

type Variants = RouterOutputs["routes"]["getVariantStops"];

interface AdjacentStop {
  externalId: string;
  name: string;
}

/**
 * A pair of neighbouring stops, plus every selected line that runs between them.
 * Lines sharing a corridor collapse into one row: a stop like catalunya is served
 * by five lines that all come from plaça espanya and all go on to universitat, and
 * five near-identical rows carry one row's worth of information.
 */
interface Corridor {
  key: string;
  prev: AdjacentStop | null;
  next: AdjacentStop | null;
  codes: string[];
}

/** Chip geometry. Known up front because every row reserves a matching gap. */
const CHIP_PX = 24;
const CHIP_GAP_PX = 4;
const CHIP_CLEARANCE_PX = 12;
/** Past this many, the tail of the codes collapses into a single "+n" chip. */
const MAX_CHIPS = 5;

/** Use the principal outbound variant; fall back to any variant with this stop. */
function neighboursOf(variants: Variants, externalId: string) {
  const ordered = [...variants].sort(
    (a, b) => Number(b.isPrincipal) - Number(a.isPrincipal),
  );
  for (const variant of ordered) {
    const idx = variant.stops.findIndex((s) => s.externalId === externalId);
    if (idx === -1) continue;
    return {
      prev: idx > 0 ? (variant.stops[idx - 1] ?? null) : null,
      next:
        idx < variant.stops.length - 1
          ? (variant.stops[idx + 1] ?? null)
          : null,
    };
  }
  return null;
}

function LineChip({ code, color }: { code: string; color: string }) {
  return (
    <span
      className="flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-[11px] font-semibold ring-1 ring-black/10 dark:ring-white/20"
      style={{ backgroundColor: color, color: getContrastTextColor(color) }}
    >
      {code}
    </span>
  );
}

/**
 * One side of the walk-the-line row. Both sides are `flex-1`, so they always hold
 * equal width and the absolutely positioned chips stay on the row's true midpoint
 * however long the two stop names are.
 *
 * A missing neighbour renders as an empty cell — no label, no arrow. The single
 * remaining arrow reads as "end of the line" on its own, and we can't claim more
 * than that: the pair comes from whichever variant matched first, so a missing
 * neighbour is a fact about that variant, not about the route.
 */
function NavSide({
  stop,
  direction,
  lines,
  onSelect,
}: {
  stop: AdjacentStop | null;
  direction: "prev" | "next";
  lines: string;
  onSelect: (externalId: string) => void;
}) {
  if (!stop) return <span className="flex-1" aria-hidden />;

  const isPrev = direction === "prev";
  const arrowClass =
    "text-muted-foreground size-4 shrink-0 transition-transform duration-150";

  return (
    <button
      type="button"
      onClick={() => onSelect(stop.externalId)}
      title={stop.name}
      aria-label={`${lines}, parada ${isPrev ? "anterior" : "següent"}: ${
        stop.name
      }`}
      className={cn(
        "group hover:bg-accent focus-visible:ring-ring/50 flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 transition-colors outline-none focus-visible:ring-[3px]",
        isPrev ? "justify-start" : "justify-end",
      )}
    >
      {isPrev && (
        <ChevronLeft
          className={cn(arrowClass, "motion-safe:group-hover:-translate-x-0.5")}
        />
      )}
      <span className="truncate text-sm">{stop.name}</span>
      {!isPrev && (
        <ChevronRight
          className={cn(arrowClass, "motion-safe:group-hover:translate-x-0.5")}
        />
      )}
    </button>
  );
}

function CorridorRow({
  corridor,
  gutter,
  onSelect,
}: {
  corridor: Corridor;
  gutter: number;
  onSelect: (externalId: string) => void;
}) {
  const { routes } = useBusFinder();
  const { codes } = corridor;

  const visible =
    codes.length <= MAX_CHIPS ? codes : codes.slice(0, MAX_CHIPS - 1);
  const hidden = codes.length - visible.length;
  const lines =
    codes.length === 1 ? `línia ${codes[0]}` : `línies ${codes.join(", ")}`;

  return (
    <div className="relative flex items-center gap-1">
      <NavSide
        stop={corridor.prev}
        direction="prev"
        lines={lines}
        onSelect={onSelect}
      />
      {/* Keeps the two names clear of the chips floating over the middle. */}
      <span className="h-11 shrink-0" style={{ width: gutter }} aria-hidden />
      <NavSide
        stop={corridor.next}
        direction="next"
        lines={lines}
        onSelect={onSelect}
      />

      {/*
        Centred by position rather than by layout, so the chips hold one column
        down the rows instead of drifting with the width of the names next to them.
        The hairline ring keeps the pale line colours (line 1's yellow) defined
        against the white drawer.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
      >
        {visible.map((code) => (
          <LineChip
            key={code}
            code={code}
            color={routes.find((r) => r.code === code)?.color ?? "#888888"}
          />
        ))}
        {hidden > 0 && (
          <span className="bg-muted text-muted-foreground flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-[11px] font-medium">
            +{hidden}
          </span>
        )}
      </span>
    </div>
  );
}

export function StopNavigation({ externalId }: { externalId: string }) {
  const { selectedRoutes, selectStop } = useBusFinder();

  // One query per selected line, all sharing the cache with everything else that
  // reads a line's variants. Grouping needs every line's answer at once, which a
  // query per row can't provide.
  const variantQueries = api.useQueries((t) =>
    selectedRoutes.map((code) =>
      t.routes.getVariantStops({ code }, { staleTime: Infinity }),
    ),
  );
  const statuses = variantQueries.map((q) => q.status).join(",");

  const { corridors, gutter } = useMemo(() => {
    const byPair = new Map<string, Corridor>();

    selectedRoutes.forEach((code, i) => {
      const variants = variantQueries[i]?.data;
      if (!variants) return;
      const pair = neighboursOf(variants, externalId);
      if (!pair) return;

      const key = `${pair.prev?.externalId ?? "-"}|${pair.next?.externalId ?? "-"}`;
      const existing = byPair.get(key);
      if (existing) existing.codes.push(code);
      else
        byPair.set(key, {
          key,
          prev: pair.prev,
          next: pair.next,
          codes: [code],
        });
    });

    // The reserved gap is sized to the busiest row and handed to all of them, so
    // the names stay in two columns instead of stepping in and out row by row.
    const corridors = [...byPair.values()];
    const maxChips = corridors.reduce(
      (max, c) => Math.max(max, Math.min(c.codes.length, MAX_CHIPS)),
      1,
    );

    return {
      corridors,
      gutter:
        maxChips * CHIP_PX +
        (maxChips - 1) * CHIP_GAP_PX +
        CHIP_CLEARANCE_PX * 2,
    };
    // Deliberately keyed on `statuses` rather than on `variantQueries`: the array
    // is rebuilt every render while the resolved data inside it is stable by
    // reference, so a status change is what actually marks new data.
  }, [selectedRoutes, externalId, statuses]);

  if (corridors.length === 0) return null;

  // The negative inset puts the arrows' optical edge back in line with the stop name.
  return (
    <div className="-mx-2 mt-3 space-y-0.5">
      {corridors.map((corridor) => (
        <CorridorRow
          key={corridor.key}
          corridor={corridor}
          gutter={gutter}
          onSelect={selectStop}
        />
      ))}
    </div>
  );
}

export default StopNavigation;
