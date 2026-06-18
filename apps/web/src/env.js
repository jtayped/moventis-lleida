import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Load root .env on the server only. Dynamic imports prevent these Node.js modules
// from appearing in the client bundle (fileURLToPath has no browser equivalent).
// process.cwd() is apps/web/ when Turborepo runs the task, so ../../.env is the root.
if (typeof window === "undefined") {
  try {
    const dotenv = await import("dotenv");
    const path = await import("path");
    dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), override: false });
  } catch {
    // ignore missing dotenv in production environments
  }
}

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_MAPS_API_KEY: z.string(),
    NEXT_PUBLIC_MAPS_MAP_ID: z.string().optional().default(""),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_MAPS_API_KEY: process.env.NEXT_PUBLIC_MAPS_API_KEY,
    NEXT_PUBLIC_MAPS_MAP_ID: process.env.NEXT_PUBLIC_MAPS_MAP_ID,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
