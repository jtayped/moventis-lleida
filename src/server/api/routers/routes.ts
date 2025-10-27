import type { Lines } from "@/types/lines";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { unstable_cache } from "next/cache";

export const routesRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const getCachedRoutes = unstable_cache(
      async () => {
        const data = await ctx.db.route.findMany({});
        const routes = data.map((route) => ({
          ...route,
          code: route.code as Lines, // transform code type
        }));

        return routes;
      },
      ["all-bus-routes"],
      {
        revalidate: 60 * 60 * 24 * 7,
      },
    );

    // 5. Call the cached function
    const routes = await getCachedRoutes();
    return routes;
  }),
});
