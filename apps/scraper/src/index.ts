import cron from "node-cron";
import { syncRoutes } from "./jobs/sync-routes.js";
import { syncStops } from "./jobs/sync-stops.js";

async function runAll() {
  await syncRoutes();
  await syncStops();
}

// Run immediately on container start so the DB is populated without waiting
await runAll().catch(console.error);

// Sync routes daily at 03:00 — routes change infrequently
cron.schedule("0 3 * * *", () => {
  syncRoutes().catch(console.error);
});

// Sync stops daily at 03:30 — depends on routes being up to date
cron.schedule("30 3 * * *", () => {
  syncStops().catch(console.error);
});

console.log("Scraper started — cron jobs scheduled.");
