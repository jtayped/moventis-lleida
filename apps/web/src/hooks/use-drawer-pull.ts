"use client";

import { useCallback, useRef, type RefObject } from "react";
import {
  INITIAL_PULL_STATE,
  trackDrawerPull,
  type PullCommit,
  type PullState,
} from "@moventis/shared";

interface UseDrawerPullOptions {
  /** The scrolling element the gesture is read from. */
  viewportRef: RefObject<HTMLDivElement | null>;
  /** Fired once per gesture, when a pull past an exhausted edge crosses the
   *  commit distance. */
  onCommit: (commit: PullCommit) => void;
}

/**
 * Touch handlers that turn "pulled past the end of the list" into one snap
 * step, via the pure tracker in `@moventis/shared`.
 *
 * Touch only, deliberately: this is a thumb gesture on a sheet, and a mouse
 * has the drag handle and the wheel. Attach the handlers anywhere above the
 * scroller — touch events bubble, and `scrollTop` is read from the ref rather
 * than from the event target, which is what keeps this correct when the
 * scroller is a Radix viewport several nodes down.
 */
export function useDrawerPull({ viewportRef, onCommit }: UseDrawerPullOptions) {
  const stateRef = useRef<PullState>(INITIAL_PULL_STATE);

  const reset = useCallback(() => {
    stateRef.current = INITIAL_PULL_STATE;
  }, []);

  const onTouchMove = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const viewport = viewportRef.current;
      const touch = event.touches[0];
      if (!viewport || !touch) return;

      const { state, commit } = trackDrawerPull(stateRef.current, {
        scrollTop: viewport.scrollTop,
        scrollHeight: viewport.scrollHeight,
        clientHeight: viewport.clientHeight,
        y: touch.clientY,
      });
      stateRef.current = state;
      if (commit) onCommit(commit);
    },
    [viewportRef, onCommit],
  );

  return {
    onTouchStart: reset,
    onTouchMove,
    onTouchEnd: reset,
    onTouchCancel: reset,
  };
}
