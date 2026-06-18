import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { Stop } from "@moventis/db";
import { getStopSchedule } from "../lib/stop-schedule";
import { TRPCError } from "@trpc/server";

export const stopsRouter = createTRPCRouter({
  getByRoute: publicProcedure
    .input(z.object({ routeCode: z.string() }))
    .query(async ({ ctx, input }): Promise<Stop[]> => {
      return ctx.db.stop.findMany({
        where: { routes: { some: { code: input.routeCode } }, deletedAt: null },
      });
    }),
  getMany: publicProcedure
    .input(
      z.object({
        routeCodes: z.string().array(),
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
          deletedAt: null,
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

      // Skip live schedule fetch for soft-deleted stops — the stop no longer
      // exists in the Moventis API and the request would fail or return stale data.
      if (stop.deletedAt) {
        return { ...stop, schedules: [] };
      }

      const scheduleResults = await Promise.all(
        stop.routes.map((route) =>
          getStopSchedule(stop.externalId, route.externalId),
        ),
      );
      const allSchedules = scheduleResults
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .flat();

      // Keep only schedules for routes this stop belongs to — the Moventis API
      // returns schedules for all cities it operates in (e.g. Palma de Mallorca
      // lines 107, 123), and also deduplicates overlapping entries from fetching
      // multiple routes at the same stop.
      const validCodes = new Set(stop.routes.map((r) => r.code));
      const schedules = [
        ...new Map(allSchedules.map((s) => [s.externalLineId, s])).values(),
      ].filter((s) => validCodes.has(s.lineCode));

      return { ...stop, schedules };
    }),
});
