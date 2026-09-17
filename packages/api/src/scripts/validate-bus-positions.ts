/**
 * Live check of the bus locator against the real Moventis API (never mocked).
 *
 * Runs `locateLineBuses()` for a line exactly as the router does, then checks
 * every emitted position against the stop lists the locator was given
 * (`checkConsistency`): the bus must be listed at the downstream stop of its
 * bracket, absent from the upstream one, and reappear further on. With
 * `--full` it also probes *every* stop of each variant and brackets the line
 * at adjacent-stop resolution — the finest ground truth the API allows — and
 * compares: a locator bus with no full-resolution twin inside its bracket is a
 * PHANTOM (fails the run); a full-resolution bus the locator did not emit is a
 * MISS (reported; the locator's coarse pass can merge bunched buses, and a
 * loop's closing segment is blind by design).
 *
 * Cost: the locator's own probes (~7–15 per variant) plus, with `--full`, one
 * request per remaining stop of the variant. Everything goes through the shared
 * 5 req/s throttle, so a two-variant line with `--full` takes ~10–15 s.
 *
 * Usage (from packages/api):
 *   pnpm validate-bus-positions <lineCode> [I|V] [--full]
 *
 * Examples:
 *   pnpm validate-bus-positions 2            # loop line, locator probes only
 *   pnpm validate-bus-positions 5 V --full   # one direction, every stop
 */
import { db } from "@moventis/db";
import { getStopSchedule, normalizeText } from "../lib/stop-schedule";
import { toGeometry, toProbeResult } from "../lib/probe";
import {
  analyseChain,
  checkConsistency,
  locateLineBuses,
  SAME_TRIP_SLACK_S,
  type LocatorVariant,
  type ProbeResult,
  type ProbedStop,
} from "../lib/bus-locator";

function parseArgs() {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const flags = new Set(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2)));
  const lineCode = positional[0];
  const direction = positional[1] as "I" | "V" | undefined;
  if (!lineCode) {
    console.error("Usage: pnpm validate-bus-positions <lineCode> [I|V] [--full]");
    process.exit(1);
  }
  return { lineCode, direction, full: flags.has("full") };
}

function fmt(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  const s = Math.abs(Math.round(seconds));
  return `${sign}${Math.floor(s / 60)}m${(s % 60).toString().padStart(2, "0")}s`;
}

function fmtList(etas: number[] | null): string {
  if (etas === null) return "(unavailable)";
  if (etas.length === 0) return "(no live bus)";
  return etas.map(fmt).join(", ");
}

async function main() {
  const { lineCode, direction, full } = parseArgs();

  const route = await db.route.findFirst({
    where: { code: lineCode, deletedAt: null },
    select: {
      externalId: true,
      code: true,
      variants: {
        select: {
          direction: true,
          description: true,
          geometry: true,
          stops: {
            orderBy: { sequence: "asc" },
            select: {
              stop: {
                select: { id: true, externalId: true, name: true, latitude: true, longitude: true },
              },
            },
          },
        },
      },
    },
  });
  if (!route) {
    console.error(`No route found for code "${lineCode}"`);
    process.exit(1);
  }

  const nameByExternalId = new Map<string, string>();
  const variants: LocatorVariant[] = route.variants.map((v) => {
    for (const s of v.stops) nameByExternalId.set(s.stop.externalId, s.stop.name);
    return {
      direction: v.direction === "V" ? "V" : "I",
      description: normalizeText(v.description),
      geometry: toGeometry(v.geometry),
      stops: v.stops.map((s) => ({
        id: s.stop.id,
        externalId: s.stop.externalId,
        lat: s.stop.latitude,
        lng: s.stop.longitude,
      })),
    };
  });
  const targets = direction ? variants.filter((v) => v.direction === direction) : variants;
  if (targets.length === 0) {
    console.error(`No variant found for line "${lineCode}" direction "${direction ?? "any"}"`);
    process.exit(1);
  }

  // Exactly the router's probe: one reference instant, cached per stop.
  const now = Date.now();
  const cache = new Map<string, Promise<ProbeResult | null>>();
  let requests = 0;
  const probe = (stopExternalId: string): Promise<ProbeResult | null> => {
    let pending = cache.get(stopExternalId);
    if (!pending) {
      requests++;
      pending = getStopSchedule(stopExternalId, route.externalId).then((schedule) =>
        schedule ? toProbeResult(schedule, route.externalId, now) : null,
      );
      cache.set(stopExternalId, pending);
    }
    return pending;
  };

  const started = Date.now();
  const result = await locateLineBuses({ lineCode: route.code, variants: targets, probe });
  const locatorRequests = requests;
  console.log(
    `Line ${route.code}: ${result.positions.length} bus(es) located with ${locatorRequests} request(s) in ${Date.now() - started} ms`,
  );

  let failures = 0;
  let phantoms = 0;
  let misses = 0;

  for (const trace of result.variants) {
    const variant = targets.find(
      (v) => v.direction === trace.direction && v.description === trace.description,
    )!;
    const name = (index: number) => {
      const ext = variant.stops[index]!.externalId;
      return `#${index} ${nameByExternalId.get(ext) ?? ext} (${ext})`;
    };

    console.log(`\n${"=".repeat(72)}`);
    console.log(
      `Variant ${trace.direction} "${trace.description}" — ${trace.stopCount} stops, ${trace.loop ? "loop" : "linear"}, journey ${trace.journeyName ?? "(none matched)"}`,
    );
    console.log("=".repeat(72));
    console.log("  Probed stops:");
    for (const p of trace.probed) console.log(`    ${name(p.index).padEnd(52)} ${fmtList(p.etas)}`);

    console.log("  Brackets:");
    const geom = { stopArcs: trace.stopArcs, total: trace.totalArc, loop: trace.loop };
    for (const b of analyseChain(trace.probed, geom)) {
      const between = b.alignment.between.map(fmt).join(", ") || "-";
      console.log(
        `    ${b.from.index}→${b.to.index}  ${Math.round(b.distanceM)} m  bound ${fmt(b.maxTravel)}  ` +
          `travel ${b.travel === null ? "?" : fmt(b.travel)} (${b.alignment.pairs.length} pair)  buses: ${between}`,
      );
    }

    console.log("  Positions:");
    if (trace.placed.length === 0) console.log("    (none)");
    const verdicts = checkConsistency(trace);
    for (const v of verdicts) {
      const { position: p } = v;
      const placed = trace.placed.find((x) => x.position === p)!;
      const status = v.ok ? "OK  " : "FAIL";
      if (!v.ok) failures++;
      console.log(
        `    ${status} eta ${fmt(p.etaSeconds)} to ${name(placed.toIndex)} — between ${name(placed.fromIndex)} and it ` +
          `(${p.spanStops} segment${p.spanStops === 1 ? "" : "s"}, ${p.confidence})`,
      );
      for (const problem of v.problems) console.log(`         ! ${problem}`);
      for (const note of v.notes) console.log(`         · ${note}`);
    }

    if (!full) continue;

    // Ground truth: every stop, adjacent-stop brackets.
    const probedByIndex = new Map(trace.probed.map((p) => [p.index, p]));
    const all: ProbedStop[] = [];
    for (let index = 0; index < variant.stops.length; index++) {
      const held = probedByIndex.get(index);
      if (held) {
        all.push(held);
        continue;
      }
      const stop = variant.stops[index]!;
      const r = await probe(stop.externalId);
      let etas: number[] | null = null;
      if (r) {
        for (const [journey, list] of r) {
          if (trace.journeyName !== null && journey === trace.journeyName) etas = [...list].sort((a, b) => a - b);
        }
      }
      all.push({ index, stopId: stop.id, externalId: stop.externalId, etas });
    }
    const truth = analyseChain(all, geom).flatMap((b) =>
      b.alignment.between.map((eta) => ({ eta, from: b.from.index, to: b.to.index })),
    );

    console.log(`  Full resolution (${all.length} stops):`);
    for (const p of all) {
      if (!probedByIndex.has(p.index)) console.log(`    ${name(p.index).padEnd(52)} ${fmtList(p.etas)}`);
    }
    console.log("  Ground-truth buses (adjacent-stop brackets):");
    if (truth.length === 0) console.log("    (none)");
    for (const t of truth) console.log(`    eta ${fmt(t.eta)} between ${name(t.from)} and ${name(t.to)}`);

    console.log("  Comparison:");
    const unclaimed = [...truth];
    for (const placed of trace.placed) {
      const idx = unclaimed.findIndex(
        (t) =>
          t.from >= placed.fromIndex &&
          t.to <= placed.toIndex &&
          Math.abs(t.eta - placed.position.etaSeconds) <=
            // The locator's ETA is to its own downstream stop; the truth's to
            // a nearer one, so allow the travel between them plus the slack.
            SAME_TRIP_SLACK_S + Math.max(0, placed.position.etaSeconds - Math.max(0, t.eta)) + 1,
      );
      if (idx === -1) {
        phantoms++;
        console.log(
          `    PHANTOM eta ${fmt(placed.position.etaSeconds)} in ${placed.fromIndex}→${placed.toIndex}: no bus at full resolution inside that bracket`,
        );
      } else {
        const t = unclaimed[idx]!;
        unclaimed.splice(idx, 1);
        console.log(
          `    MATCH   eta ${fmt(placed.position.etaSeconds)} in ${placed.fromIndex}→${placed.toIndex}  ⇐  truth eta ${fmt(t.eta)} in ${t.from}→${t.to}`,
        );
      }
    }
    for (const t of unclaimed) {
      misses++;
      console.log(`    MISS    truth eta ${fmt(t.eta)} in ${t.from}→${t.to}: not emitted by the locator`);
    }
  }

  console.log(`\n${"-".repeat(72)}`);
  console.log(
    `Requests: ${requests} (${locatorRequests} by the locator${full ? `, ${requests - locatorRequests} for --full` : ""})`,
  );
  const pass = failures === 0 && phantoms === 0;
  console.log(
    `${pass ? "PASS" : "FAIL"}: ${failures} inconsistent position(s), ${phantoms} phantom(s)${full ? `, ${misses} miss(es)` : ""}`,
  );

  await db.$disconnect();
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
