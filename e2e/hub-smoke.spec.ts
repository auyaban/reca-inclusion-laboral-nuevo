import { expect, test } from "@playwright/test";

test("hub shows seleccion and contratacion enabled", async ({ page }) => {
  await page.goto("/hub");

  await expect(page.getByTestId("hub-form-card-seleccion")).toBeEnabled();
  await expect(page.getByTestId("hub-form-card-contratacion")).toBeEnabled();
  await expect(page.getByTestId("hub-form-card-evaluacion")).toBeDisabled();
});
