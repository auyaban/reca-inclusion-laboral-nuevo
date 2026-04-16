import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { E2E_AUTH_BYPASS_COOKIE } from "../../src/lib/auth/e2eBypass";

const AUTH_FILE = ".playwright/.auth/user.json";

export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: config.projects[0]?.use?.baseURL,
  });

  await context.addCookies([
    {
      name: E2E_AUTH_BYPASS_COOKIE,
      value: "1",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);

  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  await context.close();
  await browser.close();
}
