import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: [
    {
      command:
        "node ../backend/node_modules/tsx/dist/cli.mjs ../backend/src/server.ts",
      url: "http://127.0.0.1:8001/api/health",
      reuseExistingServer: false,
      env: {
        PORT: "8001",
        DATABASE_PATH: `../backend/data/e2e-${Date.now()}.sqlite`,
        ALLOWED_ORIGINS: "http://127.0.0.1:5174",
      },
    },
    {
      command: "npm run dev -- --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: "http://127.0.0.1:8001" },
    },
  ],
});
