import type { LINES } from "../constants/lines";

export type Lines = (typeof LINES)[number];
export type Line = {
  id: string;
  externalId: string;
  name: string;
  code: Lines;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
