import { defineConfig } from "vitest/config";

/**
 * Live contract suite: opt-in, network-dependent. Asserts only that the real
 * Moventis API still parses against our Zod schemas — never specific values, which
 * drift with time of day and stop/route churn. Run with `pnpm test:live`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.live.test.ts"],
    testTimeout: 20_000,
  },
});
