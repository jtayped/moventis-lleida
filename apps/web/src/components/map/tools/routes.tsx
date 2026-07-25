import React, { useMemo } from "react";
import { Badge } from "../../ui/badge";
import { Plus, Check, Star } from "lucide-react";
import { useBusFinder } from "@/context/buses";
import { ScrollArea, ScrollBar } from "../../ui/scroll-area";
import { getContrastTextColor } from "@/lib/contrast";

const codeOrder = (code: string) => {
  const n = parseInt(code, 10);
  return isNaN(n) ? Infinity : n;
};

const sortByCodes = (a: { code: string }, b: { code: string }) => {
  const diff = codeOrder(a.code) - codeOrder(b.code);
  return diff !== 0 ? diff : a.code.localeCompare(b.code);
};

const Divider = () => (
  <li className="mx-0.5 self-stretch w-px bg-border shrink-0" aria-hidden="true" />
);

/**
 * The saved stops, standing in the line strip as one more toggle. Same shape and
 * same position as a line badge, because it does the same job — put a set of stops
 * on the map, or take it off.
 *
 * What it deliberately doesn't share is the colour system. A line badge holds its
 * code; this holds a star. That shape difference is what separates it at a glance,
 * and it has to be, because line 1's own colour is `#FFFF18` and sits a few chips
 * to the right — no shade of gold would win that argument on hue alone.
 *
 * No caption, so the footprint matches a line badge exactly. The word would make
 * the one non-line entry the widest thing in a strip that has to stay scannable,
 * and the star is already the drawer's own control — whoever put a stop here has
 * met it.
 */
const PreferidesBadge = () => {
  const { showPreferides, togglePreferides } = useBusFinder();
  const label = showPreferides
    ? "amaga les parades preferides"
    : "mostra les parades preferides";

  return (
    <Badge
      variant={showPreferides ? "default" : "outline"}
      onClick={togglePreferides}
      className="cursor-pointer gap-1.5 px-2.5 py-1.5"
      // Without a caption there is no text node, so the badge would otherwise be
      // absent from the accessibility tree entirely — the line badges at least
      // expose their code. `Badge` renders a bare `span`, hence the explicit role.
      role="button"
      aria-pressed={showPreferides}
      aria-label={label}
      title={label}
    >
      {showPreferides ? <Check /> : <Plus />}
      <span className="flex size-5 items-center justify-center rounded-sm bg-amber-400 text-zinc-900">
        <Star size={12} className="fill-current" />
      </span>
    </Badge>
  );
};

const BusRoutes = () => {
  const {
    routes,
    isRouteSelected,
    toggleRoute,
    selectedRoutes,
    searchQuery,
    activeRouteCodes,
    preferidesCount,
    showPreferides,
  } = useBusFinder();

  const activeSet = useMemo(() => new Set(activeRouteCodes), [activeRouteCodes]);

  const { selected, unselected, unavailable } = useMemo(() => {
    const selected = [];
    const unselected = [];
    const unavailable = [];
    for (const r of routes) {
      const isActive = activeSet.size === 0 || activeSet.has(r.code);
      if (!isActive) {
        unavailable.push(r);
      } else if (isRouteSelected(r.code)) {
        selected.push(r);
      } else {
        unselected.push(r);
      }
    }
    selected.sort(sortByCodes);
    unselected.sort(sortByCodes);
    unavailable.sort(sortByCodes);
    return { selected, unselected, unavailable };
  }, [routes, activeSet, isRouteSelected]);

  const renderBadge = (r: (typeof routes)[number], isActive: boolean) => {
    const isSelected = isRouteSelected(r.code);
    return (
      <Badge
        key={r.id}
        variant={isSelected ? "default" : "outline"}
        onClick={() => toggleRoute(r.code)}
        className="cursor-pointer gap-1.5 px-2.5 py-1.5 transition-opacity"
        style={!isActive ? { opacity: 0.4 } : undefined}
        title={!isActive ? "fora d'horari avui" : undefined}
      >
        {isSelected ? <Check /> : <Plus />}
        <span
          style={{
            backgroundColor: r.color,
            color: getContrastTextColor(r.color),
            filter: !isActive ? "grayscale(1)" : undefined,
          }}
          className="flex size-5 items-center justify-center rounded-sm text-[11px] font-semibold"
        >
          {r.code}
        </span>
      </Badge>
    );
  };

  return (
    <>
      <div className="relative">
        <ScrollArea className="pb-3">
          <ol className="flex gap-1">
            {/* Leftmost and outside the code sort — it has no code to sort by, and
                it is the one entry here that belongs to the person, not the network. */}
            {preferidesCount > 0 && (
              <>
                <PreferidesBadge />
                <Divider />
              </>
            )}
            {selected.map((r) => renderBadge(r, true))}
            {selected.length > 0 && unselected.length > 0 && <Divider />}
            {unselected.map((r) => renderBadge(r, true))}
            {(selected.length > 0 || unselected.length > 0) && unavailable.length > 0 && (
              <Divider />
            )}
            {unavailable.map((r) => renderBadge(r, false))}
          </ol>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-transparent to-transparent md:from-card"
          aria-hidden="true"
        />
      </div>
      {/* Suppressed once saved stops are on the map: telling someone to select a
          line to see stops, while their own stops sit pinned behind the card,
          reads as the app having lost track of them. */}
      {selectedRoutes.length === 0 &&
        !searchQuery &&
        !(showPreferides && preferidesCount > 0) && (
          <p className="mt-1 text-xs text-foreground md:text-muted-foreground">
            Selecciona una línia per veure les parades al mapa
          </p>
        )}
    </>
  );
};

export default BusRoutes;
