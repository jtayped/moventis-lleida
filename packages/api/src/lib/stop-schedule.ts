import {
  type Lines,
  type Journey,
  type Schedules,
  type scheduleSchema,
  apiScheduleSchema,
} from "@moventis/shared";
import axios, { AxiosError } from "axios";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

type ApiJourneyDetail = z.infer<typeof scheduleSchema>;
type ApiScheduleLine = z.infer<typeof apiScheduleSchema>[number];

const realTimeRegex = /(?:(\d+)\s*h\s*)?(\d+)\s*min\s*(\d+)\s*s/;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s*\/\s*/g, " / ");
}

function parseArrivalTime(detail: ApiJourneyDetail, now: Date): Date {
  if (detail.real === "S") {
    const parts = realTimeRegex.exec(detail.minutos);
    if (!parts) {
      console.warn("Could not parse real-time string:", detail.minutos);
      return now;
    }
    const ms =
      (parseInt(parts[1] ?? "0", 10) * 3600 +
        parseInt(parts[2] ?? "0", 10) * 60 +
        parseInt(parts[3] ?? "0", 10)) *
      1000;
    return new Date(now.getTime() + ms);
  }

  const timeParts = detail.hora.split(":");
  const hours = parseInt(timeParts[0] ?? "0", 10);
  const minutes = parseInt(timeParts[1] ?? "0", 10);
  if (isNaN(hours) || isNaN(minutes)) {
    console.warn("Could not parse scheduled time:", detail.hora);
    return now;
  }
  const arrival = new Date(now);
  arrival.setHours(hours, minutes, 0, 0);
  if (arrival < now) arrival.setDate(arrival.getDate() + 1);
  return arrival;
}

function buildJourneys(trayectos: ApiScheduleLine["trayectos"], now: Date): Journey[] {
  const map = new Map<string, Journey>();

  for (const [rawName, value] of Object.entries(trayectos)) {
    const name = normalizeText(rawName);
    const details: ApiJourneyDetail[] = Array.isArray(value) ? value : Object.values(value);

    const scheduledTimes = details.map((d) => ({
      isRealTime: d.real === "S",
      arrivalTime: parseArrivalTime(d, now),
      accessible: d.adaptada === "S" ? true : d.adaptada === "N" ? false : null,
    }));

    const existing = map.get(name);
    if (existing) {
      existing.scheduledTimes.push(...scheduledTimes);
    } else {
      map.set(name, { name, scheduledTimes });
    }
  }

  return [...map.values()].map((j) => ({
    ...j,
    scheduledTimes: j.scheduledTimes.sort(
      (a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime(),
    ),
  }));
}

async function fetchSchedules(
  externalStopId: string,
  externalRouteId: string,
): Promise<ApiScheduleLine[]> {
  const url = `https://www.moventis.es/api/json/GetTiemposParada/es/${externalStopId}/${externalRouteId}/0`;
  const { data } = await axios.get(url);
  // The API returns {"idLinea":"N",...} as a sentinel when no service exists for this route/stop.
  const valid = Array.isArray(data)
    ? (data as unknown[]).filter(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as Record<string, unknown>).idLinea !== "N",
      )
    : data;
  return apiScheduleSchema.parse(valid);
}

export async function getStopSchedule(
  externalStopId: string,
  externalRouteId: string,
): Promise<Schedules | null> {
  try {
    const now = new Date();
    const data = await fetchSchedules(externalStopId, externalRouteId);

    return data.map((line) => {
      const desc = normalizeText(line.desc_linea);
      const sepIdx = desc.indexOf(" - ");
      if (sepIdx === -1) throw new Error(`Line description separator not found: ${line.desc_linea}`);

      const journeys = buildJourneys(line.trayectos, now);
      journeys.sort((a, b) => a.name.localeCompare(b.name));

      return {
        externalLineId: String(line.idLinea),
        lineCode: desc.slice(0, sepIdx) as Lines,
        lineName: desc.slice(sepIdx + 3),
        selected: line.selected,
        incidencias: line.incidencias,
        journeys,
      };
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("ZodError:", JSON.stringify(error.issues, null, 2));
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Moventis API response shape changed.",
        cause: error,
      });
    }
    if (error instanceof AxiosError) {
      console.error(`Moventis API network error: ${error.message}`);
      return null;
    }
    console.error("Unexpected error in getStopSchedule:", error);
    return null;
  }
}
