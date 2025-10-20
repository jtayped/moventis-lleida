import { createTRPCRouter, publicProcedure } from "../trpc";
import { unstable_cache } from "next/cache";

export const routesRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const getCachedRoutes = unstable_cache(
      async () => {
        return ctx.db.route.findMany({
          orderBy: {
            code: "asc",
          },
        });
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
