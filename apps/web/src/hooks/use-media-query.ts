"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/**
 * `useLayoutEffect` warns when it runs during SSR, where it does nothing anyway.
 * The passive effect is the server-side stand-in; only the browser path matters.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Whether the viewport currently matches a CSS media query.
 *
 * Starts `false` on the server and on the first client render alike — there is no
 * viewport to measure during SSR, so seeding `useState` from `matchMedia` would
 * make the two disagree and trip a hydration mismatch.
 *
 * The correction runs in a *layout* effect, which is what keeps that first wrong
 * render from ever reaching the screen: React flushes it before the browser
 * paints. A passive effect paints the mobile branch for a frame first — invisible
 * while every caller's surface is closed, but a `?stop=` deep link opens the stop
 * on mount, and on a desktop that frame is a bottom sheet flying in and being
 * yanked away again.
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 1024px)"); // Tailwind's `lg`
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    // Read once on mount as well as on change: a query that already matches
    // never fires `change`, and would otherwise stay `false` forever.
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}
