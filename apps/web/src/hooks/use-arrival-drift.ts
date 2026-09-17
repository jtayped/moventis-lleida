"use client";

import { useCallback, useMemo } from "react";
import {
  advanceDriftState,
  journeyKey,
  toDriftSamples,
  type ArrivalDrift,
  type DriftState,
  type Journey,
  type Schedules,
} from "@moventis/shared";

type ScheduledTime = Journey["scheduledTimes"][number];

/** What the drawer asks: given one arrival card, how far has that bus drifted? */
export type DriftLookup = (time: ScheduledTime) => ArrivalDrift | undefined;

interface StopEntry {
  state: DriftState;
  /** The `dataUpdatedAt` this entry was last advanced with. */
  lastUpdatedAt: number;
  lookup: Map<ScheduledTime, ArrivalDrift>;
}

/**
 * Per-stop tracks, module-level rather than in a ref.
 *
 * Drift is only interesting across refreshes, and the component that would own
 * the state unmounts every time the drawer closes — so a ref would reset the
 * baselines each time someone tapped a pin, looked, and tapped it again a
 * minute later. Keyed by `Stop.externalId`, the same public id the drawer and
 * the `?stop=` param use.
 */
const store = new Map<string, StopEntry>();

/** A drawer nobody has come back to in two hours is a drawer from another trip. */
const STOP_TTL_MS = 2 * 60 * 60 * 1000;

function pruneStops(now: number) {
  for (const [id, entry] of store) {
    if (now - entry.lastUpdatedAt > STOP_TTL_MS) store.delete(id);
  }
}

/**
 * Fold one refresh into a stop's tracks and index the result by the very
 * `ScheduledTime` objects the drawer renders.
 *
 * Idempotent on `dataUpdatedAt`: called again with the same fetch it returns
 * the lookup it already built rather than advancing the tracks a second time.
 * That guard is what makes it safe to call from a `useMemo` — React invokes
 * the factory twice under StrictMode, and a double advance would count one
 * refresh as two and halve every drift's apparent step.
 */
function advance(
  stopExternalId: string,
  schedules: Schedules,
  dataUpdatedAt: number,
): Map<ScheduledTime, ArrivalDrift> {
  const existing = store.get(stopExternalId);
  if (existing?.lastUpdatedAt === dataUpdatedAt) return existing.lookup;

  pruneStops(Date.now());

  // Individual tracks need no expiry of their own: a bus whose last prediction
  // is long past is simply not within tolerance of anything in the new list, so
  // the alignment drops it on the next refresh.
  const { state, drifts } = advanceDriftState(
    existing?.state ?? {},
    toDriftSamples(schedules),
  );

  // By object identity, not by timestamp: the drawer filters and splits these
  // lists but keeps the same time objects, and two buses can be due in the same
  // minute.
  const lookup = new Map<ScheduledTime, ArrivalDrift>();
  // `toDriftSamples` appends when two lines somehow share a key, so walk the
  // schedules in the same order and carry the same running offset.
  const offsets = new Map<string, number>();
  for (const line of schedules) {
    for (const journey of line.journeys) {
      const key = journeyKey(line.externalLineId, journey.name);
      const offset = offsets.get(key) ?? 0;
      const forJourney = drifts[key];
      journey.scheduledTimes.forEach((time, index) => {
        const drift = forJourney?.[offset + index];
        if (drift) lookup.set(time, drift);
      });
      offsets.set(key, offset + journey.scheduledTimes.length);
    }
  }

  store.set(stopExternalId, { state, lastUpdatedAt: dataUpdatedAt, lookup });
  return lookup;
}

/**
 * How far each arrival on this stop has moved since we first showed it.
 *
 * Feed it `details.schedules` unfiltered — every time the API returned,
 * including the ones the drawer hides for having passed. The alignment matches
 * one refresh's list against the previous one, so trimming the head would read
 * as "a bus disappeared" on every single refresh.
 */
export function useArrivalDrift({
  stopExternalId,
  schedules,
  dataUpdatedAt,
  enabled,
}: {
  stopExternalId: string;
  schedules: Schedules | undefined;
  dataUpdatedAt: number;
  enabled: boolean;
}): DriftLookup {
  // Writes to the module store from a memo, which is only defensible because
  // `advance` is idempotent on `dataUpdatedAt` (see its doc comment): a repeat
  // invocation with the same fetch returns the same lookup and changes nothing.
  const lookup = useMemo(() => {
    if (!enabled) {
      // Off: no lookup, no advance, and the stop's tracks are dropped. The
      // refreshes keep coming while the switch is off, so tracks kept across it
      // would come back describing drift nobody was watching accumulate.
      // Switching it on starts from the arrivals showing at that moment.
      store.delete(stopExternalId);
      return null;
    }
    if (!schedules || !dataUpdatedAt) return null;
    return advance(stopExternalId, schedules, dataUpdatedAt);
  }, [stopExternalId, schedules, dataUpdatedAt, enabled]);

  return useCallback((time: ScheduledTime) => lookup?.get(time), [lookup]);
}
