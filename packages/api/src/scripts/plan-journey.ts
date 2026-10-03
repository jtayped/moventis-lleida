/**
 * Plan a journey exactly as `directions.plan` does, and print it — for
 * checking the planner against the Moventis "tabla horaria" and live boards
 * by hand, and for seeing what a change to the network builder does to real
 * days. Leaving within the hour it asks Moventis for the boards of the stops
 * it uses, like the API (`--timetable` skips that); later than that it reads
 * only the stored timetable.
 *
 * Usage (from packages/api):
 *   pnpm plan-journey <from> <to> [HH:MM] [YYYY-MM-DD] [--timetable]
 *
 * `from` / `to` are a stop's externalId or `lat,lng`. Time and date default to
 * now in Lleida.
 *
 * Examples:
 *   pnpm plan-journey 10244 13056 06:40 2026-10-05   # line 5, end to end
 *   pnpm plan-journey 41.6176,0.62 10219 08:00
 */
import { db } from "@moventis/db";
import type { DirectionsPoint, Itinerary } from "@moventis/shared";
import { getNetwork } from "../lib/directions/load";
import { planLive } from "../lib/directions/live-plan";
import { planJourneys } from "../lib/directions/plan";
import { toItinerary, walkOnlyLeg } from "../lib/directions/itinerary";
import {
  fromWallClock,
  lleidaServiceDate,
  serviceSecondOf,
  toWallClock,
} from "../lib/zoned-time";

const clock = (d: Date) => {
  const w = toWallClock(d);
  return `${String(w.hour).padStart(2, "0")}:${String(w.minute).padStart(2, "0")}`;
};

async function resolvePoint(
  arg: string,
): Promise<DirectionsPoint & { label: string }> {
  const coords = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(arg);
  if (coords)
    return { lat: Number(coords[1]), lng: Number(coords[2]), label: arg };
  const stop = await db.stop.findUnique({
    where: { externalId: arg },
    select: { name: true, latitude: true, longitude: true },
  });
  if (!stop) throw new Error(`no stop with externalId ${arg}`);
  return {
    lat: stop.latitude,
    lng: stop.longitude,
    label: `${stop.name} (${arg})`,
  };
}

function print(it: Itinerary, n: number) {
  const mins = Math.round(it.durationS / 60);
  console.log(
    `\n#${n}  ${clock(it.departAt)} → ${clock(it.arriveAt)}  ${mins} min, ` +
      `${it.transfers} change(s), ${it.walkMeters} m on foot  [${it.id}]`,
  );
  for (const leg of it.legs) {
    if (leg.kind === "walk") {
      const to = leg.toStop ? leg.toStop.name : "destination";
      console.log(
        `    ${clock(leg.startAt)}  walk ${leg.meters} m to ${to} (${clock(leg.endAt)})`,
      );
    } else {
      console.log(
        `    ${clock(leg.departAt)}${leg.live ? "*" : " "} line ${leg.lineCode} towards "${leg.headsign}" ` +
          `from ${leg.from.name} (${leg.from.externalId}), ${leg.stops.length - 1} stop(s), ` +
          `off at ${leg.to.name} (${leg.to.externalId}) ${clock(leg.arriveAt)}` +
          `  [path ${leg.path.length} pts]`,
      );
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const timetableOnly = args.includes("--timetable");
  const [fromArg, toArg, time, date] = args.filter((a) => !a.startsWith("--"));
  if (!fromArg || !toArg) {
    console.error(
      "usage: pnpm plan-journey <from> <to> [HH:MM] [YYYY-MM-DD] [--timetable]",
    );
    process.exit(1);
  }
  const [from, to] = await Promise.all([
    resolvePoint(fromArg),
    resolvePoint(toArg),
  ]);
  const now = new Date();
  const serviceDate = date ?? lleidaServiceDate(now);
  let leave = now;
  if (time) {
    const [h, m] = time.split(":").map(Number);
    const [y, mo, d] = serviceDate.split("-").map(Number);
    leave = fromWallClock(y!, mo!, d!, h!, m!);
  }

  const started = performance.now();
  const network = await getNetwork(db, serviceDate);
  const built = performance.now();
  const departAt = serviceSecondOf(serviceDate, leave);
  const input = { from, to, departAt };
  const { journeys, walkOnlyMeters } = timetableOnly
    ? planJourneys(network, input)
    : await planLive(network, {
        ...input,
        serviceDate,
        now: serviceSecondOf(serviceDate, now),
      });
  const planned = performance.now();

  console.log(
    `from ${from.label}\n  to ${to.label}\n  leaving ${clock(leave)} on ${serviceDate}`,
  );
  console.log(
    `network: ${network.patterns.length} patterns, ${network.tripCount} trips` +
      (network.missingLines.length
        ? `, no timetable for ${network.missingLines.join(", ")}`
        : "") +
      ` (built ${Math.round(built - started)} ms, planned ${(planned - built).toFixed(1)} ms)`,
  );
  const ctx = { serviceDate, from, to };
  if (walkOnlyMeters !== null) {
    const w = walkOnlyLeg(walkOnlyMeters, departAt, ctx);
    console.log(
      `\nwalk the whole way: ${w.meters} m, ${clock(w.startAt)} → ${clock(w.endAt)}`,
    );
  }
  if (journeys.length === 0)
    console.log("\nno bus journey in the next 3 hours");
  else console.log("\n(* = timed from Moventis's live listing)");
  journeys.forEach((j, i) => print(toItinerary(network, j, ctx), i + 1));
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
