const BASE = "https://www.moventis.es";

export const LLEIDA_ZONE = "2";

export interface MoventisLine {
  ID_LINEA: string;
  COD_LINEA: string;
  DESC_LINEA: string;
  ID_ZONA: string;
  COLOR: string;
  TREAL: string;
  DIAS_QUE_CIRCULA: string;
}

export interface MoventisStopInfo {
  DESC_PARADA: string;
  COD_PARADA: number;
  ID_PARADA: number;
  LATITUD: number;
  LONGITUD: number;
}

export interface MoventisVariantStop {
  Parada: MoventisStopInfo;
  ID_TRAYECTO: number;
  SECUENCIA: number;
  SUBE_BAJA: number;
}

export interface MoventisTrayecto {
  ID_LINEA: number;
  ID_TRAYECTO: number[];
  ID_TRAYECTO_CONCAT: number | null;
  DESC_TRAYECTO: string;
  DESC_REDUCIDA: string;
  PRINCIPAL: string;
  SENTIDO: string;
  TrayectosDet: MoventisVariantStop[];
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
 */
export async function fetchLleidaLines(
  knownLineIds: ReadonlySet<string> = new Set(),
): Promise<MoventisLine[]> {
  const res = await fetch(`${BASE}/es/moventis/es/lines`);
  if (!res.ok) throw new Error(`/lines ${res.status}`);
  const all = (await res.json()) as MoventisLine[];
  return all.filter(
    (l) => l.ID_ZONA === LLEIDA_ZONE || knownLineIds.has(l.ID_LINEA),
  );
}

export async function fetchTrayectos(
  lineId: string,
  date: string,
): Promise<MoventisTrayecto[]> {
  const res = await fetch(`${BASE}/api/json/GetTrayectos/${lineId}/${date}`);
  if (!res.ok) throw new Error(`GetTrayectos/${lineId} ${res.status}`);
  const data = (await res.json()) as unknown[];
  // Filter out stub responses like [{ numLinea: "xxx" }] that have no TrayectosDet
  return data
    .filter(
      (t): t is MoventisTrayecto =>
        typeof t === "object" &&
        t !== null &&
        Array.isArray((t as MoventisTrayecto).TrayectosDet),
    )
    .map((t) => ({
      ...t,
      // API occasionally returns a bare number instead of a single-element array
      ID_TRAYECTO: Array.isArray(t.ID_TRAYECTO)
        ? t.ID_TRAYECTO
        : [t.ID_TRAYECTO as number],
    }));
}

export async function fetchKml(
  lineId: string,
  trayectoId: number,
): Promise<string> {
  const res = await fetch(`${BASE}/api/json/GetKMLs/${lineId}/${trayectoId}`);
  if (!res.ok) throw new Error(`GetKMLs/${lineId}/${trayectoId} ${res.status}`);
  return res.text();
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
 */
export function representativeDates(operatingDates: string[]): string[] {
  const byDow = new Map<number, string>();
  for (const d of operatingDates) {
    const dow = parseDateStr(d).getDay();
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
