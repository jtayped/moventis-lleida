"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "moventis:consent";

/**
 * The device's answer to the storage notice.
 *
 * `unset` deliberately behaves like `accepted` everywhere: the only thing this
 * gates — the saved stops in `use-preferides.ts` — is storage the user triggers
 * by hand, which ePrivacy Art. 5(3) already exempts from needing consent. The
 * notice is a product choice, not a legal gate, so nothing is withheld until it
 * is answered. Only an explicit `declined` changes behaviour.
 */
export type ConsentStatus = "unset" | "accepted" | "declined";

/**
 * Same-document fan-out.
 *
 * `storage` only fires in *other* tabs, and this hook has two live instances in
 * one tree — the banner, and `usePreferides` through `BusFinderProvider`. Without
 * this set, declining in the banner would update the banner's copy of the state
 * and leave the saved stops writing happily on.
 */
const listeners = new Set<(status: ConsentStatus) => void>();

/**
 * Tolerant by design, same as `use-preferides.ts`: this runs on mount on every
 * page, so anything unreadable has to degrade to a default rather than throw.
 * Unreadable is not consent, so the default is `unset`.
 */
function parse(raw: string | null): ConsentStatus {
  if (!raw) return "unset";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return "unset";
    const { status } = parsed as { status?: unknown };
    return status === "accepted" || status === "declined" ? status : "unset";
  } catch {
    return "unset";
  }
}

/**
 * Whether this device has accepted, declined, or not yet answered the notice
 * about storing saved stops locally.
 */
export function useCookieConsent() {
  // Starts `unset` on the server and on the first client render alike —
  // localStorage is unreadable during SSR, so seeding `useState` from it would
  // make the two disagree and trip a hydration mismatch. Filled in below.
  const [status, setStatus] = useState<ConsentStatus>("unset");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStatus(parse(window.localStorage.getItem(STORAGE_KEY)));
    setHydrated(true);

    // A choice made in another tab applies to the device, not to that tab.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setStatus(parse(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    listeners.add(setStatus);

    return () => {
      window.removeEventListener("storage", onStorage);
      listeners.delete(setStatus);
    };
  }, []);

  const write = useCallback((next: ConsentStatus) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ status: next }),
      );
    } catch {
      // Private mode, or quota. The choice still holds for this session; it just
      // gets asked again next visit, which is the safe way for this to degrade.
    }
    // After the write, so every instance sees the same answer even if the write
    // itself failed.
    for (const listener of listeners) listener(next);
  }, []);

  const accept = useCallback(() => write("accepted"), [write]);
  const decline = useCallback(() => write("declined"), [write]);

  return {
    status,
    /** False until localStorage has been read, so callers can avoid a flash. */
    hydrated,
    accept,
    decline,
  };
}
