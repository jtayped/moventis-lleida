"use client";

import { useMemo } from "react";

import { useBusFinder } from "@/context/buses";

/**
 * Every line's colour, keyed by its `code`.
 *
 * The routes are already on the client — `routes.getAll` is cached for a week
 * and seeded server-side into `BusFinderProvider` — so nothing here fetches.
 * This exists only so the lookup is built once instead of once per consumer:
 * the map's bus markers, the stop pins' next-bus pills and the search results
 * all colour by line code, and three copies of the same `useMemo` is three
 * places for a fallback colour to drift.
 *
 * Returns the bare map and no fallback on purpose. The callers disagree about
 * what an unknown line should look like, and they are right to: a stop pin
 * falls back to neutral zinc, a bus marker to emerald, because a bus must never
 * read as a pin.
 */
export function useColorByLine(): Map<string, string> {
  const { routes } = useBusFinder();
  return useMemo(() => new Map(routes.map((r) => [r.code, r.color])), [routes]);
}
