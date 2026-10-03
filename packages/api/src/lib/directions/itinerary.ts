import type {
  BusLeg,
  DirectionsPoint,
  DirectionsStop,
  Itinerary,
  ItineraryLeg,
  LngLat,
  WalkLeg,
} from "@moventis/shared";
import { instantAtServiceSecond } from "../zoned-time";
import { rideGeometry } from "./leg-geometry";
import { walkMeters, walkSeconds, type Network } from "./network";
import { journeyWalkMeters } from "./plan";
import type { RaptorJourney } from "./raptor";

export interface ItineraryContext {
  /** `YYYY-MM-DD`, the day the network's seconds count from. */
  serviceDate: string;
  from: DirectionsPoint;
  to: DirectionsPoint;
}

const lngLat = (p: DirectionsPoint): LngLat => [p.lng, p.lat];

/** FNV-1a, base 36: a short id that is the same for the same journey. */
function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function stopRef(network: Network, index: number): DirectionsStop {
  const s = network.stops[index]!;
  return { externalId: s.externalId, name: s.name, lat: s.lat, lng: s.lng };
}

function walk(
  from: DirectionsPoint,
  to: DirectionsPoint,
  fromStop: DirectionsStop | null,
  toStop: DirectionsStop | null,
  startAt: Date,
  endAt: Date,
  meters: number,
): WalkLeg {
  return {
    kind: "walk",
    from: { lat: from.lat, lng: from.lng },
    to: { lat: to.lat, lng: to.lng },
    fromStop,
    toStop,
    startAt,
    endAt,
    meters,
    path: [lngLat(from), lngLat(to)],
  };
}

/** A RAPTOR journey as the client draws and lists it. */
export function toItinerary(
  network: Network,
  journey: RaptorJourney,
  ctx: ItineraryContext,
): Itinerary {
  const at = (sec: number) => instantAtServiceSecond(ctx.serviceDate, sec);
  const legs: ItineraryLeg[] = [];
  const keys: string[] = [];
  let t = journey.departAt;

  for (const leg of journey.legs) {
    if (leg.kind === "access") {
      const stop = stopRef(network, leg.stop);
      if (leg.meters > 0)
        legs.push(
          walk(
            ctx.from,
            stop,
            null,
            stop,
            at(t),
            at(t + leg.seconds),
            leg.meters,
          ),
        );
      t += leg.seconds;
      keys.push(`a${stop.externalId}`);
    } else if (leg.kind === "ride") {
      const pattern = network.patterns[leg.pattern]!;
      const trip = pattern.trips[leg.trip]!;
      const line = network.lines.get(trip.routeId);
      const indices = pattern.stops.slice(
        leg.boardPosition,
        leg.alightPosition + 1,
      );
      const stops = indices.map((s, i) => ({
        ...stopRef(network, s),
        at: at(trip.times[leg.boardPosition + i]!),
      }));
      const geometry = trip.variantId
        ? (network.variants.get(trip.variantId)?.geometry ?? null)
        : null;
      const bus: BusLeg = {
        kind: "bus",
        lineCode: line?.code ?? "",
        color: line?.color ?? "#1571FD",
        headsign: trip.headsign,
        from: stopRef(network, indices[0]!),
        to: stopRef(network, indices.at(-1)!),
        departAt: at(trip.times[leg.boardPosition]!),
        arriveAt: at(trip.times[leg.alightPosition]!),
        stops,
        path: rideGeometry(
          geometry,
          stops.map((s) => [s.lng, s.lat]),
        ),
      };
      legs.push(bus);
      t = trip.times[leg.alightPosition]!;
      keys.push(`${trip.key}@${bus.from.externalId}-${bus.to.externalId}`);
    } else if (leg.kind === "transfer") {
      const from = stopRef(network, leg.from);
      const to = stopRef(network, leg.to);
      if (leg.meters > 0)
        legs.push(
          walk(from, to, from, to, at(t), at(t + leg.seconds), leg.meters),
        );
      t += leg.seconds;
    } else {
      const stop = stopRef(network, leg.stop);
      if (leg.meters > 0)
        legs.push(
          walk(
            stop,
            ctx.to,
            stop,
            null,
            at(t),
            at(t + leg.seconds),
            leg.meters,
          ),
        );
      t += leg.seconds;
      keys.push(`e${stop.externalId}`);
    }
  }

  return {
    id: shortHash(keys.join("|")),
    departAt: at(journey.departAt),
    arriveAt: at(journey.arriveAt),
    durationS: journey.arriveAt - journey.departAt,
    transfers: Math.max(0, journey.trips - 1),
    walkMeters: journeyWalkMeters(journey),
    legs,
  };
}

/** Walking the whole way, leaving at `departAt` (service seconds). */
export function walkOnlyLeg(
  straightMeters: number,
  departAt: number,
  ctx: ItineraryContext,
): WalkLeg {
  const seconds = walkSeconds(straightMeters);
  return walk(
    ctx.from,
    ctx.to,
    null,
    null,
    instantAtServiceSecond(ctx.serviceDate, departAt),
    instantAtServiceSecond(ctx.serviceDate, departAt + seconds),
    walkMeters(straightMeters),
  );
}
