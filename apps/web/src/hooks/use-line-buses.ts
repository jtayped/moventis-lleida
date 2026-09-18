"use client";

import { useMemo } from "react";
import { api } from "@/trpc/react";
import type { BusPosition, Lines } from "@moventis/shared";
import { MAX_PREDICTED_LINES } from "@/lib/live-buses";

/**
 * `"skipped"` is not a failure: the line is selected, but the prediction was
 * not run for it because {@link MAX_PREDICTED_LINES} was already met. It exists
 * so the UI can say that out loud — without it, a capped line is
 * indistinguishable from one whose fetch failed, and the drawer reports an
 * outage that never happened.
 */
export type BusLineStatus = "loading" | "done" | "error" | "skipped";

/** Aggregated live-bus state for every selected line. */
export interface LineBuses {
  /** All located buses across the predicted lines, each carrying its `lineCode`. */
  positions: BusPosition[];
  /** Per-line fetch status, for the drawer indicator. */
  statusByLine: Record<string, BusLineStatus>;
}

/**
 * Fetches inferred live bus positions for the most recently selected lines, one
 * `buses.byLine` query per line so React Query caches each independently and
 * refreshes them on a ~25 s timer. Decoupled from any open stop: selecting a
 * line is all it takes to predict its buses. A failing line never affects the
 * others (or the timetable).
 *
 * @param selectedRoutes In selection order — `toggleRoute` appends, so the tail
 * is what the user reached for most recently, and that is what the cap keeps.
 * @param enabled The device's own opt-in (`useSettings().settings.liveBusPrediction`,
 * off by default — it's an experimental feature, not a stable one). The caller
 * decides this, not this hook: whether the prediction runs is a settings
 * concern, fetching it once asked to is a data concern.
 */
export function useLineBuses(
  selectedRoutes: Lines[],
  enabled: boolean,
): LineBuses {
  const linesToQuery = useMemo(
    () => (enabled ? selectedRoutes.slice(-MAX_PREDICTED_LINES) : []),
    [enabled, selectedRoutes],
  );

  const skippedLines = useMemo(
    () =>
      enabled ? selectedRoutes.slice(0, -MAX_PREDICTED_LINES) : ([] as Lines[]),
    [enabled, selectedRoutes],
  );

  const queries = api.useQueries((t) =>
    linesToQuery.map((code) =>
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

    for (const code of skippedLines) statusByLine[code] = "skipped";

    linesToQuery.forEach((code, i) => {
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
    // queries identities change each render; linesToQuery + the query states drive it.
  }, [linesToQuery, skippedLines, queries]);
}
