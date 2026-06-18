export type Lines = string;
export type Line = {
  id: string;
  externalId: string;
  name: string;
  code: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
