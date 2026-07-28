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
import { moventisQueue } from "./throttle";
import { fromWallClock, toWallClock } from "./zoned-time";

type ApiJourneyDetail = z.infer<typeof scheduleSchema>;
type ApiScheduleLine = z.infer<typeof apiScheduleSchema>[number];

const realTimeRegex = /(?:(\d+)\s*h\s*)?(\d+)\s*min\s*(\d+)\s*s/;

/**
 * How far into the past a scheduled `hora` may sit before it is read as tomorrow's
 * service instead of a departure that just passed. Night lines list post-midnight
 * times before midnight, so a rollover is real — but so is a response captured a
 * minute after a bus left, and no line runs on a ~23h headway, so anything this
 * recent is staleness, not tomorrow.
 */
const STALE_SCHEDULE_TOLERANCE_MS = 60 * 60 * 1000;

export function normalizeText(text: string): string {
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

  // `hora` is a Lleida wall-clock time, so it has to be resolved against Lleida's
  // calendar day and offset. Reading it in the host's zone shifts every scheduled
  // arrival by the UTC offset — a permanent +2h (CEST) on the UTC servers this
  // deploys to, which is why nothing scheduled ever counted down below two hours.
  const { year, month, day } = toWallClock(now);
  const arrival = fromWallClock(year, month, day, hours, minutes);
  if (arrival.getTime() >= now.getTime() - STALE_SCHEDULE_TOLERANCE_MS) return arrival;
  return fromWallClock(year, month, day + 1, hours, minutes);
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

function fetchSchedulesRaw(
  externalStopId: string,
  externalRouteId: string,
): Promise<unknown> {
  const url = `https://www.moventis.es/api/json/GetTiemposParada/es/${externalStopId}/${externalRouteId}/0`;
  return moventisQueue.schedule(() => axios.get(url).then(({ data }) => data as unknown));
}

/** Map one validated API line to our internal {@link Schedules} entry. */
function mapLine(line: ApiScheduleLine, now: Date): Schedules[number] {
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
}

/**
 * Pure transform from a raw Moventis API response to {@link Schedules}. Filters the
 * `{"idLinea":"N"}` sentinel (returned when no service exists for the route/stop),
 * validates against {@link apiScheduleSchema}, then normalizes each line. `now` is
 * injected so the relative→absolute arrival-time math is deterministic in tests.
 *
 * Throws `ZodError` if the response shape changed — callers decide how to react.
 */
export function parseSchedulesResponse(data: unknown, now: Date): Schedules {
  // The API returns {"idLinea":"N",...} as a sentinel when no service exists for this route/stop.
  const valid = Array.isArray(data)
    ? (data as unknown[]).filter(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as Record<string, unknown>).idLinea !== "N",
      )
    : data;
  const lines = apiScheduleSchema.parse(valid);
  return lines.map((line) => mapLine(line, now));
}

export async function getStopSchedule(
  externalStopId: string,
  externalRouteId: string,
): Promise<Schedules | null> {
  try {
    const data = await fetchSchedulesRaw(externalStopId, externalRouteId);
    return parseSchedulesResponse(data, new Date());
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
