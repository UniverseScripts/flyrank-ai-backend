import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/smoke",
  // Refuses to run against a hand-started server wired to a real provider.
  globalSetup: "./tests/smoke/global-setup.ts",
  // Serial: the suite drives one shared app, one Dev Server and one saved graph.
  workers: 1,
  timeout: 60_000,
  // Real Chrome, not the bundled Chromium headless shell: pointer-driven
  // interactions like drag-to-connect should be exercised in the browser
  // people actually use. Add --headed to watch it.
  use: { ...devices["Desktop Chrome"], channel: "chrome", baseURL: BASE_URL },
  webServer: [
    {
      command: "npm run dev",
      url: `${BASE_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // Stub the model so smoke runs need no provider and spend no credits.
      env: { LLM_STUB: "1" },
    },
    {
      // A real Dev Server, so the run genuinely travels through Inngest rather
      // than a stand-in for it.
      command: `npx --yes inngest-cli@latest dev -u ${BASE_URL}/api/inngest --no-discovery`,
      url: "http://localhost:8288",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
