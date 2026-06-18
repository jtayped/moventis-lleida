import z from "zod";
import { db } from "@moventis/db";
import { routePathSchema, type RoutePath } from "@moventis/shared";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { unstable_cache } from "next/cache";

const getCachedRoutes = unstable_cache(
  async () => db.route.findMany({ where: { deletedAt: null } }),
  ["all-bus-routes"],
  { revalidate: 60 * 60 * 24 * 7 },
);

// Route geometry is static and large, so it's fetched lazily (only when a line
// is selected) and cached for a week, keyed by line code.
const getCachedPath = unstable_cache(
  async (code: string): Promise<RoutePath> => {
    const route = await db.route.findFirst({
      where: { code, deletedAt: null },
      select: { path: true },
    });
    const parsed = routePathSchema.safeParse(route?.path);
    return parsed.success ? parsed.data : { paths: [] };
  },
  ["bus-route-path"],
  { revalidate: 60 * 60 * 24 * 7 },
);

const getCachedVariantStops = unstable_cache(
  async (code: string) => {
    const route = await db.route.findFirst({
      where: { code, deletedAt: null },
      select: {
        variants: {
          orderBy: [{ isPrincipal: "desc" }, { direction: "asc" }],
          select: {
            direction: true,
            description: true,
            isPrincipal: true,
            stops: {
              orderBy: { sequence: "asc" },
              select: {
                sequence: true,
                stop: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!route) return [];

    return route.variants.map((v) => ({
      direction: v.direction as "I" | "V",
      description: v.description,
      isPrincipal: v.isPrincipal,
      stops: v.stops.map((s, idx) => ({
        id: s.stop.id,
        name: s.stop.name,
        index: idx,
        total: v.stops.length,
      })),
    }));
  },
  ["route-variant-stops"],
  { revalidate: 60 * 60 * 24 * 7 },
);

export const routesRouter = createTRPCRouter({
  getAll: publicProcedure.query(() => getCachedRoutes()),
  getPath: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(({ input }) => getCachedPath(input.code)),
  getVariantStops: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(({ input }) => getCachedVariantStops(input.code)),
  /** Returns the line codes of routes that have at least one operating day today. */
  getTodayActive: publicProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const active = await ctx.db.route.findMany({
      where: {
        deletedAt: null,
        operatingDays: { some: { date: { gte: today, lt: tomorrow } } },
      },
      select: { code: true },
    });

    return active.map((r) => r.code);
  }),
});
