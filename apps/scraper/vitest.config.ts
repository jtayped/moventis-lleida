import { defineConfig } from "vitest/config";

/**
 * Pure logic only — the scraper's I/O (Moventis fetches, Prisma writes) is
 * injected or mocked at the call site, so nothing here touches the network.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
  },
});
