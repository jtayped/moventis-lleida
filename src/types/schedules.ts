export type Schedules = {
  externalLineId: number;
  lineCode: string;
  lineName: string;
  selected: boolean;
  journeys: {
    externalJourneyId: string;
    arrivalTime: Date;
    isRealTime: boolean;
  }[];
}[];
