// src/validators/schedule.ts

import { z } from "zod";

// --- Helper Functions (No changes needed) ---

const parseTimeToSeconds = (timeStr: string | null | undefined): number => {
  if (!timeStr) return 0;
  const minSecMatch = timeStr.match(/(\d+)\s*min\s*(\d+)\s*s/);
  if (minSecMatch) {
    return parseInt(minSecMatch[1], 10) * 60 + parseInt(minSecMatch[2], 10);
  }
  const quoteMatch = timeStr.match(/(\d+)'\s*(\d+)''/);
  if (quoteMatch) {
    return parseInt(quoteMatch[1], 10) * 60 + parseInt(quoteMatch[2], 10);
  }
  return 0;
};

const parseHourToDate = (hourStr: string | null | undefined): Date | null => {
  if (!hourStr || !/^\d{2}:\d{2}$/.test(hourStr)) {
    return null;
  }
  const [hours, minutes] = hourStr.split(":").map(Number);
  if (
    hours === undefined ||
    minutes === undefined ||
    isNaN(hours) ||
    isNaN(minutes)
  ) {
    return null;
  }
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// --- Zod Schemas for the New Structure ---

// 1. Schema for a single bus arrival. Renamed for clarity.
const busArrivalSchema = z
  .object({
    minutos: z.string(),
    real: z.enum(["S", "N"]),
    hora: z.string().optional(),
  })
  .transform((data) => ({
    isRealTime: data.real === "S",
    timeToArrivalInSeconds: parseTimeToSeconds(data.minutos),
    estimatedArrivalTime: parseHourToDate(data.hora),
  }));

// 2. Intermediate schema to process the nested `trayectos` object.
// This step is crucial for gathering all arrivals before flattening.
const intermediateRoutesSchema = z
  .record(z.string(), z.record(z.string(), busArrivalSchema))
  .transform((routesRecord) => {
    // routesRecord is like: { "ROUTE_NAME_1": { "ID_1": {...}, "ID_2": {...} }, ... }
    const allRoutes = Object.values(routesRecord);
    // allRoutes is like: [ { "ID_1": {...} }, { "ID_3": {...}} ]
    const allArrivalObjects = allRoutes.flatMap((route) =>
      Object.values(route),
    );
    // allArrivalObjects is a flat array: [ {...}, {...}, {...} ]
    return allArrivalObjects;
  });

// 3. The main schema that transforms a raw line object into your desired final structure.
const scheduleValidator = z
  .object({
    idLinea: z.number(),
    desc_linea: z.string(),
    trayectos: intermediateRoutesSchema,
  })
  .transform((data) => {
    // Split "4 - PARDINYES-MARIOLA" into code and name
    const descriptionParts = data.desc_linea.split(" - ", 2);
    const lineCode = descriptionParts[0] ?? "";
    // If there's no " - ", use the whole description as the name and code as empty.
    const lineName = descriptionParts[1] ?? data.desc_linea;

    return {
      lineId: data.idLinea.toString(), // Convert number to string as requested
      lineCode: lineCode.trim(),
      lineName: lineName.trim(),
      buses: data.trayectos, // This is already the flat array from intermediateRoutesSchema
    };
  });

// 4. Final export: The validator for the entire API response array.
export const scheduleResponseValidator = z.array(scheduleValidator);

// Export TypeScript types for external use
export type BusArrival = z.infer<typeof busArrivalSchema>;
export type FinalBusLine = z.infer<typeof scheduleValidator>;
