import { db } from "@moventis/db";
import { Prisma } from "@prisma/client";
import {
  fetchKml,
  parseDateStr,
  primaryTrayectoId,
  type MoventisTrayecto,
} from "../lib/api.js";
import {
  discoverLines,
  EXCLUDED_CODES,
  type ResolvedLine,
} from "../lib/discovery.js";
import { parseKmlPath } from "../lib/kml.js";
import { normalizeName } from "../lib/normalize.js";
import { onceAtATime } from "../lib/once-at-a-time.js";
import { shouldPrune } from "../lib/prune.js";

/**
 * Stop `externalId` → DB id for every stop this run upserted.
 *
 * It saves re-querying a stop seen in several trayectos, but its key set is also
 * the record of what the run actually saw, which is what pruning is measured
 * against. That makes it strictly per-run state: it is created inside
 * {@link syncAll} and threaded down by hand, never held at module scope, so an
 * overlapping run cannot truncate another run's view of the network.
 */
type SeenStops = Map<string, string>;

async function upsertStop(
  seen: SeenStops,
  idParada: number,
  descParada: string,
  lat: number,
  lng: number,
): Promise<string> {
  const key = String(idParada);
  const cached = seen.get(key);
  if (cached) return cached;

  const stop = await db.stop.upsert({
    where: { externalId: key },
    update: {
      name: normalizeName(descParada),
      latitude: lat,
      longitude: lng,
      deletedAt: null,
    },
    create: {
      externalId: key,
      name: normalizeName(descParada),
      latitude: lat,
      longitude: lng,
    },
    select: { id: true },
  });

  seen.set(key, stop.id);
  return stop.id;
}

/** What a synced variant contributes to its line's stop set and variant list. */
interface SyncedVariant {
  externalId: number;
  stopIds: string[];
}

/**
 * Syncs one variant. Returns `null` when the trayecto carries no usable primary
 * id — nothing was written, and the line's variant list is therefore incomplete.
 */
async function syncVariant(
  routeId: string,
  lineId: string,
  trayecto: MoventisTrayecto,
  seen: SeenStops,
): Promise<SyncedVariant | null> {
  const primaryId = primaryTrayectoId(trayecto);
  if (primaryId == null) return null;

  // Fetch KML geometry for each segment in parallel
  const kmlResults = await Promise.allSettled(
    trayecto.ID_TRAYECTO.map((id) => fetchKml(lineId, id)),
  );
  const paths = kmlResults
    .filter(
      (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
    )
    .map((r) => parseKmlPath(r.value))
    .filter((p) => p.length > 0);

  const variant = await db.routeVariant.upsert({
    where: { routeId_externalId: { routeId, externalId: primaryId } },
    update: {
      trayectoIds: trayecto.ID_TRAYECTO,
      description: normalizeName(trayecto.DESC_TRAYECTO),
      direction: trayecto.SENTIDO,
      isPrincipal: trayecto.PRINCIPAL === "S",
      ...(paths.length > 0 && { geometry: { paths } }),
    },
    create: {
      routeId,
      externalId: primaryId,
      trayectoIds: trayecto.ID_TRAYECTO,
      description: normalizeName(trayecto.DESC_TRAYECTO),
      direction: trayecto.SENTIDO,
      isPrincipal: trayecto.PRINCIPAL === "S",
      geometry: paths.length > 0 ? { paths } : Prisma.JsonNull,
    },
    select: { id: true },
  });

  // Upsert every stop first, outside the transaction below: these are writes
  // that stand on their own, and keeping them out means the delete + recreate
  // of the ordered list is the only thing that has to be atomic.
  const stopIds: string[] = [];
  const variantStopData: {
    variantId: string;
    stopId: string;
    sequence: number;
  }[] = [];
  for (const det of trayecto.TrayectosDet) {
    const p = det.Parada;
    if (!p?.ID_PARADA) continue;
    const stopId = await upsertStop(
      seen,
      p.ID_PARADA,
      p.DESC_PARADA,
      p.LATITUD,
      p.LONGITUD,
    );
    stopIds.push(stopId);
    variantStopData.push({
      variantId: variant.id,
      stopId,
      sequence: det.SECUENCIA,
    });
  }

  // Rebuild the ordered stop list atomically. Delete and re-create used to be
  // two independent round-trips, so anything throwing in between left the
  // variant with no stops at all until the next successful nightly run.
  //
  // skipDuplicates handles the rare case of a circular route where the terminal
  // stop appears at both ends with the same SECUENCIA value.
  await db.$transaction([
    db.routeVariantStop.deleteMany({ where: { variantId: variant.id } }),
    db.routeVariantStop.createMany({
      data: variantStopData,
      skipDuplicates: true,
    }),
  ]);

  return { externalId: primaryId, stopIds };
}

async function syncLine(line: ResolvedLine, seen: SeenStops): Promise<void> {
  console.log(
    `  [${line.code}] ${line.name} — ${line.trayectos.length} variant(s), ` +
      `${line.operatingDates.length} operating day(s)`,
  );

  // `deletedAt: null` is what un-deletes a route the previous prune bug removed.
  const route = await db.route.upsert({
    where: { externalId: line.externalId },
    update: {
      name: line.name,
      code: line.code,
      color: line.color,
      deletedAt: null,
    },
    create: {
      externalId: line.externalId,
      name: line.name,
      code: line.code,
      color: line.color,
    },
    select: { id: true },
  });

  // Replace operating days — but only when the calendar is a complete answer.
  // An empty list from a clean probe is meaningful (a dormant line must stop
  // claiming it runs today); an empty list from a failed probe is not, and
  // writing it would make the line strip mark every line as not running.
  //
  // The pair is one transaction: a failure between the two left the line with no
  // operating days at all, which the UI reads as "fora d'horari avui".
  if (line.calendarProbed || line.operatingDates.length > 0) {
    await db.$transaction([
      db.operatingDay.deleteMany({ where: { routeId: route.id } }),
      db.operatingDay.createMany({
        data: line.operatingDates.map((d) => ({
          routeId: route.id,
          date: parseDateStr(d),
        })),
      }),
    ]);
  }

  // A line's stop set and variant list may only be *replaced* when this run saw
  // the whole line: every trayecto synced, from probes that all answered. On
  // anything less, a stop or a variant missing from this run's view is missing
  // because a request failed, not because it is gone upstream.
  let complete = line.calendarProbed;
  const variantIds: number[] = [];
  const stopIds = new Set<string>();

  for (const trayecto of line.trayectos) {
    const synced = await syncVariant(route.id, line.externalId, trayecto, seen);
    if (!synced) {
      complete = false;
      continue;
    }
    variantIds.push(synced.externalId);
    for (const id of synced.stopIds) stopIds.add(id);
  }

  if (complete && stopIds.size > 0) {
    // `set` (not `connect`) is what lets a stop dropped from this line upstream
    // stop drawing on it — the relation used to be append-only, so a removed
    // stop stayed on the line forever and kept costing a live Moventis probe.
    await db.route.update({
      where: { id: route.id },
      data: { stops: { set: [...stopIds].map((id) => ({ id })) } },
    });
  } else if (stopIds.size > 0) {
    // Incomplete run: additive only. Never drops a stop on the strength of a
    // failed fetch, but still attaches the ones this run did see, so they are
    // not left orphaned (pruning hard-deletes stops that belong to no route).
    await db.route.update({
      where: { id: route.id },
      data: { stops: { connect: [...stopIds].map((id) => ({ id })) } },
    });
  }

  if (complete && variantIds.length > 0) {
    // Variants that vanished upstream would otherwise keep their stale stop list
    // and geometry, and keep being offered as a tab. The length check is not
    // cosmetic: Prisma reads `notIn: []` as *match every row*.
    // RouteVariantStop rows go with them by cascade.
    await db.routeVariant.deleteMany({
      where: { routeId: route.id, externalId: { notIn: variantIds } },
    });
  }

  // Derive aggregated Route.path from the principal outbound variants
  const principalVariants = await db.routeVariant.findMany({
    where: { routeId: route.id, isPrincipal: true, direction: "I" },
    select: { geometry: true },
  });
  const aggregatedPaths = principalVariants.flatMap((v) => {
    const g = v.geometry as { paths: [number, number][][] } | null;
    return g?.paths ?? [];
  });
  // An empty aggregate means this run learned nothing about the geometry — one
  // night of failed KML fetches, say. Writing it would blank a drawn route, and
  // `routes.getPath` would then cache the blank for a week.
  if (aggregatedPaths.length > 0) {
    await db.route.update({
      where: { id: route.id },
      data: { path: { paths: aggregatedPaths } },
    });
  }
}

/**
 * Soft-delete what this run did not see, then hard-delete what has been gone
 * long enough. Only ever called on a run that {@link shouldPrune} approved, and
 * only ever with that same run's seen-stop set.
 */
async function prune(
  activeLineIds: string[],
  seenStopExternalIds: string[],
): Promise<void> {
  await db.route.updateMany({
    where: { externalId: { notIn: activeLineIds }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  await db.stop.updateMany({
    where: { externalId: { notIn: seenStopExternalIds }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  // Hard-delete stops that have been soft-deleted for more than 28 days
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const { count: purgedCount } = await db.stop.deleteMany({
    where: { deletedAt: { not: null, lt: fourWeeksAgo } },
  });
  if (purgedCount > 0) {
    console.log(
      `[sync-all] Permanently removed ${purgedCount} stop(s) deleted >28 days ago.`,
    );
  }

  // Hard-delete excluded routes that may still be in the DB, then orphaned stops.
  // Routes cascade-delete their variants and operating days; the many-to-many join
  // entries are also removed, leaving stops with no routes behind for the next step.
  await db.route.deleteMany({ where: { code: { in: [...EXCLUDED_CODES] } } });
  await db.stop.deleteMany({ where: { routes: { none: {} } } });
}

async function runSync(): Promise<void> {
  console.log("[sync-all] Starting…");
  const seen: SeenStops = new Map();

  const discovery = await discoverLines();
  console.log(
    `[sync-all] Resolved ${discovery.lines.length} Lleida line(s) from the ` +
      `${discovery.source}` +
      (discovery.withdrawn.length > 0
        ? `; withdrawn: ${discovery.withdrawn.join(", ")}`
        : "") +
      (discovery.unreachable.length > 0
        ? `; unreachable: ${discovery.unreachable.join(", ")}`
        : ""),
  );

  if (discovery.lines.length === 0) {
    console.error(
      "[sync-all] ABORT: no lines could be resolved. Leaving the database " +
        "untouched — pruning on an empty run soft-deletes the entire network.",
    );
    return;
  }

  let failedLines = 0;
  for (const line of discovery.lines) {
    try {
      await syncLine(line, seen);
    } catch (err) {
      failedLines++;
      console.error(`[sync-all] Error on line ${line.code}:`, err);
    }
  }

  const knownStopCount = await db.stop.count({ where: { deletedAt: null } });
  const decision = shouldPrune({
    discoveredLines: discovery.lines.length,
    incompleteLines: failedLines + discovery.unreachable.length,
    seenStopCount: seen.size,
    knownStopCount,
  });

  if (decision.safe) {
    await prune(
      discovery.lines.map((l) => l.externalId),
      [...seen.keys()],
    );
  } else {
    console.warn(
      `[sync-all] Skipping prune — ${decision.reason}. Stale routes and stops ` +
        "stay visible until a complete run; nothing was deleted.",
    );
  }

  console.log(
    `[sync-all] Done. ${seen.size} stop(s) seen across ` +
      `${discovery.lines.length - failedLines} line(s).`,
  );
}

/**
 * One full sync, and never two at once.
 *
 * A run is triggered both on boot and from the 03:00 cron, and a slow boot sync
 * overlapping the cron used to be enough to make the prune gate read a
 * half-built picture of the network.
 */
export const syncAll = onceAtATime(runSync, () => {
  console.warn(
    "[sync-all] A sync is already in progress — skipping this trigger.",
  );
});
