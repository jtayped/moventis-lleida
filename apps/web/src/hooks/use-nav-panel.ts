"use client";

import { useCallback, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import type { NavPanel, NavSource } from "@/lib/analytics";

export type { NavPanel, NavSource };

/**
 * The destinations that are *modal* when open: a scrim, a focus trap, and
 * `aria-hidden` on everything behind them.
 *
 * The bottom bar hides itself while one of these is up. It has to: it sits
 * above the non-modal stop drawer by design, and an interactive bar floating
 * over a modal scrim is both wrong to look at and unreachable to a screen
 * reader, which Radix has just hidden along with the rest of the page.
 */
const MODAL_PANELS: readonly NavPanel[] = ["lines", "settings"];

export interface NavPanelState {
  /** The destination currently showing, or `null` for the bare map. */
  panel: NavPanel | null;
  isOpen: (panel: NavPanel) => boolean;
  /** Whether the bottom bar should be on screen right now. */
  barVisible: boolean;
  open: (panel: NavPanel, source: NavSource) => void;
  close: () => void;
  /** Open `panel`, or close it if it is already the open one. */
  toggle: (panel: NavPanel, source: NavSource) => void;
  /**
   * Closes only the destinations that share the desktop column's content slot
   * with the stop timetable. Settings never competes for that slot — it is a
   * sheet over the whole layout — so selecting a stop must not tear it down.
   */
  dismissPanels: () => void;
}

/**
 * Which of the three navigation destinations is showing.
 *
 * One value rather than a boolean per surface, so "only one at a time" is true
 * by construction instead of being maintained by three effects that have to
 * agree. Before this the line browser owned a `linesOpen` in the map shell and
 * the settings sheet owned a private `open` of its own, and nothing connected
 * them — opening one over the other was possible and looked like a bug.
 *
 * The stop timetable is deliberately *not* a member. It is owned by
 * `selectedStopId` in `BusFinderContext`, it survives a destination opening
 * over it — the stop stays selected and stays pinned — and it is what the
 * desktop slot falls back to. A fourth member here would make "open the line
 * browser" throw the open stop away.
 *
 * Deliberately not a context, either. Every consumer is a direct child of the
 * map shell, and the one that isn't — the settings gear, nested in the tools
 * card — is handled by mounting the settings surface once at the top and giving
 * the gear nothing but an `onClick`.
 *
 * Opening is tracked here and nowhere else, so a new entry point cannot forget
 * to report itself.
 */
export function useNavPanel(): NavPanelState {
  const [panel, setPanel] = useState<NavPanel | null>(null);

  // Every callback below is `[]`-stable, and reads the current panel through
  // this rather than through the closure.
  //
  // That is not a micro-optimisation, it is the fix for a real bug. These
  // functions are effect dependencies — the shell opens `search` from an effect
  // watching the debounced query — and a callback that changes identity on
  // every panel change re-runs that effect. Selecting a stop then closed the
  // search results and instantly reopened them, because the query was still
  // there and the effect fired again on the new identity. The stop was
  // unreachable while anything was typed.
  const panelRef = useRef<NavPanel | null>(null);
  const commit = useCallback((next: NavPanel | null) => {
    panelRef.current = next;
    setPanel(next);
  }, []);

  // Tracked here rather than inside a state updater: React runs an updater
  // twice under StrictMode, which would send every open event twice in
  // development and, on any future concurrent re-render, in production too.
  const open = useCallback(
    (next: NavPanel, source: NavSource) => {
      if (panelRef.current !== next)
        track("nav panel opened", { panel: next, source });
      commit(next);
    },
    [commit],
  );

  const close = useCallback(() => commit(null), [commit]);

  const toggle = useCallback(
    (next: NavPanel, source: NavSource) => {
      if (panelRef.current === next) {
        commit(null);
        return;
      }
      track("nav panel opened", { panel: next, source });
      commit(next);
    },
    [commit],
  );

  const dismissPanels = useCallback(() => {
    if (panelRef.current !== "settings") commit(null);
  }, [commit]);

  const isOpen = useCallback((next: NavPanel) => panel === next, [panel]);

  return {
    panel,
    isOpen,
    barVisible: panel === null || !MODAL_PANELS.includes(panel),
    open,
    close,
    toggle,
    dismissPanels,
  };
}
