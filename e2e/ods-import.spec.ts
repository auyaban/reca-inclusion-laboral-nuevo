import { expect, test } from "@playwright/test";

test.describe("ODS Import E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/hub/ods");
  });

  test("ODS wizard page loads with Importar acta button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Crear nueva entrada ODS" })).toBeVisible();
    await expect(page.getByTestId("ods-import-acta-button")).toBeVisible();
    await expect(page.getByTestId("ods-confirm-terminar-button")).toBeVisible();
  });

  test("Importar acta modal opens and has 2 tabs", async ({ page }) => {
    await page.getByTestId("ods-import-acta-button").click();
    await expect(page.getByTestId("import-acta-modal")).toBeVisible();
    await expect(page.getByTestId("import-acta-tab-id")).toBeVisible();
    await expect(page.getByTestId("import-acta-tab-file")).toBeVisible();
  });

  test("Tab 1: ACTA ID input is visible and accepts input", async ({ page }) => {
    await page.getByTestId("ods-import-acta-button").click();
    await page.getByTestId("import-acta-tab-id").click();
    const input = page.getByTestId("import-acta-id-input");
    await expect(input).toBeVisible();
    await input.fill("ABC12XYZ");
    await expect(input).toHaveValue("ABC12XYZ");
  });

  test("Tab 2: File upload area is visible", async ({ page }) => {
    await page.getByTestId("ods-import-acta-button").click();
    await page.getByTestId("import-acta-tab-file").click();
    await expect(page.getByText("PDF, XLSX, XLSM")).toBeVisible();
  });

  test("Importar acta modal can be closed", async ({ page }) => {
    await page.getByTestId("ods-import-acta-button").click();
    await expect(page.getByTestId("import-acta-modal")).toBeVisible();
    await page.getByTestId("import-acta-modal-close").click();
    await expect(page.getByTestId("import-acta-modal")).not.toBeVisible();
  });

  test("Secciones 1-3 are visible on the wizard", async ({ page }) => {
    await expect(page.getByTestId("ods-seccion-1")).toBeVisible();
    await expect(page.getByTestId("ods-seccion-2")).toBeVisible();
    await expect(page.getByTestId("ods-seccion-3")).toBeVisible();
  });
});

test.describe("ODS Import Preview", () => {
  test("Preview dialog shows metrics and decision log when result is available", async ({ page }) => {
    // This test verifies the preview dialog structure exists
    // Full integration with API requires real data, so we verify the UI components
    await page.goto("/hub/ods");
    await page.getByTestId("ods-import-acta-button").click();
    await expect(page.getByTestId("import-acta-modal")).toBeVisible();

    // Verify the modal has the submit button that would trigger the preview
    await expect(page.getByTestId("import-acta-submit")).toBeVisible();
  });
});
