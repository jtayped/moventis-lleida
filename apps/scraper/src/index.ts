import cron from "node-cron";
import { syncAll } from "./jobs/sync-all.js";

// Run immediately on container start
await syncAll().catch(console.error);

// Re-sync daily at 03:00 — covers new stops, operating day changes, route changes
cron.schedule("0 3 * * *", () => {
  syncAll().catch(console.error);
});

console.log("Scraper started — daily sync scheduled at 03:00.");
