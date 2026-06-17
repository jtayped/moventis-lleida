// Pure aggregation logic for collapsing overlapping route variations into a
// small set of clean polylines. Exported separately so it can be unit-tested.
//
// A line has several "variations" (trayectos) that share large trunk segments.
// Drawing them all overlaps into doubled/messy lines. We:
//   1. snap points to a ~1m grid so near-identical points collapse to one vertex,
//   2. dedupe undirected segments across all variations (shared streets become one),
//   3. stitch contiguous segments into as few polylines as possible, splitting at
//      junctions (so genuinely separate streets stay separate).

/** Grid size in degrees. ~3.3m at Lleida's latitude.
 *  Larger than the raw 1m to absorb sub-meter variation in OSRM-matched
 *  coordinates at road junctions (different traces enter/exit the same road
 *  at slightly different positions). */
export const DEFAULT_GRID = 3e-5;

const M_PER_DEG_LAT = 111_320;

const toMeters = (dLng, dLat, lat) => {
  const cos = Math.cos((lat * Math.PI) / 180) || 1e-9;
  return [dLng * M_PER_DEG_LAT * cos, dLat * M_PER_DEG_LAT];
};

/** Compass bearing (deg, 0 = north) from a to b. */
const bearing = (a, b) => {
  const lat = (a[1] + b[1]) / 2;
  const [dx, dy] = toMeters(b[0] - a[0], b[1] - a[1], lat);
  return (((Math.atan2(dx, dy) * 180) / Math.PI) + 360) % 360;
};

const angleDiff = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * Collapse divided-road carriageways into a single centerline.
 *
 * On a divided avenue the route is traced once per direction, each on its own
 * carriageway ~15-20m apart, so the line appears doubled. We pull each point
 * toward the nearest point from another variation that runs in the *opposite*
 * direction within `radius` metres — i.e. its partner on the other carriageway —
 * snapping both onto the midline. Same-direction traces (and genuinely separate
 * streets farther than `radius`) are left untouched. A few passes let the two
 * carriageways converge so the later grid-dedup merges them into one line.
 *
 * @param {{points: [number, number][]}[]} variations
 * @param {{radius?: number, passes?: number, oppositeTol?: number}} [opts]
 * @returns {{points: [number, number][]}[]}
 */
export function mergeCarriageways(variations, opts = {}) {
  const radius = opts.radius ?? 22; // max gap for opposite-direction carriageways
  const sameRadius = opts.sameRadius ?? 11; // max gap for same-direction dupes
  const sameTol = opts.sameTol ?? 25; // deg, "same direction" tolerance
  const passes = opts.passes ?? 8;
  const oppositeTol = opts.oppositeTol ?? 40;
  const window = opts.window ?? 3; // smooth displacement over +/- this many points
  const cell = (radius / M_PER_DEG_LAT) * 1.2; // grid cell in degrees, >= radius

  // Flatten to point objects (bearing fixed from the original geometry).
  const structured = variations.map((v, vi) => {
    const arr = v.points ?? [];
    return arr.map((cur, i) => {
      const prev = arr[i - 1];
      const next = arr[i + 1];
      const b = next && prev
        ? bearing(prev, next)
        : next
          ? bearing(cur, next)
          : prev
            ? bearing(prev, cur)
            : 0;
      return { p: [cur[0], cur[1]], b, vi };
    });
  });
  const flat = structured.flat();
  if (flat.length === 0) return variations;

  for (let pass = 0; pass < passes; pass++) {
    // Spatial hash of current positions.
    const grid = new Map();
    for (const pt of flat) {
      const k = `${Math.round(pt.p[0] / cell)}:${Math.round(pt.p[1] / cell)}`;
      let bucket = grid.get(k);
      if (!bucket) grid.set(k, (bucket = []));
      bucket.push(pt);
    }

    // Raw displacement toward the midline with the nearest qualifying partner:
    //  - opposite-direction within `radius` (the two carriageways of a divided
    //    road), allowed even within the same trace (out-and-back loops), or
    //  - same-direction within `sameRadius` from a *different* trace (two
    //    variations tracing the same direction a few metres apart).
    // null when this point has no twin to merge with.
    for (const arr of structured) {
      for (const pt of arr) {
        const cx = Math.round(pt.p[0] / cell);
        const cy = Math.round(pt.p[1] / cell);
        let best = null;
        let bestD = Infinity;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const bucket = grid.get(`${gx}:${gy}`);
            if (!bucket) continue;
            for (const q of bucket) {
              if (q === pt) continue;
              const opposite = angleDiff(pt.b, (q.b + 180) % 360) <= oppositeTol;
              const same =
                q.vi !== pt.vi && angleDiff(pt.b, q.b) <= sameTol;
              const maxD = opposite ? radius : same ? sameRadius : -1;
              if (maxD < 0) continue;
              const lat = (pt.p[1] + q.p[1]) / 2;
              const [dx, dy] = toMeters(q.p[0] - pt.p[0], q.p[1] - pt.p[1], lat);
              const d = Math.hypot(dx, dy);
              if (d < bestD && d <= maxD) {
                bestD = d;
                best = q;
              }
            }
          }
        }
        pt.disp = best
          ? [(best.p[0] - pt.p[0]) / 2, (best.p[1] - pt.p[1]) / 2]
          : null;
      }
    }

    // Smooth the displacement along each trace (treating "no partner" as zero)
    // so a carriageway slides toward the centerline coherently instead of
    // jittering point-by-point, then apply.
    for (const arr of structured) {
      const smoothed = arr.map((_, i) => {
        let sx = 0;
        let sy = 0;
        let n = 0;
        for (let j = i - window; j <= i + window; j++) {
          if (j < 0 || j >= arr.length) continue;
          const d = arr[j].disp;
          n++;
          if (d) {
            sx += d[0];
            sy += d[1];
          }
        }
        return n ? [sx / n, sy / n] : [0, 0];
      });
      arr.forEach((pt, i) => {
        pt.p = [pt.p[0] + smoothed[i][0], pt.p[1] + smoothed[i][1]];
      });
    }
  }

  return structured.map((arr) => ({ points: arr.map((pt) => pt.p) }));
}

const keyOf = (lng, lat, grid) =>
  `${Math.round(lng / grid)}:${Math.round(lat / grid)}`;

const edgeId = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * @param {{points: [number, number][]}[]} variations
 * @param {{grid?: number}} [opts]
 * @returns {[number, number][][]} array of polylines, each [lng,lat][]
 */
export function aggregatePaths(variations, opts = {}) {
  const grid = opts.grid ?? DEFAULT_GRID;

  /** vertex key -> representative real coord [lng,lat] (first seen) */
  const coords = new Map();
  /** vertex key -> Set of neighbor keys */
  const adj = new Map();
  /** undirected edge id -> [keyA, keyB] */
  const edges = new Map();

  const remember = (lng, lat) => {
    const k = keyOf(lng, lat, grid);
    if (!coords.has(k)) coords.set(k, [lng, lat]);
    if (!adj.has(k)) adj.set(k, new Set());
    return k;
  };

  for (const variation of variations) {
    const pts = variation.points ?? [];
    let prev = null;
    for (const [lng, lat] of pts) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      const k = remember(lng, lat);
      if (prev !== null && prev !== k) {
        const id = edgeId(prev, k);
        if (!edges.has(id)) edges.set(id, [prev, k]);
        adj.get(prev).add(k);
        adj.get(k).add(prev);
      }
      prev = k;
    }
  }

  const degree = (k) => adj.get(k).size;
  const used = new Set();

  /** Walk a trail from `start` along edge to `next`, through degree-2 nodes only. */
  const walk = (start, next) => {
    const trail = [start];
    let prev = start;
    let cur = next;
    for (;;) {
      const id = edgeId(prev, cur);
      if (used.has(id)) break;
      used.add(id);
      trail.push(cur);
      // Continue straight only through pass-through (degree-2) vertices.
      if (degree(cur) !== 2) break;
      let advanced = false;
      for (const nb of adj.get(cur)) {
        if (nb === prev) continue;
        if (used.has(edgeId(cur, nb))) continue;
        prev = cur;
        cur = nb;
        advanced = true;
        break;
      }
      if (!advanced) break;
    }
    return trail;
  };

  const paths = [];

  // 1. Start trails at endpoints/junctions (degree !== 2) so streets split cleanly.
  for (const k of adj.keys()) {
    if (degree(k) === 2) continue;
    for (const nb of adj.get(k)) {
      if (used.has(edgeId(k, nb))) continue;
      paths.push(walk(k, nb));
    }
  }

  // 2. Remaining unused edges belong to pure loops (all degree-2). Consume them.
  for (const [id, [a, b]] of edges) {
    if (used.has(id)) continue;
    paths.push(walk(a, b));
  }

  // Map vertex keys back to representative coordinates.
  return paths.map((trail) => trail.map((k) => coords.get(k)));
}
