import { env } from "@/env";

/** The journey planner is mounted only when the build sets `NEXT_PUBLIC_DIRECTIONS_ENABLED=true`. */
export const DIRECTIONS_ENABLED = env.NEXT_PUBLIC_DIRECTIONS_ENABLED === "true";
