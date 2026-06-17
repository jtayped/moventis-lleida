// Aggregate OSRM-matched line files into clean, deduplicated polylines.
//
// Reads:  packages/db/data/route-paths/matched/{code}.json  (from snap-to-roads.mjs)
// Writes: packages/db/data/route-paths/{code}.json           ({ code, paths })
//
// Run from repo root: node packages/db/scripts/aggregate-route-paths.mjs

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { aggregatePaths } from "./aggregate-paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../data/route-paths");
const MATCHED_DIR = path.join(ROOT, "matched");

async function main() {
  const files = (await fs.readdir(MATCHED_DIR)).filter((f) => f.endsWith(".json"));
  const summary = [];

  for (const file of files) {
    const raw = JSON.parse(
      await fs.readFile(path.join(MATCHED_DIR, file), "utf8"),
    );
    const { code, variations } = raw;

    // Drop loop variations (start ≈ end within ~200m) when non-loop alternatives
    // exist. Loop service variants (terminal circles, peak-hour diversions) bloat
    // the merged graph into a spider-web. Truly circular routes have only loops, so
    // we keep them all in that case.
    const isLoop = (pts) => {
      if (pts.length < 2) return false;
      const dx = pts[0][0] - pts[pts.length - 1][0];
      const dy = pts[0][1] - pts[pts.length - 1][1];
      return Math.hypot(dx, dy) < 0.002; // ~200m at Lleida latitude
    };
    const nonLoops = variations.filter((v) => !isLoop(v.points));
    const filtered = nonLoops.length > 0 ? nonLoops : variations;
    if (filtered.length !== variations.length) {
      console.log(
        `  line ${code}: dropped ${variations.length - filtered.length} loop variation(s)`,
      );
    }

    // OSRM already snaps to road centerlines, so carriageway merging is not needed.
    const paths = aggregatePaths(filtered);

    await fs.writeFile(
      path.join(ROOT, `${code}.json`),
      JSON.stringify({ code, paths }),
    );

    const rawPoints = filtered.reduce((n, v) => n + v.points.length, 0);
    const outPoints = paths.reduce((n, p) => n + p.length, 0);
    summary.push({
      code,
      variations: filtered.length,
      rawPoints,
      paths: paths.length,
      outPoints,
    });
  }

  summary.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  for (const s of summary) {
    console.log(
      `line ${s.code}: ${s.variations} variations, ${s.rawPoints} raw pts -> ${s.paths} paths, ${s.outPoints} pts`,
    );
  }
}

await main();
