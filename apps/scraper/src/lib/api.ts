import { parseParadasResponse, type StoredTimetable } from "@moventis/shared";
import { z } from "zod";
import {
  incidenciaSchema,
  lineFeedRowSchema,
  trayectosResponseSchema,
  type MoventisIncidencia,
  type MoventisLine,
  type MoventisTrayecto,
} from "./schemas.js";

export type {
  MoventisIncidencia,
  MoventisLine,
  MoventisStopInfo,
  MoventisTrayecto,
  MoventisVariantStop,
} from "./schemas.js";

const BASE = "https://www.moventis.es";

/**
 * Cap on every outbound request.
 *
 * Without one, a hung socket never settles: it parks a `mapWithConcurrency`
 * worker forever, and the `Promise.all` that waits on those workers parks the
 * whole nightly sync with it. A timeout rejects like any other request failure,
 * which the probe/resolution layer already understands as "unreachable" — doubt,
 * not a withdrawal, so nothing is pruned on the strength of it.
 */
const REQUEST_TIMEOUT_MS = 15_000;

const timeout = () => AbortSignal.timeout(REQUEST_TIMEOUT_MS);

export const LLEIDA_ZONE = "2";

/** Reads only the two keys the Lleida filter needs, and trusts nothing else. */
function isLleidaRow(row: unknown, knownLineIds: ReadonlySet<string>): boolean {
  if (typeof row !== "object" || row === null) return false;
  const { ID_ZONA, ID_LINEA } = row as Record<string, unknown>;
  return (
    ID_ZONA === LLEIDA_ZONE ||
    (typeof ID_LINEA === "string" && knownLineIds.has(ID_LINEA))
  );
}

/**
 * Fetches the line feed and keeps the Lleida rows.
 *
 * A row qualifies either by sitting in the Lleida zone, or by being a line we
 * already track. The second test exists because the zone is not a stable key:
 * `ID_ZONA === "2"` matched every Lleida line until 2026-08-02, when the zone
 * vanished from the feed. Matching known `ID_LINEA`s as well means a
 * renumbering upstream is picked up automatically, and only a line genuinely
 * absent from the feed falls through to the database fallback.
 *
 * Only the kept rows are validated. The rest of the feed, about 11,000 rows,
 * belongs to other zones, and a malformed row there must not cost Lleida its
 * sync. A malformed Lleida row rejects the whole feed rather than being
 * dropped: dropping every row of one line would leave it out of discovery, and
 * a complete run soft-deletes a line it did not see. A rejected feed sends
 * discovery to the database fallback instead, which probes every stored line.
 */
export async function fetchLleidaLines(
  knownLineIds: ReadonlySet<string> = new Set(),
): Promise<MoventisLine[]> {
  const res = await fetch(`${BASE}/es/moventis/es/lines`, {
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`/lines ${res.status}`);
  const rows = z.array(z.unknown()).parse(await res.json());
  return z
    .array(lineFeedRowSchema)
    .parse(rows.filter((row) => isLleidaRow(row, knownLineIds)));
}

/**
 * The variants a line runs on `date` (`YYYYMMDD`), or `[]` when it does not run
 * that day. Throws on a malformed response; {@link trayectosResponseSchema}
 * says why that is safer than dropping the odd row.
 */
export async function fetchTrayectos(
  lineId: string,
  date: string,
): Promise<MoventisTrayecto[]> {
  const res = await fetch(`${BASE}/api/json/GetTrayectos/${lineId}/${date}`, {
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`GetTrayectos/${lineId} ${res.status}`);
  return trayectosResponseSchema.parse(await res.json());
}

/**
 * Every current service alert across the Moventis network, in `lang`.
 *
 * Node ids are per language: `NID_LINEA` and `NID_MARCA` only match the line
 * feed's `nid` and `MARCA` when both were fetched in the same language.
 *
 * A malformed row is dropped and logged, and the rest are returned. Nothing
 * destructive hangs off this feed, so one odd alert is not worth losing the
 * others over.
 */
export async function fetchIncidencias(
  lang: "es" | "ca" = "es",
): Promise<MoventisIncidencia[]> {
  const res = await fetch(`${BASE}/${lang}/moventis/${lang}/incidencias`, {
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`/incidencias ${res.status}`);
  const rows = z.array(z.unknown()).parse(await res.json());

  const alerts: MoventisIncidencia[] = [];
  const rejected: z.ZodError[] = [];
  for (const row of rows) {
    const parsed = incidenciaSchema.safeParse(row);
    if (parsed.success) alerts.push(parsed.data);
    else rejected.push(parsed.error);
  }
  if (rejected.length > 0) {
    console.warn(
      `[api] Dropped ${rejected.length} malformed incidencia row(s); first:`,
      JSON.stringify(rejected[0]?.issues),
    );
  }
  return alerts;
}

export async function fetchKml(
  lineId: string,
  trayectoId: number,
): Promise<string> {
  const res = await fetch(`${BASE}/api/json/GetKMLs/${lineId}/${trayectoId}`, {
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`GetKMLs/${lineId}/${trayectoId} ${res.status}`);
  return res.text();
}

/**
 * One trayecto's timetable for one service day, parsed into the stored shape.
 * `trayectoId` is a segment id (`ID_TRAYECTO` element), not the variant's
 * primary id. A day without service resolves to empty `stops`/`trips`; a shape
 * the parser does not know rejects, like a network failure, so it is never
 * written down as "no service".
 */
export async function fetchParadas(
  lineId: string,
  trayectoId: number,
  date: string,
): Promise<StoredTimetable> {
  const res = await fetch(
    `${BASE}/api/json/GetParadas/${lineId}/${trayectoId}/${date}/0`,
    { signal: timeout() },
  );
  if (!res.ok)
    throw new Error(`GetParadas/${lineId}/${trayectoId}/${date} ${res.status}`);
  return parseParadasResponse(await res.json());
}

export function toYyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function parseDateStr(s: string): Date {
  return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
}

/**
 * `count` `YYYYMMDD` dates starting at `from` (inclusive), `stepDays` apart.
 *
 * Used to probe which days a line runs when the feed carries no calendar. A step
 * of 1 walks consecutive days (an exact calendar); a larger step samples further
 * ahead cheaply, which is how a line dormant for the whole near horizon is told
 * apart from one that has been withdrawn.
 */
export function nextDates(from: Date, count: number, stepDays = 1): string[] {
  const start = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  return Array.from({ length: count }, (_, i) =>
    toYyyymmdd(new Date(start + i * stepDays * dayMs)),
  );
}

/**
 * Returns one representative date per day-of-week group (weekday/Sat/Sun)
 * from the given list of YYYYMMDD strings.
 *
 * The weekday is read in UTC: `parseDateStr` builds a UTC-midnight date, so
 * `getDay()` would answer in the host's zone and slide a Monday back to Sunday
 * anywhere west of Greenwich — correct in the UTC container, wrong on a laptop.
 */
export function representativeDates(operatingDates: string[]): string[] {
  const byDow = new Map<number, string>();
  for (const d of operatingDates) {
    const dow = parseDateStr(d).getUTCDay();
    if (!byDow.has(dow)) byDow.set(dow, d);
  }
  // Group Mon–Fri together; keep Sat and Sun separate
  const weekday =
    byDow.get(1) ??
    byDow.get(2) ??
    byDow.get(3) ??
    byDow.get(4) ??
    byDow.get(5);
  const saturday = byDow.get(6);
  const sunday = byDow.get(0);
  return [weekday, saturday, sunday].filter((d): d is string => d != null);
}

/**
 * Returns the canonical primary ID for a trayecto:
 * ID_TRAYECTO_CONCAT when set, otherwise the last element of ID_TRAYECTO.
 */
export function primaryTrayectoId(t: MoventisTrayecto): number | null {
  if (t.ID_TRAYECTO_CONCAT != null) return t.ID_TRAYECTO_CONCAT;
  const ids = t.ID_TRAYECTO;
  return ids.length > 0 ? (ids[ids.length - 1] ?? null) : null;
}
