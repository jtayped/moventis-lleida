import { isAnalyticsEnabled } from "@/hooks/use-settings";

interface UmamiTracker {
  track: (eventName: string, data?: Record<string, unknown>) => void;
}

/** Where a stop drawer was opened from. */
export type StopOpenSource = "pin" | "navigation" | "url" | "search";

/** The three destinations the bottom navigation switches between. */
export type NavPanel = "lines" | "search" | "settings";

/**
 * Which door a destination was opened by.
 *
 * Every one of them now has two: the bottom nav's tab, which exists only below
 * `lg`, and the desktop column's own button or gear. So this doubles as the
 * phone/desktop split without collecting anything about the device. `typing` is
 * the search field, which is the same control as the `Cerca` tab and so has to
 * report itself separately or it would look like the tab.
 */
export type NavSource = "nav" | "tools" | "typing";

/**
 * Every product event this app sends, with the payload it sends. One union
 * rather than string literals spread across the tree, so a renamed event is a
 * type error at the call site instead of a quietly dead line on the dashboard,
 * and so the list of what we collect is one file a privacy question can be
 * answered from.
 *
 * `undefined` means an event with no payload.
 *
 * Nothing here carries free text the user typed. `search used` says that a
 * search happened and not what was searched for, which is the whole of what the
 * numbers need: the query itself is a stop name, and stop names are the kind of
 * thing that says where someone lives.
 */
export interface AnalyticsEvents {
  "line toggled": { code: string; selected: boolean };
  "stop opened": { source: StopOpenSource };
  "stop refreshed": undefined;
  "preferida toggled": { saved: boolean };
  "preferides visibility toggled": { visible: boolean };
  "search used": undefined;
  "location requested": { result: "active" | "error" | "unsupported" };
  /**
   * One event for all three navigation destinations, replacing the old
   * `lines panel opened`. Settings had no event at all before, so the question
   * "does anyone open it?" was unanswerable; folding the three together also
   * makes them comparable, which is the only way to tell whether a tab earned
   * its third of the bar.
   */
  "nav panel opened": { panel: NavPanel; source: NavSource };
  /** Which height the stop drawer was dragged to — tells us whether the peek
   *  snap is used at all. */
  "drawer snapped": { snap: "peek" | "mid" | "full" };
  "line detail opened": { code: string };
  "setting changed": {
    setting:
      "theme" | "arrivalDrift" | "stopEtas" | "liveBusPrediction" | "analytics";
    value: string;
  };
}

/**
 * The one call site of `window.umami` in the app. A vendor change, or a change
 * to what we are willing to collect, touches this file and nothing else.
 *
 * Silently does nothing when there is no `window`, when the device has opted
 * out, or when the script hasn't loaded — blocked, still parsing, or simply
 * never rendered because the env vars are unset. None of those is a reason to
 * break the feature the event was fired from.
 */
export function track<Event extends keyof AnalyticsEvents>(
  ...[event, data]: AnalyticsEvents[Event] extends undefined
    ? [event: Event]
    : [event: Event, data: AnalyticsEvents[Event]]
): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return;
  const umami = (window as typeof window & { umami?: UmamiTracker }).umami;
  umami?.track(event, data);
}
