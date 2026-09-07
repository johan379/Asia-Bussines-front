import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.js",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || "test-results-e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-e2e" }]],
  use: {
    baseURL: process.env.APP_URL || "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Sirve el build final: evita recargas de HMR durante la primera navegacion E2E.
    command: "npm.cmd run build && npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 45_000,
  },
});
