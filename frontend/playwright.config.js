import { defineConfig } from "@playwright/test";

const PORT = process.env.E2E_PORT || 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/terms`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
