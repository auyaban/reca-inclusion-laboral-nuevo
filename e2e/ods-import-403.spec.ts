import { expect, test } from "@playwright/test";

// Estos tests verifican el gating sin auth: usan storageState vacío
// para que la cookie de E2E bypass no aplique.
test.describe("ODS Import 403", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("GET /hub/ods redirects without auth", async ({ page }) => {
    await page.goto("/hub/ods");
    const url = page.url();
    expect(url).not.toMatch(/\/hub\/ods$/);
  });

  test("POST /api/ods/importar returns 401 without auth", async ({ request }) => {
    const formData = new FormData();
    formData.append("actaIdOrUrl", "ABC12XYZ");

    const response = await request.post("/api/ods/importar", {
      multipart: formData,
    });

    expect(response.status()).toBe(401);
  });
});
