import { defineConfig } from "vitest/config";

/**
 * Pure logic only — the scraper's I/O (Moventis fetches, Prisma writes) is
 * injected or mocked at the call site, so nothing here touches the network.
 * Live tests (`*.live.test.ts`) hit the real Moventis API and run separately
 * via `pnpm test:live` / vitest.live.config.ts.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "src/**/*.live.test.ts"],
  },
});
