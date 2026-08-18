"use client";

import { useEffect, useState } from "react";

/**
 * Whether the viewport currently matches a CSS media query.
 *
 * Starts `false` on the server and on the first client render alike — there is no
 * viewport to measure during SSR, so seeding `useState` from `matchMedia` would
 * make the two disagree and trip a hydration mismatch. Filled in below.
 *
 * `false` is the right way to be wrong for one tick: every caller here picks a
 * mobile treatment on `false` and a desktop one on `true`, and a phone-shaped
 * surface shown briefly on a desktop is far less broken than the reverse.
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 768px)"); // Tailwind's `md`
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
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
