import z from "zod";
import { db } from "@moventis/db";
import {
  readStoredTimetable,
  routePathSchema,
  type RoutePath,
} from "@moventis/shared";
import { unstable_cache } from "next/cache";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { utcStartOfLocalDay } from "../lib/zoned-time";
import {
  lineSegments,
  lineSummary,
  pickServiceDays,
  type DayType,
  type DaySummary,
  type LineSegment,
  type ServiceDays,
  type TimetableRowInput,
} from "../lib/timetable-views";

/**
 * Read-only data for the crawlable content pages (`/linies`, ...).
 *
 * Kept apart from the map's routers because these pages are what a crawler
 * hits, all of them, in bursts. Every read here is the database through an
 * hour-long `unstable_cache`, the same TTL as `routes.ts` and for the same
 * reason: the scraper writes from another container and nothing tells this
 * process. Nothing here calls Moventis, so a crawl cannot reach the 5 req/s
 * throttle the stop drawer depends on.
 */
const CONTENT_TTL_S = 60 * 60;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Today in Lleida, `YYYY-MM-DD`. Passed to every cached read as an argument so
 * the cache key changes at Lleida's midnight and yesterday's window is never
 * served as today's.
 */
const lleidaToday = () => isoDate(utcStartOfLocalDay(new Date()));

const getCachedServiceDays = unstable_cache(
  async (today: string): Promise<ServiceDays> => {
    const counts = await db.timetable.groupBy({
      by: ["date"],
      where: { date: { gte: new Date(today) } },
      _count: { _all: true },
    });
    return pickServiceDays(
      counts.map((c) => ({ date: isoDate(c.date), rows: c._count._all })),
    );
  },
  ["content-service-days-v1"],
  { revalidate: CONTENT_TTL_S },
);

const serviceDates = (days: ServiceDays) =>
  Object.values(days).map((date) => new Date(date));

const VARIANT_SELECT = {
  orderBy: [
    { isPrincipal: "desc" as const },
    { direction: "asc" as const },
    { externalId: "asc" as const },
  ],
  select: {
    description: true,
    direction: true,
    isPrincipal: true,
    trayectoIds: true,
  },
};

const TIMETABLE_SELECT = {
  trayectoId: true,
  date: true,
  stops: true,
  trips: true,
  unpaired: true,
};

/** Rows the reader rejects are dropped here, once, rather than half-read on a page. */
function toRowInputs(
  rows: {
    trayectoId: number;
    date: Date;
    stops: string[];
    trips: unknown;
    unpaired: unknown;
  }[],
): TimetableRowInput[] {
  return rows.flatMap((row) => {
    const timetable = readStoredTimetable(row);
    return timetable
      ? [{ trayectoId: row.trayectoId, date: isoDate(row.date), timetable }]
      : [];
  });
}

/** Most points a thumbnail keeps per polyline; the full path runs to thousands. */
const THUMBNAIL_POINTS = 60;

/** Every k-th point plus the last, so a thumbnail ships a few KB instead of the whole path. */
function thinPath(path: RoutePath): RoutePath {
  return {
    paths: path.paths.map((line) => {
      const step = Math.ceil(line.length / THUMBNAIL_POINTS);
      if (step <= 1) return line;
      const kept = line.filter((_, i) => i % step === 0);
      return kept[kept.length - 1] === line[line.length - 1]
        ? kept
        : [...kept, line[line.length - 1]!];
    }),
  };
}

export interface LineIndexEntry {
  code: string;
  name: string;
  color: string;
  /** Thinned for a thumbnail. */
  path: RoutePath;
  summary: Partial<Record<DayType, DaySummary>>;
}

const getCachedLineIndex = unstable_cache(
  async (
    today: string,
  ): Promise<{ days: ServiceDays; lines: LineIndexEntry[] }> => {
    const days = await getCachedServiceDays(today);
    const routes = await db.route.findMany({
      select: {
        code: true,
        name: true,
        color: true,
        path: true,
        variants: VARIANT_SELECT,
        timetables: {
          where: { date: { in: serviceDates(days) } },
          select: TIMETABLE_SELECT,
        },
      },
    });

    const lines = routes.map((route) => {
      const path = routePathSchema.safeParse(route.path);
      return {
        code: route.code,
        name: route.name,
        color: route.color,
        path: path.success ? thinPath(path.data) : { paths: [] },
        summary: lineSummary(
          lineSegments(route.variants, toRowInputs(route.timetables), days),
        ),
      };
    });
    return { days, lines };
  },
  ["content-line-index-v2"],
  { revalidate: CONTENT_TTL_S },
);

export interface LinePageSegment extends Omit<LineSegment, "stops"> {
  /** `name` is null for a stop the timetable lists and the stop table does not. */
  stops: { externalId: string; name: string | null }[];
}

export interface LinePage {
  code: string;
  name: string;
  color: string;
  path: RoutePath;
  days: ServiceDays;
  summary: Partial<Record<DayType, DaySummary>>;
  segments: LinePageSegment[];
}

const getCachedLinePage = unstable_cache(
  async (code: string, today: string): Promise<LinePage | null> => {
    const days = await getCachedServiceDays(today);
    const route = await db.route.findFirst({
      where: { code, deletedAt: null },
      select: {
        code: true,
        name: true,
        color: true,
        path: true,
        variants: VARIANT_SELECT,
        timetables: {
          where: { date: { in: serviceDates(days) } },
          select: TIMETABLE_SELECT,
        },
      },
    });
    if (!route) return null;

    const segments = lineSegments(
      route.variants,
      toRowInputs(route.timetables),
      days,
    );
    const stopIds = [...new Set(segments.flatMap((s) => s.stops))];
    const stops = await db.stop.findMany({
      where: { externalId: { in: stopIds } },
      select: { externalId: true, name: true },
    });
    const names = new Map(stops.map((s) => [s.externalId, s.name]));
    const path = routePathSchema.safeParse(route.path);

    return {
      code: route.code,
      name: route.name,
      color: route.color,
      path: path.success ? path.data : { paths: [] },
      days,
      summary: lineSummary(segments),
      segments: segments.map((segment) => ({
        ...segment,
        stops: segment.stops.map((externalId) => ({
          externalId,
          name: names.get(externalId) ?? null,
        })),
      })),
    };
  },
  ["content-line-page-v1"],
  { revalidate: CONTENT_TTL_S },
);

export const contentRouter = createTRPCRouter({
  /** Every live line with its first bus, last bus and frequency per day type. */
  lines: publicProcedure.query(() => getCachedLineIndex(lleidaToday())),
  /** One line's timetable page, or null for a code that is not a live line. */
  line: publicProcedure
    .input(z.object({ code: z.string().max(8) }))
    .query(({ input }) => getCachedLinePage(input.code, lleidaToday())),
});
