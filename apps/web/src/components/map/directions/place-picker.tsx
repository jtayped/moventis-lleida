"use client";

import React, { useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";

import { StopResult } from "@/components/map/search-panel/stop-result";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useBusFinder } from "@/context/buses";
import type { DirectionsPlace, PlaceField } from "@/context/directions";
import { useColorByLine } from "@/hooks/use-color-by-line";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/trpc/react";

const MAX_RESULTS = 30;

interface PlacePickerProps {
  field: PlaceField;
  /** Whether "la meva ubicació" is worth offering (the device has not refused). */
  locationAvailable: boolean;
  onPick: (place: DirectionsPlace) => void;
  onPickOnMap: () => void;
}

const OPTION =
  "hover:bg-accent focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none";

/**
 * Choosing one end of a trip: the device's position, a point on the map, or a
 * stop by name.
 *
 * This runs a stop search of its own, which the main search panel's notes say
 * must never happen *there* — that list and the map's pins must agree, and they
 * share one query. This one is a different question with its own field, and it
 * must not move the map's pins or the main search field as someone types into
 * it. The query string is the cache key, so typing the same name in both still
 * costs one request.
 */
export const PlacePicker = ({
  field,
  locationAvailable,
  onPick,
  onPickOnMap,
}: PlacePickerProps) => {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query).trim();
  const colorByLine = useColorByLine();
  const { isPreferida } = useBusFinder();

  const results = api.stops.getMany.useQuery(
    { routeCodes: [], query: debounced },
    { enabled: debounced.length > 0, staleTime: 60_000 },
  );
  const stops = [...(results.data ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, MAX_RESULTS);

  const label = field === "from" ? "origen" : "destinació";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="px-4">
        <InputGroup className="bg-card dark:bg-card">
          <InputGroupInput
            autoFocus
            placeholder={`${label}: nom de la parada`}
            aria-label={`busca la parada d'${field === "from" ? "origen" : "arribada"}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          {results.isFetching && (
            <InputGroupAddon align="inline-end">
              <Spinner />
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        <ul className="space-y-0.5" aria-label={`opcions per a ${label}`}>
          {locationAvailable && (
            <li>
              <button
                type="button"
                className={OPTION}
                onClick={() => onPick({ kind: "location" })}
              >
                <LocateFixed className="size-4 text-blue-500" aria-hidden />
                la meva ubicació
              </button>
            </li>
          )}
          <li>
            <button type="button" className={OPTION} onClick={onPickOnMap}>
              <MapPin className="text-muted-foreground size-4" aria-hidden />
              tria al mapa
            </button>
          </li>
        </ul>

        {debounced.length > 0 && (
          <div className="border-border mt-2 border-t pt-2">
            {results.isError ? (
              <p className="text-destructive px-3 py-2 text-sm">
                no s&apos;ha pogut cercar. torna-ho a provar
              </p>
            ) : results.isLoading ? (
              <p className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
                <Spinner /> carregant
              </p>
            ) : stops.length === 0 ? (
              <p className="text-muted-foreground px-3 py-2 text-sm">
                cap parada amb aquest nom
              </p>
            ) : (
              <ul className="space-y-0.5" aria-label="parades">
                {stops.map((stop) => (
                  <StopResult
                    key={stop.id}
                    stop={stop}
                    colorByLine={colorByLine}
                    saved={isPreferida(stop.externalId)}
                    onSelect={() =>
                      onPick({
                        kind: "stop",
                        externalId: stop.externalId,
                        name: stop.name,
                        lat: stop.latitude,
                        lng: stop.longitude,
                      })
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
