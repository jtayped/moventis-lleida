// Snap raw route GPS traces to actual road centerlines via OSRM map matching.
//
// Reads:  packages/db/data/route-paths/raw/{code}.json
// Writes: packages/db/data/route-paths/matched/{code}.json
//
// Run: node packages/db/scripts/snap-to-roads.mjs

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../data/route-paths");
const RAW_DIR = path.join(ROOT, "raw");
const MATCHED_DIR = path.join(ROOT, "matched");

const OSRM_BASE = "http://localhost:5000/match/v1/driving";
const MAX_WAYPOINTS = 100;
const BATCH_OVERLAP = 10;
const REQUEST_DELAY_MS = 0; // no delay needed for local server

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pointToSegmentDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return [...points];
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToSegmentDist(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]];
  return [
    ...douglasPeucker(points.slice(0, maxIdx + 1), epsilon).slice(0, -1),
    ...douglasPeucker(points.slice(maxIdx), epsilon),
  ];
}

// Adaptive simplification: doubles epsilon until point count fits the target.
function simplify(points, target = MAX_WAYPOINTS) {
  let eps = 0.00005;
  let result = douglasPeucker(points, eps);
  while (result.length > target && eps < 0.1) {
    eps *= 1.5;
    result = douglasPeucker(points, eps);
  }
  return result;
}

async function osrmMatch(points) {
  const coordStr = points
    .map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
    .join(";");
  const url = `${OSRM_BASE}/${coordStr}?geometries=geojson&overview=full&tidy=true`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OSRM HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  if (data.code !== "Ok" || !data.matchings?.length) {
    throw new Error(`OSRM ${data.code}: ${data.message ?? "no matchings"}`);
  }
  // OSRM may split into multiple matchings if it detects GPS gaps — concatenate them.
  return data.matchings.flatMap((m) => m.geometry.coordinates);
}

async function matchVariation(rawPoints) {
  const simplified = simplify(rawPoints);

  if (simplified.length <= MAX_WAYPOINTS) {
    return osrmMatch(simplified);
  }

  // Batch with overlap to reduce seam artifacts.
  const STEP = MAX_WAYPOINTS - BATCH_OVERLAP;
  const allCoords = [];

  for (let start = 0; start < simplified.length; start += STEP) {
    const batch = simplified.slice(start, start + MAX_WAYPOINTS);
    const matched = await osrmMatch(batch);

    if (allCoords.length === 0) {
      allCoords.push(...matched);
    } else {
      // Skip the fraction of matched points that correspond to the overlap region.
      const skip = Math.floor(matched.length * (BATCH_OVERLAP / batch.length));
      allCoords.push(...matched.slice(Math.max(1, skip)));
    }

    if (start + MAX_WAYPOINTS < simplified.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return allCoords;
}

async function main() {
  await fs.mkdir(MATCHED_DIR, { recursive: true });

  const files = (await fs.readdir(RAW_DIR)).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const raw = JSON.parse(await fs.readFile(path.join(RAW_DIR, file), "utf8"));
    const { code, externalId, variations } = raw;
    console.log(`\nRoute ${code}: ${variations.length} variation(s)`);

    const matchedVariations = [];

    for (const variation of variations) {
      process.stdout.write(
        `  trayecto ${variation.trayectoId}: ${variation.points.length} pts → `,
      );

      try {
        const matched = await matchVariation(variation.points);
        console.log(`${matched.length} matched pts`);
        matchedVariations.push({ trayectoId: variation.trayectoId, points: matched });
      } catch (err) {
        console.log(`ERROR (${err.message}), keeping raw points`);
        matchedVariations.push(variation);
      }

      await sleep(REQUEST_DELAY_MS);
    }

    await fs.writeFile(
      path.join(MATCHED_DIR, file),
      JSON.stringify({ code, externalId, variations: matchedVariations }),
    );
    console.log(`  → saved matched/${file}`);
  }

  console.log("\nDone.");
}

await main();
