import type { Lines } from "@/types/lines";

export const LINES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "20",
] as const;

export const LINE_COLORS: Record<Lines, string> = {
  "1": "#FFFF18",
  "2": "#FF134A",
  "3": "#FF5F28",
  "4": "#1571FD",
  "5": "#088F1A",
  "6": "#08508A",
  "7": "#099496",
  "8": "#FF84FF",
  "9": "#00080B",
  "10": "#892D00",
  "20": "#0A8FA9",
};
