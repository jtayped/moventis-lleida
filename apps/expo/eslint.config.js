import expoConfig from "@moventis/eslint-config/expo";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...expoConfig,
  {
    ignores: [".expo/**", "dist/**", "node_modules/**"],
  },
];
