"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/** @see use-media-query.ts — same reason, same shape. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Measures `--nav-height` by rendering something that tall and asking how tall
 * it is.
 *
 * The obvious `getComputedStyle(root).getPropertyValue("--nav-height")` does
 * not work: an unregistered custom property computes to its *token*, so that
 * call returns the string `"calc(4rem + env(safe-area-inset-bottom, 0px))"` and
 * `parseFloat` of it is `NaN`. Nothing warns — the snap point simply never
 * moves. A probe is what actually resolves the `calc()` and the `env()`.
 */
function measure(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:var(--nav-height)";
  document.body.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return Number.isFinite(height) ? height : 0;
}

/**
 * The bottom navigation bar's height in pixels, including whatever the device
 * reserves for a home indicator underneath it.
 *
 * CSS owns the number — `--nav-height` in `globals.css`, where it is also `0px`
 * from `lg`, so this returns 0 on a desktop with no bar. This hook exists for
 * the one consumer that cannot use a class: the stop drawer's snap points,
 * which vaul reads with `parseInt`, so a `calc()` string there becomes `NaN`
 * and the sheet lands nowhere.
 *
 * Starts at 0 on the server and on the first client render, and corrects in a
 * layout effect before paint, exactly like `useMediaQuery`. Re-measured on
 * resize, which covers both crossing `lg` and an orientation change moving the
 * home indicator.
 */
export function useNavHeight(): number {
  const [height, setHeight] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const read = () => setHeight(measure());
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return height;
}
