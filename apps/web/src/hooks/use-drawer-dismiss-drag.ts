"use client";

import { useCallback, useRef } from "react";
import { PULL_COMMIT_THRESHOLD_PX } from "@moventis/shared";

interface UseDrawerDismissDragOptions {
  /** Armed only at the lowest snap. Above it a drag down is vaul's own, and it
   *  drops the sheet a snap instead of throwing the stop away. */
  enabled: boolean;
  /** Fired once per gesture, the moment the drag passes the commit distance. */
  onDismiss: () => void;
}

/**
 * Dragging the sheet itself down at its lowest snap dismisses it.
 *
 * vaul cannot be asked for this. Its `dismissible` is one flag doing two jobs
 * — "a drag may close the sheet" and "a close request is honoured at all" —
 * and the stop drawer needs the second without the first, so it stays
 * `dismissible={false}` and vaul ignores every downward drag at the first snap
 * outright. That leaves the gesture unclaimed, which is what this reads.
 *
 * It commits mid-gesture rather than on lift-off, so the sheet leaves under the
 * finger instead of after it — the same shape as `use-drawer-pull`, whose
 * commit distance it shares so both ways of pushing the sheet down feel alike.
 *
 * Touch only, deliberately, for the same reason as `use-drawer-pull`: this is a
 * thumb on a sheet, and a mouse has the X.
 */
export function useDrawerDismissDrag({
  enabled,
  onDismiss,
}: UseDrawerDismissDragOptions) {
  /** Where this gesture started, or `null` when it is not a candidate at all. */
  const startY = useRef<number | null>(null);
  const committed = useRef(false);

  const onTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      committed.current = false;
      const touch = event.touches[0];
      // The timetable scroller runs its own vertical gesture and is the region
      // vaul is told to keep out of; one finger, one owner.
      const target = event.target as Element | null;
      const inScroller = !!target?.closest?.("[data-vaul-no-drag]");
      startY.current = enabled && touch && !inScroller ? touch.clientY : null;
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const start = startY.current;
      const touch = event.touches[0];
      if (start === null || !touch || committed.current) return;
      if (touch.clientY - start < PULL_COMMIT_THRESHOLD_PX) return;
      committed.current = true;
      onDismiss();
    },
    [onDismiss],
  );

  const reset = useCallback(() => {
    startY.current = null;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd: reset,
    onTouchCancel: reset,
  };
}
