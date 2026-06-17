// Scrape Moventis KML route variations for the given lines.
//
// Usage (from repo root):
//   node packages/db/scripts/scrape-kml.mjs 1:129 2:130 3:131
// Each arg is `code:externalId`. externalId is the Moventis ID_LINEA.
//
// For each line it probes GetKMLs/{externalId}/{trayectoId} for trayectoId 1..MAX,
// keeps every response that contains a <coordinates> block (a real variation),
// parses points as [lng, lat], and writes:
//   packages/db/data/route-paths/raw/{code}.json
//     { code, externalId, variations: [ { trayectoId, points: [[lng,lat],...] } ] }

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.resolve(__dirname, "../data/route-paths/raw");

const MAX_TRAYECTO = 40;
const BASE = "https://www.moventis.es/api/json/GetKMLs";

/** Parse all <LineString><coordinates> blocks from a KML string into [lng,lat][] arrays. */
function parseKml(kml) {
  const blocks = [...kml.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/g)];
  const lineStrings = [];
  for (const [, body] of blocks) {
    const points = body
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((triple) => {
        const [lng, lat] = triple.split(",").map(Number);
        return [lng, lat];
      })
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
    if (points.length > 1) lineStrings.push(points);
  }
  return lineStrings;
}

async function fetchTrayecto(externalId, trayectoId) {
  const url = `${BASE}/${externalId}/${trayectoId}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const text = await res.text();
  return parseKml(text);
}

async function scrapeLine(code, externalId) {
  const variations = [];
  // Probe sequentially to be gentle on the API.
  for (let trayectoId = 1; trayectoId <= MAX_TRAYECTO; trayectoId++) {
    const lineStrings = await fetchTrayecto(externalId, trayectoId);
    // A real variation yields exactly one LineString; concat just in case.
    const points = lineStrings.flat();
    if (points.length > 1) variations.push({ trayectoId, points });
  }
  const file = path.join(RAW_DIR, `${code}.json`);
  await fs.writeFile(file, JSON.stringify({ code, externalId, variations }));
  const totalPoints = variations.reduce((n, v) => n + v.points.length, 0);
  return { code, externalId, variations: variations.length, totalPoints };
}

async function main() {
  const pairs = process.argv.slice(2).map((arg) => {
    const [code, externalId] = arg.split(":");
    return { code, externalId };
  });
  if (pairs.length === 0) {
    console.error("No lines given. Usage: node scrape-kml.mjs code:externalId ...");
    process.exit(1);
  }
  await fs.mkdir(RAW_DIR, { recursive: true });
  const summary = [];
  for (const { code, externalId } of pairs) {
    const r = await scrapeLine(code, externalId);
    summary.push(r);
    console.log(
      `line ${r.code} (id ${r.externalId}): ${r.variations} variations, ${r.totalPoints} points`,
    );
  }
  console.log("\nSUMMARY " + JSON.stringify(summary));
}

await main();
