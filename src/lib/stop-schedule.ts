// src/services/busService.ts

import { scheduleResponseValidator } from "@/validators/schedule";
import axios, { AxiosError } from "axios";
import { z } from "zod";

export async function getStopSchedule(
  externalStopId: string,
  externalRouteId: string,
): Promise<z.infer<typeof scheduleResponseValidator> | null> {
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

    const cleanedData = scheduleResponseValidator.parse(res.data);

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
