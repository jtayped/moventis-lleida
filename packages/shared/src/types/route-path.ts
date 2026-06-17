import type { z } from "zod";
import type {
  coordinateSchema,
  polylineSchema,
  routePathSchema,
} from "../schemas/route-path";

/** A single [lng, lat] coordinate. */
export type Coordinate = z.infer<typeof coordinateSchema>;
/** An ordered list of coordinates forming one polyline. */
export type Polyline = z.infer<typeof polylineSchema>;
/** Aggregated route geometry: a set of clean, deduplicated polylines. */
export type RoutePath = z.infer<typeof routePathSchema>;
