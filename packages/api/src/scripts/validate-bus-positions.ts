/**
 * Empirical ground-truth check for live bus placement, run against the LIVE
 * Moventis API (never mocked, never faked). `locateLineBuses()` infers a bus's
 * position by back-projecting a single per-variant calibrated speed from the
 * terminal's ETA — this script instead derives each segment's real travel time
 * directly: it probes every stop of a variant in travel order and matches the
 * same physical bus's ETA at consecutive stops (the ETAs strictly increase as
 * a bus that hasn't arrived yet moves further from a later stop). The delta is
 * ground truth for how long that specific segment actually takes — no speed
 * model involved. Segments whose matched travel time exceeds `--threshold`
 * (default 180s — adjacent Lleida stops shouldn't take longer) are flagged.
 *
 * The production `locateLineBuses()` output is printed afterwards so its
 * placements can be eyeballed against the ground-truth segment times above.
 *
 * Usage (from packages/api):
 *   pnpm validate-bus-positions <lineCode> [I|V] [--threshold=180] [--stops=N]
 *
 * Examples:
 *   pnpm validate-bus-positions 7
 *   pnpm validate-bus-positions 7 V --threshold=150
 *   pnpm validate-bus-positions 1 --stops=8   # cheaper, first N stops only
 */
import { db } from "@moventis/db";
import { cumulativeArcLengths, distanceMeters, type LngLat } from "@moventis/shared";
import { getStopSchedule, normalizeText } from "../lib/stop-schedule";
import { toGeometry, toProbeResult } from "../lib/probe";
import {
  locateLineBuses,
  matchVariant,
  type LocatorVariant,
  type ProbeResult,
} from "../lib/bus-locator";

function parseArgs() {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const flags = new Map(
    args
      .filter((a) => a.startsWith("--"))
      .map((a) => {
        const [k, v] = a.slice(2).split("=");
        return [k, v ?? "true"] as const;
      }),
  );
  const lineCode = positional[0];
  const direction = positional[1] as "I" | "V" | undefined;
  const threshold = Number(flags.get("threshold") ?? 180);
  const stopLimit = flags.get("stops") ? Number(flags.get("stops")) : undefined;
  if (!lineCode) {
    console.error(
      "Usage: pnpm validate-bus-positions <lineCode> [I|V] [--threshold=180] [--stops=N]",
    );
    process.exit(1);
  }
  return { lineCode, direction, threshold, stopLimit };
}

function fmtMin(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  const s = Math.abs(Math.round(seconds));
  return `${sign}${Math.floor(s / 60)}m${(s % 60).toString().padStart(2, "0")}s`;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Pull this variant's own real-time ETAs (ascending) out of a raw stop probe. */
function etasFor(probe: ProbeResult, variant: LocatorVariant): number[] {
  for (const [name, etas] of probe) {
    if (etas.length && matchVariant(name, [variant])) return [...etas].sort((a, b) => a - b);
  }
  return [];
}

async function main() {
  const { lineCode, direction, threshold, stopLimit } = parseArgs();

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

  const built = route.variants.map((v) => {
    const locatorVariant: LocatorVariant = {
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
    return {
      locatorVariant,
      names: v.stops.map((s) => s.stop.name),
      rawDescription: v.description,
    };
  });

  const targets = direction ? built.filter((b) => b.locatorVariant.direction === direction) : built;
  if (targets.length === 0) {
    console.error(`No variant found for line "${lineCode}" direction "${direction ?? "any"}"`);
    process.exit(1);
  }

  for (const { locatorVariant: variant, names, rawDescription } of targets) {
    console.log(`\n${"=".repeat(72)}`);
    console.log(`Line ${route.code} — variant ${variant.direction} (${rawDescription})`);
    console.log(
      `${variant.stops.length} stops${stopLimit ? `, probing first ${stopLimit}` : ""} — threshold ${threshold}s`,
    );
    console.log("=".repeat(72));

    const stopsToProbe = stopLimit ? variant.stops.slice(0, stopLimit) : variant.stops;
    const path: LngLat[] = variant.geometry ?? variant.stops.map((s) => [s.lng, s.lat]);
    void cumulativeArcLengths(path); // sanity: geometry parses; not otherwise used below

    // Ground truth: probe every stop in travel order, sequentially. Each call
    // goes through the shared 5 req/s Moventis throttle, so this is already
    // rate-limited without extra bookkeeping here.
    const perStop: { name: string | undefined; etas: number[] }[] = [];
    for (let i = 0; i < stopsToProbe.length; i++) {
      const stop = stopsToProbe[i]!;
      const schedule = await getStopSchedule(stop.externalId, route.externalId);
      const probe: ProbeResult = schedule
        ? toProbeResult(schedule, route.externalId, Date.now())
        : new Map<string, number[]>();
      const etas = etasFor(probe, variant);
      perStop.push({ name: names[i], etas });
      const label = etas.length ? etas.map(fmtMin).join(", ") : "(none)";
      console.log(
        `  [${i}] ${stop.externalId.padEnd(7)} ${(names[i] ?? "").padEnd(32)} → ${label}`,
      );
    }

    console.log("\n  --- Adjacent-stop segment check (ground truth, matched by ETA rank) ---");
    let suspectCount = 0;
    let checkedCount = 0;
    for (let k = 0; k < perStop.length - 1; k++) {
      const a = perStop[k]!;
      const b = perStop[k + 1]!;
      if (!a.etas.length || !b.etas.length) continue;

      const straightLineM = distanceMeters(
        [variant.stops[k]!.lng, variant.stops[k]!.lat],
        [variant.stops[k + 1]!.lng, variant.stops[k + 1]!.lat],
      );

      // Pair by ascending rank: the same bus should be the same rank at both
      // stops unless it entered/left the API's ~5-bus window between probes.
      const pairs = Math.min(a.etas.length, b.etas.length);
      const diffs: number[] = [];
      for (let r = 0; r < pairs; r++) {
        const d = b.etas[r]! - a.etas[r]!;
        if (d > 0) diffs.push(d); // negative/zero diffs mean a rank-shift, not a real segment
      }
      if (diffs.length === 0) continue;

      checkedCount++;
      const segTime = median(diffs);
      const speedKmh = straightLineM > 0 ? (straightLineM / segTime) * 3.6 : 0;
      const suspect = segTime > threshold;
      if (suspect) suspectCount++;

      const flag = suspect ? "⚠ SUSPECT" : "ok";
      console.log(
        `  [${k}→${k + 1}] ${(a.name ?? "").slice(0, 22).padEnd(22)} → ${(b.name ?? "").slice(0, 22).padEnd(22)} ` +
          `dist≈${Math.round(straightLineM)}m  segTime=${fmtMin(segTime)} (n=${diffs.length}/${pairs})  ` +
          `speed≈${speedKmh.toFixed(1)}km/h  ${flag}`,
      );
    }
    console.log(`\n  ${suspectCount}/${checkedCount} segments exceeded ${threshold}s.`);
  }

  // Production comparison: what does the actual algorithm place, right now?
  console.log(`\n${"=".repeat(72)}`);
  console.log(`locateLineBuses() production output for line ${route.code}`);
  console.log("=".repeat(72));
  const cache = new Map<string, Promise<ProbeResult>>();
  const probeFn = (stopExternalId: string): Promise<ProbeResult> => {
    let pending = cache.get(stopExternalId);
    if (!pending) {
      pending = getStopSchedule(stopExternalId, route.externalId).then((schedule) =>
        schedule ? toProbeResult(schedule, route.externalId, Date.now()) : (new Map() as ProbeResult),
      );
      cache.set(stopExternalId, pending);
    }
    return pending;
  };
  const nameById = new Map<string, string>();
  for (const { locatorVariant, names } of built) {
    locatorVariant.stops.forEach((s, i) => nameById.set(s.id, names[i] ?? s.externalId));
  }

  const positions = await locateLineBuses({
    lineCode: route.code,
    variants: built.map((b) => b.locatorVariant),
    probe: probeFn,
  });

  if (positions.length === 0) {
    console.log("  (no live buses located)");
  }
  for (const p of positions) {
    const from = nameById.get(p.segment.fromStopId) ?? p.segment.fromStopId;
    const to = nameById.get(p.segment.toStopId) ?? p.segment.toStopId;
    console.log(
      `  ${p.direction} "${p.journeyName}"  eta=${fmtMin(p.etaSeconds)}  ` +
        `segment=${from} → ${to} (frac=${p.fraction.toFixed(2)})  confidence=${p.confidence}`,
    );
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
