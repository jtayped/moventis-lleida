import { db } from "@moventis/db";
import { Prisma } from "@prisma/client";
import {
  fetchLleidaLines,
  fetchTrayectos,
  fetchKml,
  parseDateStr,
  representativeDates,
  primaryTrayectoId,
  type MoventisLine,
  type MoventisTrayecto,
} from "../lib/api.js";
import { parseKmlPath } from "../lib/kml.js";
import { normalizeName, normalizeLineCode } from "../lib/normalize.js";

// Interurban and tourist lines excluded from this Lleida urban app
const EXCLUDED_CODES = new Set(["bt", "120", "121", "122", "401"]);

// Stop DB id cache to avoid re-querying stops seen in multiple trayectos
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
    const variantStopData: { variantId: string; stopId: string; sequence: number }[] = [];
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

async function syncLine(
  lineEntry: MoventisLine,
  operatingDates: string[],
): Promise<void> {
  const code = normalizeLineCode(lineEntry.COD_LINEA);
  const name = normalizeName(lineEntry.DESC_LINEA);
  const lineId = lineEntry.ID_LINEA;

  console.log(`  [${code}] ${name}`);

  // Upsert Route
  const route = await db.route.upsert({
    where: { externalId: lineId },
    update: { name, code, color: lineEntry.COLOR, deletedAt: null },
    create: { externalId: lineId, name, code, color: lineEntry.COLOR },
    select: { id: true },
  });

  // Replace operating days
  await db.operatingDay.deleteMany({ where: { routeId: route.id } });
  if (operatingDates.length > 0) {
    await db.operatingDay.createMany({
      data: operatingDates.map((d) => ({
        routeId: route.id,
        date: parseDateStr(d),
      })),
    });
  }

  // Fetch trayectos for each representative date (weekday / Sat / Sun)
  const repDates = representativeDates(operatingDates);
  const trayectoArrays = await Promise.allSettled(
    repDates.map((d) => fetchTrayectos(lineId, d)),
  );

  // Deduplicate trayectos by their primary ID across all representative dates
  const uniqueTrayectos = new Map<number, MoventisTrayecto>();
  for (const result of trayectoArrays) {
    if (result.status !== "fulfilled") continue;
    for (const t of result.value) {
      const pid = primaryTrayectoId(t);
      if (pid != null && !uniqueTrayectos.has(pid)) {
        uniqueTrayectos.set(pid, t);
      }
    }
  }

  // Sync each unique trayecto
  for (const trayecto of uniqueTrayectos.values()) {
    await syncVariant(route.id, lineId, trayecto);
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
    data: { path: aggregatedPaths.length > 0 ? { paths: aggregatedPaths } : Prisma.JsonNull },
  });
}

export async function syncAll(): Promise<void> {
  console.log("[sync-all] Starting…");
  stopIdCache.clear();

  // Group all Lleida line entries by ID_LINEA, collecting operating dates
  const linesData = await fetchLleidaLines();
  const lineMap = new Map<string, { entry: MoventisLine; dates: string[] }>();
  for (const entry of linesData) {
    if (EXCLUDED_CODES.has(normalizeLineCode(entry.COD_LINEA))) continue;
    const existing = lineMap.get(entry.ID_LINEA);
    if (!existing) {
      lineMap.set(entry.ID_LINEA, { entry, dates: [entry.DIAS_QUE_CIRCULA] });
    } else {
      existing.dates.push(entry.DIAS_QUE_CIRCULA);
    }
  }

  console.log(`[sync-all] Found ${lineMap.size} Lleida lines`);

  for (const { entry, dates } of lineMap.values()) {
    try {
      await syncLine(entry, dates);
    } catch (err) {
      console.error(`[sync-all] Error on line ${entry.COD_LINEA}:`, err);
    }
  }

  // Soft-delete routes that no longer appear in the Lleida lines
  const activeExternalIds = [...lineMap.keys()];
  await db.route.updateMany({
    where: { externalId: { notIn: activeExternalIds }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  // Soft-delete stops that weren't seen in any active route variant this run
  const seenStopExternalIds = [...stopIdCache.keys()];
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
    console.log(`[sync-all] Permanently removed ${purgedCount} stop(s) deleted >28 days ago.`);
  }

  // Hard-delete excluded routes that may still be in the DB, then orphaned stops.
  // Routes cascade-delete their variants and operating days; the many-to-many join
  // entries are also removed, leaving stops with no routes behind for the next step.
  await db.route.deleteMany({ where: { code: { in: [...EXCLUDED_CODES] } } });
  await db.stop.deleteMany({ where: { routes: { none: {} } } });

  console.log("[sync-all] Done.");
}
