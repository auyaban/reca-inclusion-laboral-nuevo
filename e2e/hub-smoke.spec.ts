import { expect, test } from "@playwright/test";

test("@smoke root redirects the E2E session to the hub", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/hub$/);
});

test("@smoke hub shows the migrated forms enabled", async ({ page }) => {
  await page.goto("/hub");

  await expect(page.getByTestId("hub-form-card-presentacion")).toBeEnabled();
  await expect(page.getByTestId("hub-form-card-sensibilizacion")).toBeEnabled();
  await expect(
    page.getByTestId("hub-form-card-condiciones-vacante")
  ).toBeEnabled();
  await expect(page.getByTestId("hub-form-card-seleccion")).toBeEnabled();
  await expect(page.getByTestId("hub-form-card-contratacion")).toBeEnabled();
  await expect(
    page.getByTestId("hub-form-card-induccion-organizacional")
  ).toBeEnabled();
  await expect(
    page.getByTestId("hub-form-card-induccion-operativa")
  ).toBeEnabled();
  await expect(page.getByTestId("hub-form-card-evaluacion")).toBeDisabled();
});

test("@smoke hub opens and closes the drafts drawer", async ({ page }) => {
  await page.goto("/hub");

  await page.getByTestId("hub-drafts-button").click();
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();

  await page.getByTestId("drafts-drawer-close").click();
  await expect(page.getByTestId("drafts-drawer")).toHaveCount(0);
});

test("@smoke hub opens the drafts drawer from the query param", async ({
  page,
}) => {
  await page.goto("/hub?panel=drafts");

  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
});

test("@smoke hub drafts alias redirects with the drawer open", async ({
  page,
}) => {
  await page.goto("/hub/borradores");

  await expect(page).toHaveURL(/\/hub\?panel=drafts$/);
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
});
