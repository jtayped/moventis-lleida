"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import React, { useDeferredValue, useId, useState } from "react";
import type { StopIndexEntry } from "@moventis/api";
import { LineBadge } from "@/components/content/line-badge";
import { FOCUS_RING } from "@/components/content/styles";
import { compareLineCodes } from "@/lib/lines";
import { slugify, stopPath } from "@/lib/stops";
import { cn } from "@/lib/utils";

/** The heading a stop sorts under: its first letter, or "#" for a number. */
const letterOf = (name: string) => {
  const first = slugify(name).charAt(0);
  return /[a-z]/.test(first) ? first : "#";
};

/**
 * Every stop, A to Z, with a search box over them.
 *
 * The full list is server-rendered, so it is a crawlable index of every stop
 * page; the box only hides what does not match. Matching ignores accents and
 * punctuation, so "placa espanya" finds "plaça espanya / saracibar".
 */
export const StopFinder = ({
  stops,
  colors,
}: {
  stops: StopIndexEntry[];
  colors: Record<string, string>;
}) => {
  const id = useId();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const needle = slugify(deferred).replace(/-/g, " ");

  const matching = needle
    ? stops.filter((stop) =>
        slugify(stop.name).replace(/-/g, " ").includes(needle),
      )
    : stops;
  const letters = [...new Set(matching.map((s) => letterOf(s.name)))].sort();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor={`${id}-q`} className="block text-sm font-medium">
          cerca una parada
        </label>
        <div className="relative">
          <Search
            size={18}
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            id={`${id}-q`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="p. ex. plaça espanya"
            autoComplete="off"
            className={cn(
              "border-border bg-background min-h-12 w-full rounded-lg border py-2 pr-3 pl-10 text-base",
              FOCUS_RING,
            )}
          />
        </div>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {needle
            ? `${matching.length} ${matching.length === 1 ? "parada" : "parades"}`
            : `${stops.length} parades`}
        </p>
      </div>

      {!needle && (
        <nav aria-label="parades per lletra">
          <ul className="flex flex-wrap gap-1.5">
            {letters.map((letter) => (
              <li key={letter}>
                <a
                  href={`#lletra-${letter === "#" ? "num" : letter}`}
                  className={cn(
                    "bg-muted hover:bg-muted/70 flex size-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                    FOCUS_RING,
                  )}
                >
                  {letter}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {letters.map((letter) => (
        <section
          key={letter}
          id={`lletra-${letter === "#" ? "num" : letter}`}
          className="scroll-mt-6 space-y-2"
        >
          <h2 className="text-lg font-semibold">{letter}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {matching
              .filter((stop) => letterOf(stop.name) === letter)
              .map((stop) => (
                <li key={stop.externalId}>
                  <Link
                    href={stopPath(stop)}
                    className={cn(
                      "border-border hover:bg-muted/40 flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                      FOCUS_RING,
                    )}
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {stop.name}
                    </span>
                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                      {[...stop.lineCodes]
                        .sort(compareLineCodes)
                        .map((code) => (
                          <LineBadge
                            key={code}
                            code={code}
                            color={colors[code] ?? "#888888"}
                            className="size-7 rounded text-xs"
                          />
                        ))}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}

      {needle && matching.length === 0 && (
        <p className="bg-muted/60 rounded-lg px-4 py-3 text-sm">
          cap parada es diu així. prova amb una altra paraula del nom.
        </p>
      )}
    </div>
  );
};
