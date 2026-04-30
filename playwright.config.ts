import { defineConfig, devices } from "@playwright/test";

process.env.E2E_AUTH_BYPASS ??= "1";
process.env.E2E_AUTH_BYPASS_ROLES ??= "ods_operador";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  globalSetup: "./e2e/setup/auth.setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    storageState: ".playwright/.auth/user.json",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "no-role",
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined,
      },
      testIgnore: [],
    },
  ],
  webServer: {
    command: "cross-env E2E_AUTH_BYPASS=1 E2E_AUTH_BYPASS_ROLES=ods_operador npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
