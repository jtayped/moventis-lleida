import { syncAll } from "./jobs/sync-all.js";

/**
 * Run one sync and exit.
 *
 * `src/index.ts` already syncs on boot, so restarting the container is an
 * equivalent trigger — this exists for when bouncing the process is the wrong
 * tool: recovering right now instead of at 03:00, or re-running after a fix
 * while keeping the container (and its cron schedule) up.
 *
 *   pnpm --filter=@moventis/scraper sync       # in the deployed container
 *   pnpm --filter=@moventis/scraper sync:dev   # locally, via the root .env
 *
 * Exits non-zero only when the run threw. A run that aborts because nothing
 * could be resolved exits 0 by design: refusing to touch the database is the
 * correct outcome there, not a failure.
 */
try {
  await syncAll();
  process.exit(0);
} catch (err) {
  console.error("[sync-once] Sync failed:", err);
  process.exit(1);
}
