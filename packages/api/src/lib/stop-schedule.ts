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

// --- TYPE DEFINITIONS ---

/** A single journey detail from the API */
type ApiJourneyDetail = z.infer<typeof scheduleSchema>;
/** A single line (with all its trayectos) from the API response array */
type ApiScheduleLine = z.infer<typeof apiScheduleSchema>[number];
/** A single scheduled arrival entry, matching Journey["scheduledTimes"][number] */
type ScheduledTime = Journey["scheduledTimes"][number];

// --- CONSTANTS ---

const realTimeRegex = /(?:(\d+)\s*h\s*)?(\d+)\s*min\s*(\d+)\s*s/;
const API_URL_TEMPLATE =
  "https://www.moventis.es/api/json/GetTiemposParada/es/{externalStopId}/{externalRouteId}/0";

// --- TEXT & TIME HELPERS ---

/**
 * Cleans text by making it lowercase and normalizing separators
 * (e.g., "TEXT-A/B" becomes "text - a / b").
 */
function cleanAndNormalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s*-\s*/g, " - ") // Ensures spaces around ' - '
    .replace(/\s*\/\s*/g, " / "); // Ensures spaces around ' / '
}

/**
 * Parses the API's schedule object into a standard Date object.
 * @param scheduleDetails - The raw journey detail from the API.
 * @param now - The reference timestamp for relative offset arithmetic.
 */
function parseArrivalTime(scheduleDetails: ApiJourneyDetail, now: Date): Date {
  if (scheduleDetails.real === "S") {
    // REAL-TIME:
    const parts = realTimeRegex.exec(scheduleDetails.minutos);

    if (parts) {
      const hours = parseInt(parts[1] ?? "0", 10);
      const minutes = parseInt(parts[2] ?? "0", 10);
      const seconds = parseInt(parts[3] ?? "0", 10);

      const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
      return new Date(now.getTime() + totalMs);
    }

    console.warn("Could not parse real-time string:", scheduleDetails.minutos);
    return now;
  } else {
    // SCHEDULED TIME:
    const timeParts = scheduleDetails.hora.split(":");
    const hours = parseInt(timeParts[0] ?? "0", 10);
    const minutes = parseInt(timeParts[1] ?? "0", 10);

    if (isNaN(hours) || isNaN(minutes)) {
      console.warn("Could not parse scheduled time:", scheduleDetails.hora);
      return now;
    }

    const arrivalDate = new Date(now);
    arrivalDate.setHours(hours, minutes, 0, 0);

    // Handle "day wrap" (e.g., if it's 11 PM and the schedule shows 1 AM)
    if (arrivalDate.getTime() < now.getTime()) {
      arrivalDate.setDate(arrivalDate.getDate() + 1);
    }
    return arrivalDate;
  }
}

// --- API & DATA TRANSFORMATION HELPERS ---

/**
 * Handles fetching and Zod parsing of the schedule data.
 */
async function fetchAndParseSchedules(
  externalStopId: string,
  externalRouteId: string,
): Promise<ApiScheduleLine[]> {
  const url = API_URL_TEMPLATE.replace(
    "{externalStopId}",
    externalStopId,
  ).replace("{externalRouteId}", externalRouteId);

  const res = await axios.get(url);

  // Parse and validate the entire API response
  return apiScheduleSchema.parse(res.data);
}

/**
 * Transforms the raw API data array into the clean Schedules type.
 */
function transformApiDataToSchedules(data: ApiScheduleLine[], now: Date): Schedules {
  return data.map((line) => processApiLine(line, now));
}

/**
 * Processes a single line from the API response.
 */
function processApiLine(line: ApiScheduleLine, now: Date): Schedules[number] {
  // 1. Parse the line description
  const { lineCode, lineName } = parseLineDescription(line.desc_linea);

  // 2. Process and group all journeys for this line
  const journeys = processTrayectos(line.trayectos, now);

  // 3. Sort the final list of grouped journeys alphabetically by name
  journeys.sort((a, b) => a.name.localeCompare(b.name));

  // 4. Construct the final clean object for this line
  return {
    externalLineId: String(line.idLinea),
    lineCode: lineCode,
    lineName: lineName,
    selected: line.selected === 1,
    journeys: journeys,
  };
}

/**
 * Cleans and parses the line description string into a code and name.
 */
function parseLineDescription(desc_linea: string): {
  lineCode: Lines;
  lineName: string;
} {
  // Use the reusable helper function
  const cleanedDesc = cleanAndNormalizeText(desc_linea);

  const separator = " - ";
  const separatorIndex = cleanedDesc.indexOf(separator);

  if (separatorIndex === -1) {
    console.error("Could not parse line description:", desc_linea);
    throw new Error("Line description separator ' - ' not found.");
  }

  const lineCode = cleanedDesc.substring(0, separatorIndex) as Lines;
  const lineName = cleanedDesc.substring(separatorIndex + separator.length);

  return { lineCode, lineName };
}

/**
 * Processes the 'trayectos' object from the API, grouping times by journey name.
 */
function processTrayectos(trayectos: ApiScheduleLine["trayectos"], now: Date): Journey[] {
  // Use reduce to group times by journey name
  const journeysMap = Object.entries(trayectos).reduce(
    (acc, [trayectoName, scheduleValue]) => {
      const cleanedTrayectoName = cleanAndNormalizeText(trayectoName);

      // 1. Get all arrival times for this specific trayecto entry
      let arrivalTimes: ScheduledTime[] = [];

      if (Array.isArray(scheduleValue)) {
        // Case 1: scheduleValue is an array of journey details
        arrivalTimes = scheduleValue.map((scheduleDetails) => ({
          isRealTime: scheduleDetails.real === "S",
          arrivalTime: parseArrivalTime(scheduleDetails, now),
        }));
      } else {
        // Case 2: scheduleValue is an object (Record<string, journeyDetail>)
        arrivalTimes = Object.values(scheduleValue).map((scheduleDetails) => ({
          isRealTime: scheduleDetails.real === "S",
          arrivalTime: parseArrivalTime(scheduleDetails, now),
        }));
      }

      // 2. Ensure the Journey object exists in the accumulator
      acc[cleanedTrayectoName] ??= {
        name: cleanedTrayectoName,
        scheduledTimes: [],
      };

      // 3. Add the new times to its list
      acc[cleanedTrayectoName].scheduledTimes.push(...arrivalTimes);
      return acc;
    },
    {} as Record<string, Journey>, // The accumulator is a map of string -> Journey
  );

  // 4. Convert the map to an array and sort the inner scheduledTimes
  const journeyList = Object.values(journeysMap);
  for (const journey of journeyList) {
    journey.scheduledTimes.sort(
      (a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime(),
    );
  }

  return journeyList;
}

// --- MAIN EXPORTED FUNCTION ---

/**
 * Fetches and processes stop schedule information from the Moventis API.
 */
export async function getStopSchedule(
  externalStopId: string,
  externalRouteId: string,
): Promise<Schedules | null> {
  try {
    // 1. Capture a single timestamp for all relative-time arithmetic
    const now = new Date();

    // 2. Fetch and validate data from the API
    const apiData = await fetchAndParseSchedules(
      externalStopId,
      externalRouteId,
    );

    // 3. Transform the raw API data into the clean, final structure
    const cleanedData = transformApiDataToSchedules(apiData, now);

    return cleanedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
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
