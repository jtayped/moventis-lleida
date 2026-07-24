import { writeFileSync } from "fs";
import cron from "node-cron";
import { syncAll } from "./jobs/sync-all.js";

// Heartbeat file for the Docker HEALTHCHECK — proves the event loop is alive,
// independent of the (infrequent) sync schedule.
const HEARTBEAT_PATH = "/tmp/heartbeat";
const touchHeartbeat = () => writeFileSync(HEARTBEAT_PATH, String(Date.now()));
touchHeartbeat();
setInterval(touchHeartbeat, 30_000);

// Run immediately on container start
await syncAll().catch(console.error);

// Re-sync daily at 03:00 — covers new stops, operating day changes, route changes
cron.schedule("0 3 * * *", () => {
  syncAll().catch(console.error);
});

console.log("Scraper started — daily sync scheduled at 03:00.");
