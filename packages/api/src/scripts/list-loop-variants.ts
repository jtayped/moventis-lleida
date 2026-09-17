/**
 * Lists which route variants are physical loops (first stop === last stop) vs.
 * linear out-and-back variants. DB-only, no Moventis calls.
 *
 * Loops matter to `locateLineBuses`: a loop's terminal is its origin, so the
 * list there is the next few *departures* (timetable projections, one per
 * future trip of each vehicle) rather than arrivals, and a bus in the closing
 * segment or in layover is not visible until it departs. Most of the Lleida
 * network is loops (lines 1, 2, 3, 16, 20 and several line 6/8/9 variants).
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
