import type { Lines } from "./lines";

export type Schedules = {
  externalLineId: number;
  lineCode: Lines;
  lineName: string;
  selected: boolean;
  journeys: {
    externalJourneyId: string;
    arrivalTime: Date;
    isRealTime: boolean;
  }[];
}[];
