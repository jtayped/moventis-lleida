import { defineConfig } from "vitest/config";

/**
 * Default suite: deterministic logic + mocked-I/O tests only. Live tests
 * (`*.live.test.ts`) hit the real Moventis API and are non-deterministic, so they
 * are excluded here and run separately via `pnpm test:live` / vitest.live.config.ts.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "src/**/*.live.test.ts"],
  },
});
