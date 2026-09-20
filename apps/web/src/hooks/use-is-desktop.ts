"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Where the floating left column has room to sit beside a map that is still
 * worth looking at. Tailwind's `lg`, so the JS branches below and the
 * `lg:`-prefixed classes that hide and show the two chrome layouts agree.
 */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * The column's own width, and the gutter it floats in. Kept here rather than
 * only in a class because the map has to pan around the column too — see
 * `PANEL_PAN_OFFSET_PX`. Matches `w-[28rem]` and `p-4` in `components/map`.
 */
export const PANEL_WIDTH_PX = 448;
const PANEL_GUTTER_PX = 16;

/**
 * How far west to shove the map's centre so a stop focused on desktop lands
 * clear of the column instead of behind it. Half the space the column occupies
 * puts the pin in the middle of what is left of the map.
 */
export const PANEL_PAN_OFFSET_PX = (PANEL_WIDTH_PX + PANEL_GUTTER_PX * 2) / 2;

/** @see DESKTOP_QUERY */
export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY);
