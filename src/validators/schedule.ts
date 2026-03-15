import { z } from "zod";

// Base schema with common fields
const baseScheduleSchema = z.object({
  minutos: z.string(),
  adaptada: z.unknown().nullable(),
});

// 1. Schema for REAL-TIME data ("S")
const realTimeScheduleSchema = baseScheduleSchema.extend({
  real: z.literal("S"),
});

// 2. Schema for SCHEDULED data ("N")
const scheduledTimeSchema = baseScheduleSchema.extend({
  real: z.literal("N"),
  hora: z.string(),
  tiempo: z.string(),
});

// 3. Create the discriminated union
export const scheduleSchema = z.discriminatedUnion("real", [
  realTimeScheduleSchema,
  scheduledTimeSchema,
]);

// 4. FIX: The value of a journey can be an object OR an array
const journeySchema = z.record(
  z.string(), // Key, e.g., "ARNAU DE VILANOVA - PLA D'URGELL"
  z.union([
    z.record(z.string(), scheduleSchema), // Case 1: Object of schedules
    z.array(scheduleSchema), // Case 2: Array of schedules (the edge case)
  ]),
);

// This schema remains the same
const lineSchema = z.object({
  idLinea: z.number(),
  desc_linea: z.string(),
  trayectos: journeySchema,
  incidencias: z.unknown().nullable(),
  selected: z.union([z.literal(0), z.literal(1)]),
});

export const apiScheduleSchema = z.array(lineSchema);
