import baseConfig from "@moventis/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  // tsconfig.json only includes `src`, so the type-checked rules have no
  // project for the vitest config; it is three lines of settings.
  { ignores: ["vitest.config.ts"] },
];
