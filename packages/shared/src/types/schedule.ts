import type { Lines } from "./lines";

export interface Journey {
  name: string;
  scheduledTimes: {
    arrivalTime: Date;
    isRealTime: boolean;
  }[];
}

export interface Schedule {
  externalLineId: string;
  lineCode: Lines;
  lineName: string;
  selected: boolean;
  journeys: Journey[];
}

export type Schedules = Schedule[];
