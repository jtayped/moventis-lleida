import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { Stop } from "@prisma/client";

export const stopsRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        routeIds: z.string().array(),
        query: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<Stop[]> => {
      const { routeIds, query } = input;

      // If no routes are selected AND there is no search query, return nothing.
      if (routeIds.length === 0 && !query) {
        return []; // Return an empty array immediately
      }

      const stops = await ctx.db.stop.findMany({
        where: {
          ...(routeIds.length > 0 && {
            routes: {
              some: {
                id: {
                  in: routeIds,
                },
              },
            },
          }),
          ...(query && {
            name: {
              contains: query,
              mode: "insensitive",
            },
          }),
        },
      });

      return stops;
    }),
});
