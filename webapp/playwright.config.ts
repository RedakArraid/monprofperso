import { defineConfig } from "@playwright/test";

// The tests authenticate against the explicitly enabled local fixture API.
// Never point this suite at a customer environment.
export default defineConfig({
  testDir: "./visual-tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  globalTimeout: 180_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }], ["json", { outputFile: "test-results/visual-summary.json" }]],
  outputDir: "test-results/visual",
  use: {
    baseURL: "http://127.0.0.1:8095/espace/",
    browserName: "chromium",
    headless: true,
    locale: "fr-CI",
    timezoneId: "Africa/Abidjan",
    colorScheme: "light",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    viewport: { width: 390, height: 844 },
    actionTimeout: 7_000,
    navigationTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.MPP_CHROME_EXECUTABLE
      ? { executablePath: process.env.MPP_CHROME_EXECUTABLE }
      : {},
  },
  webServer: [
    {
      command: "MPP_VISUAL_FIXTURES=1 node ../scripts/visual/fixture-server.mjs",
      url: "http://127.0.0.1:8099/health",
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
    {
      command: "python3 -m http.server 8095 --bind 127.0.0.1 --directory ../web",
      url: "http://127.0.0.1:8095/espace/",
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
      stderr: "ignore", // Python otherwise logs every successful asset request.
    },
  ],
});
