import type { z } from "zod";
import type { busPositionSchema } from "../schemas/bus-position";

/** An inferred real-time bus position returned from `buses.byLine`. */
export type BusPosition = z.infer<typeof busPositionSchema>;
