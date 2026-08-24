/**
 * Lists which route variants are physical loops (first stop === last stop) vs.
 * linear out-and-back variants. DB-only, no Moventis calls.
 *
 * `locateLineBuses`'s two-probe calibration anchors on the terminal (last stop)
 * and a midpoint; for a loop variant the terminal is the *same physical stop*
 * as the origin, so its real-time ETA reflects "time to complete this lap" —
 * a bus that has already passed the midpoint this lap won't reach the midpoint
 * again until its *next* lap, inverting the anchor/calib ETA ordering
 * `calibrateSpeed` assumes and making calibration fail every time (see
 * `validate-bus-positions.ts` run notes). This script exists to see how much
 * of the network is affected — it turned out to be most of it (lines 1, 2, 3,
 * several line 6/8/9 variants, 16, 20).
 *
 * Usage (from packages/api): pnpm list-loop-variants
 */
import { db } from "@moventis/db";

async function main() {
  const routes = await db.route.findMany({
    where: { deletedAt: null },
    select: {
      code: true,
      variants: {
        select: {
          direction: true,
          stops: {
            orderBy: { sequence: "asc" },
            select: { stop: { select: { externalId: true, name: true } } },
          },
        },
      },
    },
  });
  for (const r of routes) {
    for (const v of r.variants) {
      const first = v.stops[0]!.stop;
      const last = v.stops[v.stops.length - 1]!.stop;
      const loop = first.externalId === last.externalId;
      console.log(
        `line ${r.code} ${v.direction}: ${v.stops.length} stops, loop=${loop} (${first.name} / ${last.name})`,
      );
    }
  }
  await db.$disconnect();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
