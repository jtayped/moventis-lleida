import baseConfig from "./base.js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    // Apply these rules only to React/React Native files
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        React: "readonly",
        // React Native specific globals
        console: "readonly",
        exports: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      // Add any React Native specific rules here
      // e.g., "react-native/no-unused-styles": "warn" (if you install eslint-plugin-react-native)
    },
  },
];
