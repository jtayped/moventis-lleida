"use client";

import { useMemo } from "react";
import { api } from "@/trpc/react";
import type { BusPosition, Lines } from "@moventis/shared";

export type BusLineStatus = "loading" | "done" | "error";

/** Aggregated live-bus state for every selected line. */
export interface LineBuses {
  /** All located buses across the selected lines, each carrying its `lineCode`. */
  positions: BusPosition[];
  /** Per-line fetch status, for the drawer indicator. */
  statusByLine: Record<string, BusLineStatus>;
}

/**
 * Fetches inferred live bus positions for every selected line, one
 * `buses.byLine` query per line so React Query caches each independently and
 * refreshes them on a ~25 s timer. Decoupled from any open stop: selecting a
 * line is all it takes to predict its buses. A failing line never affects the
 * others (or the timetable).
 */
export function useLineBuses(selectedRoutes: Lines[]): LineBuses {
  const queries = api.useQueries((t) =>
    selectedRoutes.map((code) =>
      t.buses.byLine(
        { routeCode: code },
        {
          refetchInterval: 25_000,
          refetchOnWindowFocus: true,
          staleTime: 20_000,
        },
      ),
    ),
  );

  return useMemo(() => {
    const positions: BusPosition[] = [];
    const statusByLine: Record<string, BusLineStatus> = {};

    selectedRoutes.forEach((code, i) => {
      const q = queries[i];
      if (!q) return;
      if (q.data) positions.push(...q.data);
      statusByLine[code] = q.isError
        ? "error"
        : q.isLoading
          ? "loading"
          : "done";
    });

    return { positions, statusByLine };
    // queries identities change each render; selectedRoutes + the query states drive it.
  }, [selectedRoutes, queries]);
}
