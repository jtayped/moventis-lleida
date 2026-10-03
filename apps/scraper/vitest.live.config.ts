import { defineConfig } from "vitest/config";

/**
 * Live contract suite: opt-in, network-dependent. Asserts only that the real
 * Moventis feeds still parse through the scraper's Zod schemas, never specific
 * values, which change with the timetable. Run with `pnpm test:live`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.live.test.ts"],
    testTimeout: 30_000,
  },
});
