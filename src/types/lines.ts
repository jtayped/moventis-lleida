import type { LINES } from "@/constants/lines";
import type { Route } from "@prisma/client";

export type Lines = (typeof LINES)[number];
export type Line = Omit<Route, "code"> & { code: Lines };
