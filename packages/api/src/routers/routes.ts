import z from "zod";
import { db } from "@moventis/db";
import {
  LINES,
  routePathSchema,
  type Lines,
  type RoutePath,
} from "@moventis/shared";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { unstable_cache } from "next/cache";

function assertLine(code: string): Lines {
  if (!(LINES as readonly string[]).includes(code)) {
    throw new Error(`Unknown route code in DB: "${code}"`);
  }
  return code as Lines;
}

const getCachedRoutes = unstable_cache(
  async () => {
    const data = await db.route.findMany({ where: { deletedAt: null } });
    return data.map((route) => ({ ...route, code: assertLine(route.code) }));
  },
  ["all-bus-routes"],
  { revalidate: 60 * 60 * 24 * 7 },
);

// Route geometry is static and large, so it's fetched lazily (only when a line
// is selected) and cached for a week, keyed by line code.
const getCachedPath = unstable_cache(
  async (code: Lines): Promise<RoutePath> => {
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

export const routesRouter = createTRPCRouter({
  getAll: publicProcedure.query(() => getCachedRoutes()),
  getPath: publicProcedure
    .input(z.object({ code: z.enum(LINES) }))
    .query(({ input }) => getCachedPath(input.code)),
});
