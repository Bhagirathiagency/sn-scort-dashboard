import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke tests run against a real Supabase project — see e2e/README.md
 * for what account/data they assume. Not run in CI yet (no CI-scoped
 * Supabase project exists); run locally with `npm run test:e2e` while
 * `npm run dev` is up against a project seeded per e2e/README.md.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
        },
      },
    },
  ],
});
