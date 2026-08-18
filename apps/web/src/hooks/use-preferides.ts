"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

const STORAGE_KEY = "moventis:preferides";

/**
 * Upper bound on saved stops. Exists to keep `stops.getByExternalIds` from being
 * handed an unbounded list, not because anyone needs 200 favourites in a city
 * with ~500 stops. Past the cap the oldest save drops.
 */
export const MAX_PREFERIDES = 200;

interface PreferidesState {
  /** `Stop.externalId`s — the same public id the `?stop=` param carries. */
  ids: string[];
  /** Whether the saved stops are drawn on the map. */
  visible: boolean;
}

const EMPTY: PreferidesState = { ids: [], visible: true };

/**
 * Tolerant by design. This is user data written by an earlier version of the app
 * with no migration path, so anything unreadable degrades to the default instead
 * of throwing on mount and taking the whole map down with it.
 *
 * `visible` defaults to true: an absent flag means "never hidden it", not "hidden".
 */
function parse(raw: string | null): PreferidesState {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY;
    const { ids, visible } = parsed as Partial<PreferidesState>;
    return {
      ids: Array.isArray(ids)
        ? [
            ...new Set(
              ids.filter((id): id is string => typeof id === "string"),
            ),
          ].slice(0, MAX_PREFERIDES)
        : [],
      visible: visible !== false,
    };
  } catch {
    return EMPTY;
  }
}

/**
 * The saved stops (`preferides`), persisted per device in localStorage.
 *
 * Held as ids rather than whole stops: the stop record behind an id changes
 * (renames, a route added, a soft delete) and a copy cached in localStorage would
 * quietly go stale. The ids resolve through `stops.getByExternalIds` on each load.
 *
 * This is the one feature the storage notice gates. `unset` and `accepted` behave
 * identically — the least restrictive default, which the ePrivacy exemption for
 * user-triggered storage already permits. `declined` makes the whole hook inert.
 */
export function usePreferides() {
  const { status: consent } = useCookieConsent();
  const disabled = consent === "declined";

  // Starts empty on the server and on the first client render alike —
  // localStorage is unreadable during SSR, so seeding `useState` from it would
  // make the two disagree and trip a hydration mismatch. Filled in below.
  const [state, setState] = useState<PreferidesState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(parse(window.localStorage.getItem(STORAGE_KEY)));
    setHydrated(true);

    // A second tab saving a stop shouldn't be silently overwritten by this one.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setState(parse(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Declining has to clear the device, not merely stop writing to it. Keyed on
  // `disabled` rather than on the moment of the click, so it also fires on a
  // later visit where the choice was already `declined` but the key somehow
  // survived — a failed removal, or a tab that was open through the decline.
  useEffect(() => {
    if (!disabled) return;
    setState(EMPTY);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private mode, where there was nothing persisted to remove anyway. The
      // in-memory reset above is what actually clears the session either way.
    }
  }, [disabled]);

  useEffect(() => {
    // Never write before the first read, or the empty initial state overwrites
    // whatever was actually saved. And never write at all once declined, or the
    // effect above would remove the key only for this one to put it straight back.
    if (!hydrated || disabled) return;

    const next = JSON.stringify(state);
    try {
      // Compared before writing, and not merely to save a write: a write fires
      // `storage` in the other tabs, which parse it into a fresh object, land
      // here, write it back, and fire again — two tabs holding identical data
      // trading events forever.
      if (window.localStorage.getItem(STORAGE_KEY) === next) return;
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode, or quota. The selection still works for this session; it
      // just won't survive a reload, which is the most this can degrade to.
    }
  }, [state, hydrated, disabled]);

  // Derived rather than read off `state`, so the single render between consent
  // resolving to `declined` and the wipe effect running never exposes ids that
  // are on their way out — long enough for `stops.getByExternalIds` to fire.
  const ids = disabled ? EMPTY.ids : state.ids;

  const idSet = useMemo(() => new Set(ids), [ids]);

  const isPreferida = useCallback(
    (externalId: string) => idSet.has(externalId),
    [idSet],
  );

  const togglePreferida = useCallback(
    (externalId: string) => {
      // The controls already render inert off `disabled`; this is the backstop
      // for anything that doesn't, so a decline can never be written past.
      if (disabled) return;

      setState((prev) =>
        prev.ids.includes(externalId)
          ? {
              ids: prev.ids.filter((id) => id !== externalId),
              visible: prev.visible,
            }
          : {
              ids: [...prev.ids, externalId].slice(-MAX_PREFERIDES),
              // Saving unhides the list. Starring a stop and watching nothing
              // appear reads as the star being broken, not as a filter still off
              // from a previous visit.
              visible: true,
            },
      );
    },
    [disabled],
  );

  const toggleVisible = useCallback(() => {
    setState((prev) => ({ ids: prev.ids, visible: !prev.visible }));
  }, []);

  // The settings panel's data-management action. Leaves `visible` alone: with
  // zero ids there's nothing for it to show or hide either way.
  const clear = useCallback(() => {
    if (disabled) return;
    setState((prev) => ({ ids: [], visible: prev.visible }));
  }, [disabled]);

  return {
    ids,
    visible: state.visible,
    /** False until localStorage has been read, so callers can avoid a flash. */
    hydrated,
    /**
     * Saving is off because the device declined the storage notice. Exposed
     * rather than swallowed inside `togglePreferida` so the controls can say so —
     * a star that quietly does nothing reads as a bug, not as a choice.
     */
    disabled,
    isPreferida,
    togglePreferida,
    toggleVisible,
    clear,
  };
}
