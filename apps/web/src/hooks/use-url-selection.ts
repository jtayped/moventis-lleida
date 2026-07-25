import { useEffect } from "react";

/**
 * Mirrors the current selection into the query string (`?lines=1,4&stop=1234`)
 * so a refresh or a shared link restores it. The page reads these params
 * server-side, so this hook only ever writes.
 *
 * Uses the native history API instead of `router.replace`: the App Router
 * re-runs the server render on every `replace`, which would fire on each line
 * toggle. `replaceState` also keeps line toggles out of the history stack.
 */
export function useUrlSelection(
  lines: string[],
  stopExternalId: string | null,
) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (lines.length > 0) params.set("lines", lines.join(","));
    else params.delete("lines");

    if (stopExternalId) params.set("stop", stopExternalId);
    else params.delete("stop");

    // Commas are legal in a query string, and `?lines=1,4` shares far better
    // than the `%2C` that `toString()` emits.
    const query = params.toString().replaceAll("%2C", ",");
    const url = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;

    if (url === `${window.location.pathname}${window.location.search}`) return;

    window.history.replaceState(null, "", url);
  }, [lines, stopExternalId]);
}
