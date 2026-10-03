import baseConfig from "@moventis/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  // tsconfig.json only includes `src`, so the type-checked rules have no
  // project for the vitest configs; they are a few lines of settings each.
  { ignores: ["vitest.config.ts", "vitest.live.config.ts"] },
];
