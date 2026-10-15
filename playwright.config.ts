import { defineConfig, devices } from "@playwright/test";

// Voraussetzung: `pnpm build`. Optional CHROMIUM_PATH für ein vorinstalliertes Chromium.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8788",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://localhost:8788/de",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
