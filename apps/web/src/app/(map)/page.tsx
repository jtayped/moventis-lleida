import BusMap from "@/components/map";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME, SITE_URL } from "@/constants/metadata";
import { BusFinderProvider } from "@/context/buses";
import { DirectionsProvider } from "@/context/directions";
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

/**
 * What the map is, for search engines: the page has almost no text of its own,
 * so this is the one place that says it is an app and that it costs nothing.
 */
const WEB_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "ca",
  applicationCategory: "TravelApplication",
  operatingSystem: "any",
  browserRequirements: "requires javascript",
  description:
    "mapa en temps real dels autobusos urbans de lleida, amb les properes arribades a cada parada.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
};

const HomePage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  // `routes.getAll` is cached, so reading it here to validate `?lines=` is
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
      <JsonLd data={WEB_APPLICATION_JSON_LD} />
      {/* The map has no visible title; this one names the page for screen
          readers and for search engines, which weigh the h1. */}
      <h1 className="sr-only">
        moventis lleida en temps real: mapa del bus urbà
      </h1>
      {/* Outside the bus finder: the phone's stop sheet is rendered by that
          provider, and its "com arribar-hi" has to reach this. */}
      <DirectionsProvider>
        <BusFinderProvider
          initialLines={initialLines}
          initialStopId={initialStopId}
        >
          <BusMap />
        </BusFinderProvider>
      </DirectionsProvider>
    </HydrateClient>
  );
};

export default HomePage;
