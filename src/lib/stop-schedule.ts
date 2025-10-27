import type { Lines } from "@/types/lines";
import type { Schedules } from "@/types/schedules";
import { apiScheduleSchema, type scheduleSchema } from "@/validators/schedule";
import axios, { AxiosError } from "axios";
import { z } from "zod";

type ApiSchedule = z.infer<typeof scheduleSchema>;

const realTimeRegex = /(?:(\d+)\s*h\s*)?(\d+)\s*min\s*(\d+)\s*s/;

/**
 * Parses the API's schedule object into a standard Date object.
 */
function parseArrivalTime(scheduleDetails: ApiSchedule): Date {
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
    const timeParts = scheduleDetails.hora.split(":");
    const hours = parseInt(timeParts[0] ?? "0", 10);
    const minutes = parseInt(timeParts[1] ?? "0", 10);

    if (isNaN(hours) || isNaN(minutes)) {
      console.warn("Could not parse scheduled time:", scheduleDetails.hora);
      return now;
    }

    const arrivalDate = new Date();
    arrivalDate.setHours(hours, minutes, 0, 0);

    if (arrivalDate < now) {
      arrivalDate.setDate(arrivalDate.getDate() + 1);
    }
    return arrivalDate;
  }
}

export async function getStopSchedule(
  externalStopId: string,
  externalRouteId: string,
): Promise<Schedules | null> {
  try {
    const res = await axios.get(
      `https://www.moventis.es/api/json/GetTiemposParada/es/${externalStopId}/${externalRouteId}/0`,
    );

    if (res.status !== 200) {
      throw new AxiosError(
        "The schedule API returned a non-200 status.",
        res.status.toString(),
      );
    }

    const data = apiScheduleSchema.parse(res.data);

    const cleanedData: Schedules = data.map((line) => {
      const cleanedDesc = line.desc_linea
        .toLowerCase()
        .replace(/\s*-\s*/g, " - ")
        .replace(/\s*\/\s*/g, " / ");

      let lineCode: Lines;
      let lineName: string;

      const separator = " - ";
      const separatorIndex = cleanedDesc.indexOf(separator);

      if (separatorIndex !== -1) {
        lineCode = cleanedDesc.substring(0, separatorIndex) as Lines;
        lineName = cleanedDesc.substring(separatorIndex + separator.length);
      } else {
        throw new Error("Line not defined.");
      }

      const journeys = Object.values(line.trayectos).flatMap(
        (scheduleValue, index) => {
          if (Array.isArray(scheduleValue)) {
            return scheduleValue.map((scheduleDetails, journeyIndex) => {
              return {
                externalJourneyId: `${line.idLinea}-${index}-${journeyIndex}`,
                isRealTime: scheduleDetails.real === "S",
                arrivalTime: parseArrivalTime(scheduleDetails),
              };
            });
          }

          return Object.entries(scheduleValue).map(
            ([arrivalId, scheduleDetails]) => {
              return {
                externalJourneyId: arrivalId,
                isRealTime: scheduleDetails.real === "S",
                arrivalTime: parseArrivalTime(scheduleDetails),
              };
            },
          );
        },
      );

      journeys.sort(
        (a, b) => a.arrivalTime.getTime() - b.arrivalTime.getTime(),
      );

      return {
        externalLineId: line.idLinea,
        lineCode: lineCode,
        lineName: lineName,
        selected: line.selected === 1,
        journeys: journeys,
      };
    });

    return cleanedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation failed:", error.issues);
    } else if (error instanceof AxiosError) {
      console.error(`Axios error fetching schedule: ${error.message}`);
    } else {
      console.error("An unexpected error occurred:", error);
    }
    return null;
  }
}
