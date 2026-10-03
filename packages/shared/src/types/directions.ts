import type { LngLat } from "../lib/geo";

/** A point someone travels from or to: the device's position, a dropped pin, a stop. */
export interface DirectionsPoint {
  lat: number;
  lng: number;
}

export interface DirectionsStop {
  /** `Stop.externalId` — the same public id `?stop=` uses. */
  externalId: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * On foot, in a straight line: there is no street graph, so `meters` is the
 * straight-line distance times a detour factor and `path` is two points.
 */
export interface WalkLeg {
  kind: "walk";
  from: DirectionsPoint;
  to: DirectionsPoint;
  /** Set when the walk starts or ends at a stop (a transfer, or reaching the first bus). */
  fromStop: DirectionsStop | null;
  toStop: DirectionsStop | null;
  startAt: Date;
  endAt: Date;
  meters: number;
  path: LngLat[];
}

export interface BusLeg {
  kind: "bus";
  lineCode: string;
  color: string;
  /** The variant's description, e.g. "arnau de vilanova - estacio d'autobusos". */
  headsign: string;
  from: DirectionsStop;
  to: DirectionsStop;
  /** Scheduled, from the timetable. The live prediction is `directions.liveDeparture`. */
  departAt: Date;
  arriveAt: Date;
  /** Every stop ridden through, boarding and alighting stops included, with its scheduled time. */
  stops: (DirectionsStop & { at: Date })[];
  /** The line's own geometry between the two stops. */
  path: LngLat[];
}

export type ItineraryLeg = WalkLeg | BusLeg;

export interface Itinerary {
  /** Stable for the same trips and stops, so a refetch keeps the selection. */
  id: string;
  /** When to leave the origin. */
  departAt: Date;
  arriveAt: Date;
  durationS: number;
  transfers: number;
  walkMeters: number;
  legs: ItineraryLeg[];
}

export interface DirectionsPlan {
  /** Lleida service date the plan was computed on, `YYYY-MM-DD`. */
  serviceDate: string;
  itineraries: Itinerary[];
  /** Walking the whole way, when it is short enough to be a real option. */
  walkOnly: WalkLeg | null;
  /** Lines that run that day but had no stored timetable, so could not be planned with. */
  missingLines: string[];
}

export interface LiveDeparture {
  /** Live prediction (or the published time, when the stop lists it as scheduled). */
  predictedAt: Date;
  isRealTime: boolean;
}
