"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "moventis:settings";

export type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface SettingsState {
  /**
   * Opt-in to the live bus position prediction. Off by default — it's an
   * experimental feature (the prediction is still being tuned), not a stable
   * one, so nobody gets it without asking for it first.
   */
  liveBusPrediction: boolean;
  theme: ThemeSetting;
}

const DEFAULT: SettingsState = { liveBusPrediction: false, theme: "system" };

/**
 * Same-document fan-out, same reason as `use-cookie-consent.ts`: `storage`
 * only fires in *other* tabs, and this hook has several live instances in one
 * tree — the settings panel, `BusFinderProvider` (gating the live-bus fetch),
 * and the map (choosing a Map ID off `resolvedTheme`). Without this, flipping
 * a setting in the panel would repaint the panel and leave the rest on the
 * old value until reload.
 */
const listeners = new Set<(state: SettingsState) => void>();

/**
 * Tolerant by design, same as `use-preferides.ts` and `use-cookie-consent.ts`:
 * this runs on mount on every page, so anything unreadable degrades to the
 * default rather than throwing.
 */
function parse(raw: string | null): SettingsState {
  if (!raw) return DEFAULT;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT;
    const { liveBusPrediction, theme } = parsed as Partial<SettingsState>;
    return {
      liveBusPrediction: liveBusPrediction === true,
      theme:
        theme === "light" || theme === "dark" || theme === "system"
          ? theme
          : DEFAULT.theme,
    };
  } catch {
    return DEFAULT;
  }
}

function resolveIsDark(theme: ThemeSetting): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Mirrors `layout.tsx`'s inline anti-flash script (same storage key, same
 * resolution rule) so `resolvedTheme` is already correct on the very first
 * client render instead of defaulting to light and flipping a moment later.
 * That flip isn't just cosmetic here: `map.tsx` remounts the whole Google Map
 * on a `mapId` change (`mapId` can't be swapped in place), so getting this
 * right before the map's own mount effect ever runs is what keeps a theme
 * that was already known from the last visit from reloading the map tiles.
 */
function initialResolvedTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return resolveIsDark(parse(window.localStorage.getItem(STORAGE_KEY)).theme)
    ? "dark"
    : "light";
}

/**
 * Device-local app settings: the live-bus-prediction opt-in and the theme.
 * Grouped in one hook, and one storage key, because they're both answered from
 * the same settings panel — unlike `use-preferides.ts` and
 * `use-cookie-consent.ts`, neither has enough shape on its own to earn a
 * dedicated key.
 */
export function useSettings() {
  // Starts at the default on the server and on the first client render alike —
  // localStorage is unreadable during SSR, so seeding `useState` from it would
  // make the two disagree and trip a hydration mismatch. Filled in below.
  const [settings, setSettings] = useState<SettingsState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  // Exempt from the hydration-mismatch concern above: nothing about it is
  // compared against server-rendered DOM (see the doc comment on
  // `initialResolvedTheme`), so it's safe — and necessary — to read eagerly.
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    initialResolvedTheme,
  );

  // Read inside `write`, below, without making every setter depend on (and be
  // recreated by) `settings` itself.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    setSettings(parse(window.localStorage.getItem(STORAGE_KEY)));
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setSettings(parse(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    listeners.add(setSettings);

    return () => {
      window.removeEventListener("storage", onStorage);
      listeners.delete(setSettings);
    };
  }, []);

  // Keeps `<html class="dark">` and `resolvedTheme` in sync with
  // `settings.theme`, including reacting to the OS-level preference changing
  // mid-session while on "system". Gated on `hydrated` so this never
  // overwrites the correct pre-hydration read (inline script for the class,
  // `initialResolvedTheme` above for this hook's own state) with a
  // still-default "system" for the one tick before the real value loads.
  useEffect(() => {
    if (!hydrated) return;
    const apply = () => {
      const dark = resolveIsDark(settings.theme);
      document.documentElement.classList.toggle("dark", dark);
      setResolvedTheme(dark ? "dark" : "light");
    };
    apply();
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const next = JSON.stringify(settings);
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === next) return;
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode, or quota. The choice still holds for this tab; it just
      // won't survive a reload, which is the most this can degrade to.
    }
  }, [settings, hydrated]);

  // Merges into the latest known state and hands the result to every live
  // instance (this one included — it's in `listeners` too), rather than
  // calling `setSettings` here directly. One list, one path, so no instance
  // can end up a step behind another.
  const write = useCallback((patch: Partial<SettingsState>) => {
    const next = { ...settingsRef.current, ...patch };
    for (const listener of listeners) listener(next);
  }, []);

  const setLiveBusPrediction = useCallback(
    (liveBusPrediction: boolean) => write({ liveBusPrediction }),
    [write],
  );

  const setTheme = useCallback(
    (theme: ThemeSetting) => write({ theme }),
    [write],
  );

  return {
    settings,
    /** False until localStorage has been read, so callers can avoid a flash. */
    hydrated,
    /** The actual light/dark result of `settings.theme`, with "system" resolved. */
    resolvedTheme,
    setLiveBusPrediction,
    setTheme,
  };
}
