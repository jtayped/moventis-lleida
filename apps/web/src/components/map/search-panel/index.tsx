"use client";

import React, { useMemo } from "react";

import { Panel, PanelHeader } from "@/components/map/panel";
import { StopResult } from "@/components/map/search-panel/stop-result";
import StopsError from "@/components/map/stops-error";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { PEEK_CONTENT_PX, useBusFinder } from "@/context/buses";
import { useColorByLine } from "@/hooks/use-color-by-line";
import { compareLineCodes } from "@/lib/lines";

/**
 * `overlay` fills the band between the tools card and the bottom bar on a
 * phone; `panel` is the floating card in the desktop left column.
 */
type SearchPanelVariant = "overlay" | "panel";

interface SearchPanelProps {
  variant?: SearchPanelVariant;
  onClose: () => void;
}

/**
 * How many rows are drawn at once.
 *
 * A one-letter query matches most of a ~500-stop network, and nobody scrolls
 * five hundred rows to find a bus stop — they type another letter. The search
 * field's own `N parades` addon still reports the true count, so the cap never
 * hides how much was found.
 */
const MAX_RESULTS = 50;

/**
 * The `Cerca` destination: the stops matching what is in the search field.
 *
 * It runs **no query of its own**, and must not gain one. `stops` from the
 * context is already exactly the matched set — either the search-only
 * `stops.getMany`, or the selected lines' stops filtered by name — so the list
 * and the map's pins agree by construction. A second `getMany` here would put
 * one more search on the wire per debounce tick and let the two disagree.
 *
 * Gated on `debouncedSearchQuery`, never on `stops.length`: with a line
 * selected and nothing typed, `stops` is that entire line, and this would
 * render forty rows for a search nobody made.
 */
export const SearchPanel = ({
  variant = "overlay",
  onClose,
}: SearchPanelProps) => {
  const {
    stops,
    debouncedSearchQuery,
    isLoadingStops,
    stopsError,
    retryStops,
    selectedRoutes,
    isPreferida,
    selectStop,
    selectedStopId,
  } = useBusFinder();
  const colorByLine = useColorByLine();

  const hasQuery = debouncedSearchQuery.trim().length > 0;

  // Sorted by name, and each row's own chips sorted by line number. Prisma
  // returns relation rows in insertion order, which is the scraper's order and
  // means nothing to a reader.
  const results = useMemo(() => {
    if (!hasQuery) return [];
    return [...stops]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_RESULTS)
      .map((stop) => ({
        ...stop,
        lineCodes: [...stop.lineCodes].sort(compareLineCodes),
      }));
  }, [stops, hasQuery]);

  const body = (
    <>
      <PanelHeader onClose={onClose} closeLabel="tanca la cerca">
        <span className="font-semibold">cerca</span>
      </PanelHeader>

      {/* Below `lg` the stop timetable is a sheet that peeks over the bottom of
          this panel rather than replacing it, so without this the last rows sit
          under it with no way to reach them. Only the peek's own height is
          reserved: past that snap the sheet has the screen anyway.

          An inline style rather than a `pb-[…]` class, because the height comes
          from a TS constant and Tailwind only scans literal strings — an
          interpolated class name generates no CSS at all, silently. */}
      <ScrollArea
        className="min-h-0 flex-1 px-1 pb-4"
        style={
          variant === "overlay" && selectedStopId
            ? { paddingBottom: PEEK_CONTENT_PX }
            : undefined
        }
      >
        {stopsError ? (
          <div className="px-3">
            <StopsError onRetry={retryStops} />
          </div>
        ) : !hasQuery ? (
          <p className="text-muted-foreground px-3 py-2 text-sm">
            escriu el nom d&apos;una parada
          </p>
        ) : isLoadingStops ? (
          <p className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
            <Spinner /> carregant
          </p>
        ) : results.length === 0 ? (
          // Search is scoped to the selected lines when there are any — that is
          // what the map is showing — so the copy has to say so, or a stop that
          // exists on another line reads as a stop that does not exist.
          <p className="text-muted-foreground px-3 py-2 text-sm">
            {selectedRoutes.length > 0
              ? "cap parada d'aquestes línies amb aquest nom"
              : "cap parada amb aquest nom"}
          </p>
        ) : (
          <ul className="space-y-0.5" aria-label="resultats de la cerca">
            {results.map((stop) => (
              <StopResult
                key={stop.id}
                stop={stop}
                colorByLine={colorByLine}
                saved={isPreferida(stop.externalId)}
                onSelect={(externalId) => {
                  selectStop(externalId, "search");
                  // Closed here and not left to the shell's effect on
                  // `selectedStopId`. Picking the stop that is *already*
                  // selected does not change that id, so the effect never
                  // fires, and the row would read as doing nothing at all.
                  onClose();
                }}
              />
            ))}
          </ul>
        )}
      </ScrollArea>
    </>
  );

  if (variant === "panel") {
    return (
      <Panel aria-label="resultats de la cerca" className="h-full">
        {body}
      </Panel>
    );
  }

  return (
    <section
      aria-label="resultats de la cerca"
      className="bg-background flex min-h-0 flex-1 flex-col"
    >
      {body}
    </section>
  );
};

export default SearchPanel;
