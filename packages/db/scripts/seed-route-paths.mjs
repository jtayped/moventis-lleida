// Seed aggregated route geometry into the Route.path column.
//
// Reads packages/db/data/route-paths/{code}.json (from aggregate-route-paths.mjs)
// and writes each line's { paths } onto the matching Route, keyed by externalId
// (code is not unique in the schema; externalId is).
//
// Run from repo root: node packages/db/scripts/seed-route-paths.mjs

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const DATA_DIR = path.resolve(__dirname, "../data/route-paths");

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const routes = await prisma.route.findMany({
  select: { externalId: true, code: true },
});

let updated = 0;
for (const { externalId, code } of routes) {
  const file = path.join(DATA_DIR, `${code}.json`);
  let payload = null;
  try {
    const json = JSON.parse(await fs.readFile(file, "utf8"));
    payload = json.paths?.length ? { paths: json.paths } : null;
  } catch {
    payload = null; // no aggregated data for this line
  }

  await prisma.route.update({
    where: { externalId },
    data: { path: payload },
  });
  const n = payload ? payload.paths.length : 0;
  console.log(`route ${code} (id ${externalId}): ${n} paths`);
  updated++;
}

console.log(`\nUpdated ${updated} routes.`);
await prisma.$disconnect();
