import {
  cumulativeArcLengths,
  distanceMeters,
  pointAtArc,
  projectToPolyline,
  type LngLat,
} from "@moventis/shared";

/**
 * How far ahead along the line the next stop may be looked for, as a multiple
 * of its straight-line distance from the previous one, plus a flat margin.
 * Bounding the search is what keeps an out-and-back street (the same road
 * driven both ways, stops a few metres from either pass) from snapping a stop
 * to the return leg and drawing the whole loop in between.
 */
const LOOKAHEAD_FACTOR = 3;
const LOOKAHEAD_SLACK_M = 300;

/** A boarding stop this close to where the line starts is boarded at its start (loops end there too). */
const START_SNAP_M = 60;

/** The part of `path` between two arc lengths, endpoints included. */
function between(
  path: LngLat[],
  cum: number[],
  from: number,
  to: number,
): LngLat[] {
  const out: LngLat[] = [pointAtArc(path, cum, from)];
  for (let i = 0; i < path.length; i++)
    if (cum[i]! > from && cum[i]! < to) out.push(path[i]!);
  out.push(pointAtArc(path, cum, to));
  return out;
}

/**
 * The line's own geometry for a ride through `stops` (boarding stop first,
 * alighting stop last). Each stop is projected onto the polyline no earlier
 * than the previous one, so the result follows the direction of travel.
 * Without geometry, or when the projection makes no headway, the stops
 * themselves are joined instead.
 */
export function rideGeometry(
  geometry: LngLat[] | null,
  stops: LngLat[],
): LngLat[] {
  if (!geometry || geometry.length < 2 || stops.length < 2) return stops;
  const cum = cumulativeArcLengths(geometry);
  const total = cum.at(-1)!;

  let arc =
    distanceMeters(stops[0]!, geometry[0]!) <= START_SNAP_M
      ? 0
      : projectToPolyline(stops[0]!, geometry, cum).arc;
  const start = arc;
  const out: LngLat[] = [pointAtArc(geometry, cum, arc)];
  for (let i = 1; i < stops.length; i++) {
    const reach =
      distanceMeters(stops[i - 1]!, stops[i]!) * LOOKAHEAD_FACTOR +
      LOOKAHEAD_SLACK_M;
    const window = between(geometry, cum, arc, Math.min(total, arc + reach));
    const next =
      arc +
      projectToPolyline(stops[i]!, window, cumulativeArcLengths(window)).arc;
    out.push(...between(geometry, cum, arc, next).slice(1));
    arc = next;
  }

  const straight = stops
    .slice(1)
    .reduce((sum, s, i) => sum + distanceMeters(stops[i]!, s), 0);
  // A ride whose stops all snapped to one spot drew nothing useful.
  return arc - start < straight * 0.5 ? stops : out;
}
