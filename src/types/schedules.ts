import type { Lines } from "./lines";

export type Journey = {
  name: string;
  scheduledTimes: {
    arrivalTime: Date;
    isRealTime: boolean;
  }[];
};

export type Schedules = {
  externalLineId: number;
  lineCode: Lines;
  lineName: string;
  selected: boolean;
  journeys: Journey[];
}[];
