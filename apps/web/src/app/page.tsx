import BusMap from "@/components/map";
import { BusFinderProvider } from "@/context/buses";
import { api, HydrateClient } from "@/trpc/server";
import React from "react";

/** Reads a single query param; missing, empty and whitespace-only all give null. */
const param = (value: string | string[] | undefined): string | null => {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!raw) return null;
  return raw;
};

/**
 * `?lines=1,4,n1` → deduped line codes, dropping anything that isn't a real
 * route so a stale or hand-edited link can't fire empty stop queries.
 */
const parseLines = (raw: string | null, validCodes: Set<string>) => {
  if (!raw) return [];
  const codes: string[] = [];
  for (const part of raw.split(",")) {
    const code = part.trim().toLowerCase();
    if (code && validCodes.has(code) && !codes.includes(code)) {
      codes.push(code);
    }
  }
  return codes;
};

const HomePage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  // `routes.getAll` is week-cached, so reading it here to validate `?lines=` is
  // free on top of the prefetch that seeds the client cache.
  const [params, routes] = await Promise.all([
    searchParams,
    api.routes.getAll(),
    api.routes.getAll.prefetch(),
    api.routes.getTodayActive.prefetch(),
  ]);

  const initialLines = parseLines(
    param(params.lines),
    new Set(routes.map((r) => r.code)),
  );
  // An unknown `?stop=` is left to `stops.get`, which 404s into the drawer's
  // error state — validating it here would just duplicate that lookup.
  const initialStopId = param(params.stop);

  return (
    <HydrateClient>
      <BusFinderProvider
        initialLines={initialLines}
        initialStopId={initialStopId}
      >
        <BusMap />
      </BusFinderProvider>
    </HydrateClient>
  );
};

export default HomePage;
