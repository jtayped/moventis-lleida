import type { Lines } from "@/types/lines";
import type { Journey, Schedules } from "@/types/schedules";
import { apiScheduleSchema, type scheduleSchema } from "@/validators/schedule";
import axios, { AxiosError } from "axios";
import { z } from "zod";

// --- TYPE DEFINITIONS ---

/** A single journey detail from the API */
type ApiJourneyDetail = z.infer<typeof scheduleSchema>;
/** A single line (with all its trayectos) from the API response array */
type ApiScheduleLine = z.infer<typeof apiScheduleSchema>[number];

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
 */
function parseArrivalTime(scheduleDetails: ApiJourneyDetail): Date {
  const now = new Date();

  if (scheduleDetails.real === "S") {
    // REAL-TIME:
    const parts = realTimeRegex.exec(scheduleDetails.minutos);

    if (parts) {
      const hours = parseInt(parts[1] ?? "0", 10);
      const minutes = parseInt(parts[2] ?? "0", 10);
      const seconds = parseInt(parts[3] ?? "0", 10);

      const arrivalDate = new Date(now.getTime());
      arrivalDate.setHours(now.getHours() + hours);
      arrivalDate.setMinutes(now.getMinutes() + minutes);
      arrivalDate.setSeconds(now.getSeconds() + seconds);
      return arrivalDate;
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

    const arrivalDate = new Date();
    arrivalDate.setHours(hours, minutes, 0, 0);

    // Handle "day wrap" (e.g., if it's 11 PM and the schedule shows 1 AM)
    if (arrivalDate < now) {
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

  if (res.status !== 200) {
    throw new AxiosError(
      "The schedule API returned a non-200 status.",
      res.status.toString(),
    );
  }

  // Parse and validate the entire API response
  return apiScheduleSchema.parse(res.data);
}

/**
 * Transforms the raw API data array into the clean Schedules type.
 */
function transformApiDataToSchedules(data: ApiScheduleLine[]): Schedules {
  return data.map(processApiLine);
}

/**
 * Processes a single line from the API response.
 */
function processApiLine(line: ApiScheduleLine): Schedules[number] {
  // 1. Parse the line description
  const { lineCode, lineName } = parseLineDescription(line.desc_linea);

  // 2. Process and group all journeys for this line
  const journeys = processTrayectos(line.trayectos);

  // 3. Sort the final list of grouped journeys alphabetically by name
  journeys.sort((a, b) => a.name.localeCompare(b.name));

  // 4. Construct the final clean object for this line
  return {
    externalLineId: line.idLinea,
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
function processTrayectos(trayectos: ApiScheduleLine["trayectos"]): Journey[] {
  // Use reduce to group times by journey name
  const journeysMap = Object.entries(trayectos).reduce(
    (acc, [trayectoName, scheduleValue]) => {
      const cleanedTrayectoName = cleanAndNormalizeText(trayectoName);

      // 1. Get all arrival times for this specific trayecto entry
      type ScheduledTime = { arrivalTime: Date; isRealTime: boolean };
      let arrivalTimes: ScheduledTime[] = [];

      if (Array.isArray(scheduleValue)) {
        // Case 1: scheduleValue is an array of journey details
        arrivalTimes = scheduleValue.map((scheduleDetails) => ({
          isRealTime: scheduleDetails.real === "S",
          arrivalTime: parseArrivalTime(scheduleDetails),
        }));
      } else {
        // Case 2: scheduleValue is an object (Record<string, journeyDetail>)
        arrivalTimes = Object.values(scheduleValue).map((scheduleDetails) => ({
          isRealTime: scheduleDetails.real === "S",
          arrivalTime: parseArrivalTime(scheduleDetails),
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

/**
 * Centralized error handler.
 */
function handleError(error: unknown): void {
  if (error instanceof z.ZodError) {
    console.error("Zod validation failed:", error.issues);
  } else if (error instanceof AxiosError) {
    console.error(`Axios error fetching schedule: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`An unexpected error occurred: ${error.message}`);
  } else {
    console.error("An unknown and unexpected error occurred:", error);
  }
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
    // 1. Fetch and validate data from the API
    const apiData = await fetchAndParseSchedules(
      externalStopId,
      externalRouteId,
    );

    // 2. Transform the raw API data into the clean, final structure
    const cleanedData = transformApiDataToSchedules(apiData);

    console.log(cleanedData[0]?.journeys);
    return cleanedData;
  } catch (error) {
    // 3. Handle any errors that occurred during the process
    handleError(error);
    return null;
  }
}
