import { createTRPCRouter, publicProcedure } from "../trpc";

export const routesRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const routes = await ctx.db.route.findMany({});
    return routes;
  }),
});
