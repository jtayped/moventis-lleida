import { db } from "@moventis/db";
import {
  fetchLleidaLines,
  fetchTrayectos,
  nextDates,
  representativeDates,
  type MoventisLine,
  type MoventisTrayecto,
} from "./api.js";
import { normalizeLineCode, normalizeName } from "./normalize.js";
import { mapWithConcurrency } from "./pool.js";
import {
  dedupeTrayectos,
  dormantOutcome,
  hasService,
  runningOutcome,
  summarizeProbes,
  type Probe,
  type ResolvedOutcome,
} from "./resolution.js";

/** Interurban and tourist lines excluded from this Lleida urban app. */
export const EXCLUDED_CODES = new Set(["bt", "120", "121", "122", "401"]);

/**
 * How far ahead the fallback probes, day by day, to rebuild a line's calendar.
 * The feed used to supply 60 days for free; probing costs one request per line
 * per day, so this trades horizon for traffic. Two weeks is well past what the
 * UI reads (`routes.getTodayActive` only asks about today) and the window rolls
 * forward on every nightly run.
 */
export const CALENDAR_HORIZON_DAYS = 14;

/**
 * When a line runs on none of those days, it is sampled weekly this far out
 * before being treated as withdrawn.
 *
 * Lleida really does park lines for a season — line 10 (Caparrella - Llívia)
 * serves nothing across all of August and resumes in September. Without this
 * second look, a summer run would find no service, leave the route soft-deleted,
 * and take its stops with it.
 */
const EXISTENCE_SCAN_SAMPLES = 13;
const EXISTENCE_SCAN_STEP_DAYS = 7;

/** Simultaneous Moventis requests during a probe. */
const PROBE_CONCURRENCY = 4;

/** A line resolved to everything `syncLine` needs, with no fetching left to do. */
export interface ResolvedLine {
  /** Moventis `ID_LINEA`, stored as `Route.externalId`. */
  externalId: string;
  code: string;
  name: string;
  color: string;
  /**
   * Dates the line runs, as `YYYYMMDD`. Empty for a line that exists but is
   * dormant across the whole near horizon.
   */
  operatingDates: string[];
  /**
   * Whether the calendar above is a complete answer for the near horizon. False
   * when the probe hit errors, in which case the stored operating days are left
   * alone rather than being replaced with a half-known calendar.
   */
  calendarProbed: boolean;
  /** Deduplicated trayectos across every date consulted. Never empty. */
  trayectos: MoventisTrayecto[];
}

export type DiscoverySource = "feed" | "database";

export interface Discovery {
  source: DiscoverySource;
  lines: ResolvedLine[];
  /**
   * Lines whose requests errored. Reported rather than dropped: an unreachable
   * line means this run has an incomplete picture of the network, which is
   * exactly when pruning must not run.
   */
  unreachable: string[];
  /**
   * Lines that answered cleanly but run nowhere in the scan. That is a real
   * answer, not a fault, so it does not block pruning — soft-deletion is
   * reversible and the next run un-deletes the line the moment service returns.
   */
  withdrawn: string[];
}

/** Outcome of resolving one line. Only `unreachable` casts doubt on the run. */
type Resolution =
  | { status: "resolved"; line: ResolvedLine }
  | { status: "withdrawn" }
  | { status: "unreachable" };

async function probeDates(lineId: string, dates: string[]): Promise<Probe[]> {
  return mapWithConcurrency(dates, PROBE_CONCURRENCY, async (date) => {
    try {
      return { date, trayectos: await fetchTrayectos(lineId, date) };
    } catch {
      return { date, trayectos: null };
    }
  });
}

/**
 * Resolve a line from the feed: the feed already states which days it runs, so
 * only one representative date per day-of-week group needs fetching.
 */
async function resolveFromFeed(
  entry: MoventisLine,
  operatingDates: string[],
): Promise<Resolution> {
  const probes = await probeDates(
    entry.ID_LINEA,
    representativeDates(operatingDates),
  );
  const trayectos = dedupeTrayectos(probes.map((p) => p.trayectos ?? []));

  // The feed asserts this line runs on these dates. Getting no trayectos back
  // for them is a contradiction upstream, not a withdrawal — treat it as doubt.
  if (trayectos.length === 0) return { status: "unreachable" };

  return {
    status: "resolved",
    line: {
      externalId: entry.ID_LINEA,
      code: normalizeLineCode(entry.COD_LINEA),
      name: normalizeName(entry.DESC_LINEA),
      color: entry.COLOR,
      operatingDates,
      calendarProbed: true,
      trayectos,
    },
  };
}

/**
 * Resolve a line the feed no longer lists, by asking `GetTrayectos` directly for
 * every date in the horizon.
 *
 * The endpoint answers with a bare `[{ numLinea }]` stub on a date the line does
 * not run (`fetchTrayectos` filters those to an empty array), which makes it a
 * usable calendar oracle — the dates that come back with real trayectos *are*
 * the operating days.
 *
 * Identity (code, name, colour) comes from the existing row: the feed was the
 * only source for those, so the stored values are the freshest we have.
 */
async function resolveFromDatabase(route: {
  externalId: string;
  code: string;
  name: string;
  color: string;
}): Promise<Resolution> {
  const identity = {
    externalId: route.externalId,
    code: route.code,
    name: route.name,
    color: route.color,
  };

  const near = summarizeProbes(
    await probeDates(
      route.externalId,
      nextDates(new Date(), CALENDAR_HORIZON_DAYS),
    ),
  );

  if (hasService(near)) {
    return {
      status: "resolved",
      line: { ...identity, ...calendarOf(runningOutcome(near)) },
    };
  }

  // Nothing in the near horizon. Sample further out before concluding the line
  // is gone — a dormant line still needs its stops and geometry kept alive.
  const far = summarizeProbes(
    await probeDates(
      route.externalId,
      nextDates(new Date(), EXISTENCE_SCAN_SAMPLES, EXISTENCE_SCAN_STEP_DAYS),
    ),
  );

  const outcome = dormantOutcome(near, far);
  if (outcome.status !== "resolved") return outcome;

  console.log(
    `  [${route.code}] dormant for the next ${CALENDAR_HORIZON_DAYS} days; ` +
      `service resumes by ${far.operatingDates[0]}`,
  );
  return { status: "resolved", line: { ...identity, ...calendarOf(outcome) } };
}

/** Narrow a resolved outcome to just the calendar fields of a `ResolvedLine`. */
function calendarOf(
  outcome: ResolvedOutcome,
): Pick<ResolvedLine, "operatingDates" | "calendarProbed" | "trayectos"> {
  return {
    operatingDates: outcome.operatingDates,
    calendarProbed: outcome.calendarProbed,
    trayectos: outcome.trayectos,
  };
}

/** Group feed entries by line, collecting the operating date each row carries. */
function groupFeedEntries(
  entries: readonly MoventisLine[],
): Map<string, { entry: MoventisLine; dates: string[] }> {
  const byLine = new Map<string, { entry: MoventisLine; dates: string[] }>();
  for (const entry of entries) {
    if (EXCLUDED_CODES.has(normalizeLineCode(entry.COD_LINEA))) continue;
    const existing = byLine.get(entry.ID_LINEA);
    if (existing) {
      existing.dates.push(entry.DIAS_QUE_CIRCULA);
    } else {
      byLine.set(entry.ID_LINEA, { entry, dates: [entry.DIAS_QUE_CIRCULA] });
    }
  }
  return byLine;
}

/**
 * Find the Lleida lines and everything needed to sync them.
 *
 * The feed (`/es/moventis/es/lines`) is still the preferred source — it is the
 * only one carrying names, colours and a 60-day calendar. But it stopped listing
 * the Lleida zone entirely on 2026-08-02 while every per-line endpoint kept
 * serving Lleida data, so the feed can no longer be treated as the authority on
 * whether the network exists.
 *
 * Feed entries are matched two ways: by `ID_ZONA` (the original rule) and by
 * `ID_LINEA` against routes already stored, so a zone renumber upstream
 * reconnects on its own. Only when both find nothing does it fall back to
 * driving the sync from the stored routes.
 */
export async function discoverLines(): Promise<Discovery> {
  const knownRoutes = await db.route.findMany({
    // Soft-deleted routes are included on purpose: the 2026-08-02 regression
    // soft-deleted every one of them, and this query is what lets a run find
    // them again and clear the flag.
    select: { externalId: true, code: true, name: true, color: true },
  });
  const eligible = knownRoutes.filter((r) => !EXCLUDED_CODES.has(r.code));
  const knownIds = new Set(eligible.map((r) => r.externalId));

  let feedEntries: MoventisLine[] = [];
  try {
    feedEntries = await fetchLleidaLines(knownIds);
  } catch (err) {
    console.error("[discovery] Line feed unavailable:", err);
  }

  const grouped = [...groupFeedEntries(feedEntries).values()];

  if (grouped.length > 0) {
    const resolutions = await Promise.all(
      grouped.map(({ entry, dates }) => resolveFromFeed(entry, dates)),
    );
    return collect(
      "feed",
      resolutions,
      grouped.map(({ entry }) => normalizeLineCode(entry.COD_LINEA)),
    );
  }

  console.warn(
    "[discovery] Line feed lists no Lleida lines — falling back to the " +
      `${eligible.length} route(s) already stored and probing their calendars.`,
  );

  const resolutions = await Promise.all(eligible.map(resolveFromDatabase));

  return collect(
    "database",
    resolutions,
    eligible.map((r) => r.code),
  );
}

/** Split parallel resolutions into the three buckets, keyed by line code. */
function collect(
  source: DiscoverySource,
  resolutions: readonly Resolution[],
  codes: readonly string[],
): Discovery {
  const lines: ResolvedLine[] = [];
  const unreachable: string[] = [];
  const withdrawn: string[] = [];

  resolutions.forEach((resolution, i) => {
    const code = codes[i] ?? "?";
    if (resolution.status === "resolved") lines.push(resolution.line);
    else if (resolution.status === "withdrawn") withdrawn.push(code);
    else unreachable.push(code);
  });

  return { source, lines, unreachable, withdrawn };
}
