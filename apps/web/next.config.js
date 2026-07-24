/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  // The Docker build prunes the monorepo via `turbo prune --docker`, which strips the
  // root pnpm-lock.yaml out of the build stage — Next can't auto-detect the workspace
  // root without it, so output file tracing silently drops all external node_modules
  // from the standalone build. Point it at the monorepo root explicitly instead.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@moventis/api", "@moventis/db"],
};

export default config;
