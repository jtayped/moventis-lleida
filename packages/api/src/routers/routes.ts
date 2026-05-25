import { db } from "@moventis/db";
import { LINES, type Lines } from "@moventis/shared";
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

export const routesRouter = createTRPCRouter({
  getAll: publicProcedure.query(() => getCachedRoutes()),
});
