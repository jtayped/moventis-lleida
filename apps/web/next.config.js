/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import path from "path";
import { fileURLToPath } from "url";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots.js";

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
  // On a dynamic page Next streams the title, description and canonical into
  // `<body>` for every user agent outside this list. Its default list leaves
  // Googlebot out because Googlebot runs scripts, but Google ignores a
  // canonical in the body: it saw none on most of the stop and line pages and
  // indexed `/?stop=<id>` as a page of its own. Setting the option replaces
  // Next's list, so this extends it rather than starting over.
  htmlLimitedBots: new RegExp(
    `Googlebot|${HTML_LIMITED_BOT_UA_RE.source}`,
    "i",
  ),
  // Dev only. Its default corner is the desktop column's bottom bar.
  devIndicators: { position: "top-right" },
};

export default config;
