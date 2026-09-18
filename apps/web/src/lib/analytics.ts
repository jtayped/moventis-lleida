import { isAnalyticsEnabled } from "@/hooks/use-settings";

interface UmamiTracker {
  track: (eventName: string, data?: Record<string, unknown>) => void;
}

/** Where a stop drawer was opened from. */
export type StopOpenSource = "pin" | "navigation" | "url";

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
  "lines panel opened": undefined;
  /** Which height the stop drawer was dragged to — tells us whether the peek
   *  snap is used at all. */
  "drawer snapped": { snap: "peek" | "mid" | "full" };
  "line detail opened": { code: string };
  "setting changed": {
    setting: "theme" | "arrivalDrift" | "liveBusPrediction" | "analytics";
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
