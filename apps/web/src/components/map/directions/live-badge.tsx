"use client";

import { Radio } from "lucide-react";
import type { BusLeg } from "@moventis/shared";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { clock } from "./format";

/** Further ahead than this, Moventis lists no live prediction to ask for. */
const LIVE_HORIZON_MS = 90 * 60_000;

/**
 * The live prediction for one boarding, beside its timetabled time. Renders
 * nothing until there is one: a bus that is not reporting yet has nothing to
 * add to the printed time, and "no data" next to every far-off bus would be
 * noise.
 */
export const LiveBadge = ({
  leg,
  className,
}: {
  leg: BusLeg;
  className?: string;
}) => {
  const soon = leg.departAt.getTime() - Date.now() < LIVE_HORIZON_MS;
  const live = api.directions.liveDeparture.useQuery(
    {
      stopExternalId: leg.from.externalId,
      lineCode: leg.lineCode,
      headsign: leg.headsign,
      scheduledAt: leg.departAt,
    },
    { enabled: soon, refetchInterval: 30_000, staleTime: 20_000 },
  );

  const data = live.data;
  if (!data?.isRealTime) return null;

  const deltaMin = Math.round(
    (data.predictedAt.getTime() - leg.departAt.getTime()) / 60_000,
  );
  const late = deltaMin >= 2;
  const note =
    deltaMin === 0
      ? "a l'hora"
      : deltaMin > 0
        ? `+${deltaMin} min`
        : `${deltaMin} min`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        late
          ? "text-amber-700 dark:text-amber-400"
          : "text-emerald-700 dark:text-emerald-400",
        className,
      )}
      title="temps real de moventis"
    >
      <Radio className="size-3" aria-hidden />
      <span className="sr-only">temps real:</span>
      {clock(data.predictedAt)} · {note}
    </span>
  );
};
