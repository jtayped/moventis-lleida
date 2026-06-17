import type { Coordinate } from "@moventis/shared";

/**
 * Turn a set of selected bus lines into parallel-offset "stripes" so that where
 * several lines run along the same street, each colour sits side-by-side instead
 * of drawing on top of one another (transit-map style). A line that is alone on a
 * street stays centred on the road; where lines join a shared corridor they fan
 * out, and they merge back to centre where they diverge.
 *
 * The offset is computed in metres (perpendicular to the road), so it is
 * zoom-stable: stripes visually overlap when zoomed out and separate when zoomed
 * in. Geometry only needs recomputing when the selection changes.
 *
 * Shared segments are detected by snapping each segment's endpoints to the same
 * grid used by the aggregation step — after OSRM snapping, lines on the same OSM
 * road share near-identical vertices, so their segments collide on the grid.
 */

const GRID = 3e-5; // ~3.3m — matches packages/db aggregate snapping
const M_PER_DEG_LAT = 111_320;
const DEFAULT_SPACING_M = 6; // gap between adjacent stripes

export interface LineInput {
  code: string;
  color: string;
  paths: Coordinate[][];
}

export interface LineLayer {
  code: string;
  color: string;
  paths: Coordinate[][];
}

const keyOf = (c: Coordinate) =>
  `${Math.round(c[0] / GRID)}:${Math.round(c[1] / GRID)}`;

const segId = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const compareCodes = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

/** Perpendicular offset (in degrees) for a directed edge, given metres offset. */
function perpOffsetDeg(
  from: Coordinate,
  to: Coordinate,
  offsetM: number,
): Coordinate {
  if (offsetM === 0) return [0, 0];
  const latRad = (((from[1] + to[1]) / 2) * Math.PI) / 180;
  const cosLat = Math.cos(latRad) || 1e-9;
  const dxm = (to[0] - from[0]) * M_PER_DEG_LAT * cosLat;
  const dym = (to[1] - from[1]) * M_PER_DEG_LAT;
  const len = Math.hypot(dxm, dym);
  if (len === 0) return [0, 0];
  // unit perpendicular (rotate direction +90°) in metres space
  const px = -dym / len;
  const py = dxm / len;
  return [
    (px * offsetM) / (M_PER_DEG_LAT * cosLat),
    (py * offsetM) / M_PER_DEG_LAT,
  ];
}

export function computeOffsetLayers(
  lines: LineInput[],
  spacingM: number = DEFAULT_SPACING_M,
): LineLayer[] {
  // 1. Which lines use each undirected segment.
  const segLines = new Map<string, Set<string>>();
  for (const line of lines) {
    for (const path of line.paths) {
      for (let i = 0; i + 1 < path.length; i++) {
        const ka = keyOf(path[i]!);
        const kb = keyOf(path[i + 1]!);
        if (ka === kb) continue;
        const id = segId(ka, kb);
        let set = segLines.get(id);
        if (!set) segLines.set(id, (set = new Set()));
        set.add(line.code);
      }
    }
  }

  // 2. Each line's slot/multiplier on a segment (stable order by line code).
  const multiplierFor = (id: string, code: string): number => {
    const set = segLines.get(id);
    if (!set || set.size <= 1) return 0;
    const sorted = [...set].sort(compareCodes);
    const slot = sorted.indexOf(code);
    return slot - (sorted.length - 1) / 2;
  };

  // 3. Offset each line's geometry. Each edge is displaced by its perpendicular;
  //    vertices average the two adjacent edges so the line stays continuous.
  return lines.map((line) => {
    const paths = line.paths.map((path) => {
      if (path.length < 2) return path;

      // Per-edge offset endpoints (using a canonical orientation so every line on
      // a shared segment offsets to the same physical side).
      const startOff: Coordinate[] = [];
      const endOff: Coordinate[] = [];
      for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i]!;
        const b = path[i + 1]!;
        const ka = keyOf(a);
        const kb = keyOf(b);
        const id = segId(ka, kb);
        const mult = multiplierFor(id, line.code);
        // Canonical direction: from the smaller key to the larger key.
        const [from, to] = ka < kb ? [a, b] : [b, a];
        const off = perpOffsetDeg(from, to, mult * spacingM);
        startOff.push([a[0] + off[0], a[1] + off[1]]);
        endOff.push([b[0] + off[0], b[1] + off[1]]);
      }

      const out: Coordinate[] = [startOff[0]!];
      for (let i = 1; i < path.length - 1; i++) {
        const e = endOff[i - 1]!;
        const s = startOff[i]!;
        out.push([(e[0] + s[0]) / 2, (e[1] + s[1]) / 2]);
      }
      out.push(endOff[endOff.length - 1]!);
      return out;
    });

    return { code: line.code, color: line.color, paths };
  });
}
