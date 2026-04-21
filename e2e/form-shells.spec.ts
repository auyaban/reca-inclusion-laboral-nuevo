import { expect, test } from "@playwright/test";
import { openSeededForm } from "./helpers/forms";

test("@smoke presentacion opens its long-form shell", async ({ page }) => {
  await openSeededForm(page, "presentacion");
  await expect(page.getByTestId("long-form-root")).toBeVisible();
  await expect(page.getByTestId("long-form-title")).toContainText(/Presentaci.n/i);
});

test("@smoke sensibilizacion opens its long-form shell", async ({ page }) => {
  await openSeededForm(page, "sensibilizacion");

  await expect(page.getByTestId("long-form-root")).toBeVisible();
  await expect(page.getByTestId("long-form-title")).toContainText(/Sensibilizaci.n/i);
});

test("@smoke evaluacion opens its long-form shell", async ({ page }) => {
  await openSeededForm(page, "evaluacion", {
    sessionId: "evaluacion-form-shell",
    waitForPersistedIdentity: false,
  });

  await expect(page.getByTestId("long-form-root")).toBeVisible();
  await expect(page.getByTestId("long-form-title")).toContainText(/Evaluaci.n/i);
});

test("@smoke condiciones vacante opens its long-form shell", async ({ page }) => {
  await openSeededForm(page, "condiciones-vacante");

  await expect(page.getByTestId("long-form-root")).toBeVisible();
  await expect(page.getByTestId("long-form-title")).toContainText(
    "Condiciones"
  );
});
