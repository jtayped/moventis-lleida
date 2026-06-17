import { z } from "zod";

// A single coordinate as [lng, lat] (the order stored in the DB / KML source).
export const coordinateSchema = z.tuple([z.number(), z.number()]);

// One polyline is an ordered list of coordinates.
export const polylineSchema = z.array(coordinateSchema);

// Aggregated geometry for a route: a small set of clean, deduplicated polylines.
export const routePathSchema = z.object({
  paths: z.array(polylineSchema),
});
