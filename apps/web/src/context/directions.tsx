"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { track, type DirectionsSource } from "@/lib/analytics";

/**
 * One end of a trip. A stop and a dropped pin carry their coordinates; "my
 * location" does not, because it is whatever the device reports when the plan
 * is asked for — the panel resolves it from the one geolocation watch the map
 * already runs.
 */
export type DirectionsPlace =
  | { kind: "location" }
  | { kind: "stop"; externalId: string; name: string; lat: number; lng: number }
  | { kind: "pin"; lat: number; lng: number };

export type PlaceField = "from" | "to";

interface DirectionsValue {
  isOpen: boolean;
  from: DirectionsPlace | null;
  to: DirectionsPlace | null;
  /** `null` is "leave now", re-read on every refresh rather than frozen. */
  departAt: Date | null;
  /** The itinerary drawn on the map and expanded in the list. */
  selectedId: string | null;
  /** Which field the next map tap (or pin tap) fills, if any. */
  picking: PlaceField | null;
  open: (preset: { to?: DirectionsPlace }, source: DirectionsSource) => void;
  close: () => void;
  setPlace: (field: PlaceField, place: DirectionsPlace | null) => void;
  swap: () => void;
  setDepartAt: (at: Date | null) => void;
  select: (id: string | null) => void;
  startPicking: (field: PlaceField) => void;
  stopPicking: () => void;
}

const DirectionsContext = createContext<DirectionsValue | null>(null);

/**
 * Directions state, above `BusFinderProvider` on purpose: the phone's stop
 * sheet is rendered by that provider rather than by the map shell, and its
 * "com arribar-hi" has to reach this. Nothing here reads the bus finder, so
 * the order costs nothing.
 *
 * Every setter that changes the question clears the selected itinerary: an
 * id from the previous answer would otherwise keep a stale route on the map
 * until the new one arrived and happened not to contain it.
 */
export function DirectionsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [from, setFrom] = useState<DirectionsPlace | null>(null);
  const [to, setTo] = useState<DirectionsPlace | null>(null);
  const [departAt, setDepartAtState] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState<PlaceField | null>(null);

  const open = useCallback(
    (preset: { to?: DirectionsPlace }, source: DirectionsSource) => {
      track("directions opened", { source });
      setIsOpen(true);
      setSelectedId(null);
      setPicking(null);
      // "My location" is the start nearly everyone means; the panel falls
      // back to an empty field if the device will not say where it is.
      setFrom((f) => f ?? { kind: "location" });
      if (preset.to) setTo(preset.to);
    },
    [],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setPicking(null);
    setSelectedId(null);
  }, []);

  const setPlace = useCallback(
    (field: PlaceField, place: DirectionsPlace | null) => {
      (field === "from" ? setFrom : setTo)(place);
      setSelectedId(null);
      setPicking(null);
    },
    [],
  );

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
    setSelectedId(null);
  }, [from, to]);

  const setDepartAt = useCallback((at: Date | null) => {
    setDepartAtState(at);
    setSelectedId(null);
  }, []);

  const value = useMemo<DirectionsValue>(
    () => ({
      isOpen,
      from,
      to,
      departAt,
      selectedId,
      picking,
      open,
      close,
      setPlace,
      swap,
      setDepartAt,
      select: setSelectedId,
      startPicking: setPicking,
      stopPicking: () => setPicking(null),
    }),
    [
      isOpen,
      from,
      to,
      departAt,
      selectedId,
      picking,
      open,
      close,
      setPlace,
      swap,
      setDepartAt,
    ],
  );

  return (
    <DirectionsContext.Provider value={value}>
      {children}
    </DirectionsContext.Provider>
  );
}

export function useDirections(): DirectionsValue {
  const value = useContext(DirectionsContext);
  if (!value)
    throw new Error("useDirections must be used within a DirectionsProvider");
  return value;
}
