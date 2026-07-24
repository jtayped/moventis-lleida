/**
 * Pure geometry helpers for placing a point along a route polyline.
 *
 * Coordinates are `[lng, lat]` (the order stored in the DB / KML source, matching
 * {@link Coordinate}). Distances use an equirectangular approximation, which is
 * accurate to well within a metre at city scale (Lleida ≈ 41.6° N) and avoids the
 * cost of haversine for every segment.
 *
 * No server-only code lives here — these run in both the API and the browser.
 */

export type LngLat = [number, number];

// Metres per degree of latitude, and of longitude at the equator. Longitude is
// scaled by cos(lat) to account for meridian convergence.
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG = 111_320;

/** Project [lng, lat] into a local planar frame (metres) around `refLat`. */
function toMeters([lng, lat]: LngLat, refLat: number): [number, number] {
  return [lng * M_PER_DEG_LNG * Math.cos((refLat * Math.PI) / 180), lat * M_PER_DEG_LAT];
}

/** Equirectangular distance between two coordinates, in metres. */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const refLat = (a[1] + b[1]) / 2;
  const [ax, ay] = toMeters(a, refLat);
  const [bx, by] = toMeters(b, refLat);
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Cumulative arc length (metres) at each vertex of a polyline.
 * Returns an array the same length as `poly`; `[0]` is always 0.
 */
export function cumulativeArcLengths(poly: LngLat[]): number[] {
  const cum = new Array<number>(poly.length);
  cum[0] = 0;
  for (let i = 1; i < poly.length; i++) {
    cum[i] = cum[i - 1]! + distanceMeters(poly[i - 1]!, poly[i]!);
  }
  return cum;
}

/** Linear interpolation between two coordinates. */
function lerp(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Project `point` onto `poly`, returning the nearest point on the polyline and
 * its arc length (metres) from the start. `cum` may be supplied to avoid
 * recomputing cumulative lengths.
 */
export function projectToPolyline(
  point: LngLat,
  poly: LngLat[],
  cum: number[] = cumulativeArcLengths(poly),
): { arc: number; point: LngLat } {
  if (poly.length === 0) return { arc: 0, point };
  if (poly.length === 1) return { arc: 0, point: poly[0]! };

  const refLat = point[1];
  const [px, py] = toMeters(point, refLat);

  let best = { arc: 0, point: poly[0]!, dist: Infinity };

  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i]!;
    const b = poly[i + 1]!;
    const [ax, ay] = toMeters(a, refLat);
    const [bx, by] = toMeters(b, refLat);
    const dx = bx - ax;
    const dy = by - ay;
    const segLenSq = dx * dx + dy * dy;
    const t = segLenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / segLenSq));
    const footX = ax + dx * t;
    const footY = ay + dy * t;
    const dist = Math.hypot(px - footX, py - footY);
    if (dist < best.dist) {
      const segMeters = cum[i + 1]! - cum[i]!;
      best = { arc: cum[i]! + segMeters * t, point: lerp(a, b, t), dist };
    }
  }

  return { arc: best.arc, point: best.point };
}

/** The coordinate at a given arc length (metres) along `poly`, clamped to its ends. */
export function pointAtArc(poly: LngLat[], cum: number[], arc: number): LngLat {
  if (poly.length === 0) return [0, 0];
  if (poly.length === 1) return poly[0]!;

  const total = cum[cum.length - 1]!;
  const clamped = Math.max(0, Math.min(total, arc));

  for (let i = 1; i < cum.length; i++) {
    if (clamped <= cum[i]!) {
      const segMeters = cum[i]! - cum[i - 1]!;
      const t = segMeters === 0 ? 0 : (clamped - cum[i - 1]!) / segMeters;
      return lerp(poly[i - 1]!, poly[i]!, t);
    }
  }

  return poly[poly.length - 1]!;
}

/** Flatten a route's `{ paths }` geometry into one ordered polyline. */
export function flattenPaths(paths: LngLat[][]): LngLat[] {
  return paths.flat();
}
