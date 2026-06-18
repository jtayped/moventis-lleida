import type { Lines } from "./lines";

export interface Journey {
  name: string;
  scheduledTimes: {
    arrivalTime: Date;
    isRealTime: boolean;
    /** Whether this specific departure uses an accessible (low-floor/wheelchair) vehicle. Null when the API does not specify. */
    accessible: boolean | null;
  }[];
}

export interface Schedule {
  externalLineId: string;
  lineCode: Lines;
  lineName: string;
  selected: boolean;
  /** Service disruption data from the Moventis API. Null when no active incident. Shape is undocumented — treat as opaque until observed non-null. */
  incidencias: unknown;
  journeys: Journey[];
}

export type Schedules = Schedule[];
