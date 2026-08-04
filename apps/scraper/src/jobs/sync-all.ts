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
import { shouldPrune } from "../lib/prune.js";

// Stop DB id cache to avoid re-querying stops seen in multiple trayectos.
// Its key set doubles as the record of what this run actually saw, which is what
// pruning is measured against — so it must be cleared at the start of every run.
const stopIdCache = new Map<string, string>();

async function upsertStop(
  idParada: number,
  descParada: string,
  lat: number,
  lng: number,
): Promise<string> {
  const key = String(idParada);
  if (stopIdCache.has(key)) return stopIdCache.get(key)!;

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

  stopIdCache.set(key, stop.id);
  return stop.id;
}

async function syncVariant(
  routeId: string,
  lineId: string,
  trayecto: MoventisTrayecto,
): Promise<void> {
  const primaryId = primaryTrayectoId(trayecto);
  if (primaryId == null) return;

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

  // Rebuild the ordered stop list for this variant
  await db.routeVariantStop.deleteMany({ where: { variantId: variant.id } });

  const stopIds: string[] = [];
  for (const det of trayecto.TrayectosDet) {
    const p = det.Parada;
    if (!p?.ID_PARADA) continue;
    const stopId = await upsertStop(
      p.ID_PARADA,
      p.DESC_PARADA,
      p.LATITUD,
      p.LONGITUD,
    );
    stopIds.push(stopId);
  }

  // Batch-create RouteVariantStop records
  if (trayecto.TrayectosDet.length > 0) {
    const variantStopData: {
      variantId: string;
      stopId: string;
      sequence: number;
    }[] = [];
    let seqIdx = 0;
    for (const det of trayecto.TrayectosDet) {
      if (!det.Parada?.ID_PARADA) continue;
      const stopId = stopIds[seqIdx++];
      if (!stopId) continue;
      variantStopData.push({
        variantId: variant.id,
        stopId,
        sequence: det.SECUENCIA,
      });
    }

    // skipDuplicates handles the rare case of a circular route where the
    // terminal stop appears at both ends with the same SECUENCIA value.
    await db.routeVariantStop.createMany({
      data: variantStopData,
      skipDuplicates: true,
    });
  }

  // Connect all stops from this variant to the route (many-to-many)
  if (stopIds.length > 0) {
    await db.route.update({
      where: { id: routeId },
      data: { stops: { connect: stopIds.map((id) => ({ id })) } },
    });
  }
}

async function syncLine(line: ResolvedLine): Promise<void> {
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
  if (line.calendarProbed || line.operatingDates.length > 0) {
    await db.operatingDay.deleteMany({ where: { routeId: route.id } });
    if (line.operatingDates.length > 0) {
      await db.operatingDay.createMany({
        data: line.operatingDates.map((d) => ({
          routeId: route.id,
          date: parseDateStr(d),
        })),
      });
    }
  }

  for (const trayecto of line.trayectos) {
    await syncVariant(route.id, line.externalId, trayecto);
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
  await db.route.update({
    where: { id: route.id },
    data: {
      path:
        aggregatedPaths.length > 0
          ? { paths: aggregatedPaths }
          : Prisma.JsonNull,
    },
  });
}

/**
 * Soft-delete what this run did not see, then hard-delete what has been gone
 * long enough. Only ever called on a run that {@link shouldPrune} approved.
 */
async function prune(activeLineIds: string[]): Promise<void> {
  const seenStopExternalIds = [...stopIdCache.keys()];

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

export async function syncAll(): Promise<void> {
  console.log("[sync-all] Starting…");
  stopIdCache.clear();

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
      await syncLine(line);
    } catch (err) {
      failedLines++;
      console.error(`[sync-all] Error on line ${line.code}:`, err);
    }
  }

  const knownStopCount = await db.stop.count({ where: { deletedAt: null } });
  const decision = shouldPrune({
    discoveredLines: discovery.lines.length,
    incompleteLines: failedLines + discovery.unreachable.length,
    seenStopCount: stopIdCache.size,
    knownStopCount,
  });

  if (decision.safe) {
    await prune(discovery.lines.map((l) => l.externalId));
  } else {
    console.warn(
      `[sync-all] Skipping prune — ${decision.reason}. Stale routes and stops ` +
        "stay visible until a complete run; nothing was deleted.",
    );
  }

  console.log(
    `[sync-all] Done. ${stopIdCache.size} stop(s) seen across ` +
      `${discovery.lines.length - failedLines} line(s).`,
  );
}
