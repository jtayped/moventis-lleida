import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { Stop } from "@moventis/db";
import { getStopSchedule } from "../lib/stop-schedule";
import { TRPCError } from "@trpc/server";
import { LINES, type Lines } from "@moventis/shared";

function assertLine(code: string): Lines {
  if (!(LINES as readonly string[]).includes(code)) {
    throw new Error(`Unknown route code in DB: "${code}"`);
  }
  return code as Lines;
}

export const stopsRouter = createTRPCRouter({
  getMany: publicProcedure
    .input(
      z.object({
        routeCodes: z.enum(LINES).array(),
        query: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<Stop[]> => {
      const { routeCodes, query } = input;
      // If no routes are selected AND there is no search query, return nothing.
      if (routeCodes.length === 0 && !query) {
        return []; // Return an empty array immediately
      }

      const stops = await ctx.db.stop.findMany({
        where: {
          ...(routeCodes.length > 0 && {
            routes: {
              some: {
                code: {
                  in: routeCodes,
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
  get: publicProcedure
    .input(z.object({ stopId: z.string() }))
    .query(async ({ input, ctx }) => {
      const stop = await ctx.db.stop.findUnique({
        where: { id: input.stopId },
        include: { routes: true },
      });

      if (!stop) throw new TRPCError({ code: "NOT_FOUND" });
      if (stop.routes.length === 0)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const scheduleResults = await Promise.all(
        stop.routes.map((route) =>
          getStopSchedule(stop.externalId, route.externalId),
        ),
      );
      const schedules = scheduleResults
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .flat();

      const typedRoutes = stop.routes.map((r) => ({
        ...r,
        code: assertLine(r.code),
      }));

      return { ...stop, routes: typedRoutes, schedules };
    }),
});
