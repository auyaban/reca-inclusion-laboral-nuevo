import { expect, test } from "@playwright/test";
import { mockFailedFinalization, mockSuccessfulFinalization } from "./helpers/finalization";
import { openSeededForm } from "./helpers/forms";

test("@publish seleccion shows the success state with a mocked finalization response", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");
  await mockSuccessfulFinalization(page, "seleccion");

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
  await expect(page.getByText("Ver acta en Google Sheets")).toBeVisible();
  await expect(page.getByText("Ver PDF en Drive")).toBeVisible();
});

test("@publish contratacion shows the success state with a mocked finalization response", async ({
  page,
}) => {
  await openSeededForm(page, "contratacion");
  await mockSuccessfulFinalization(page, "contratacion");

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
  await expect(page.getByText("Ver acta en Google Sheets")).toBeVisible();
  await expect(page.getByText("Ver PDF en Drive")).toBeVisible();
});

test("@publish seleccion keeps the editor open when mocked finalization fails", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");
  await mockFailedFinalization(page, "seleccion");

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(page.getByTestId("long-form-success-state")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Publicación interrumpida")).toBeVisible();
  await expect(
    dialog.getByText("No se pudo publicar el acta de prueba.")
  ).toBeVisible();
  await expect(page.getByTestId("form-submit-confirm-accept")).toContainText(
    "Reintentar"
  );
  await page.getByTestId("form-submit-confirm-cancel").click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("long-form-finalization-feedback")).toBeVisible();
  await expect(
    page
      .getByTestId("long-form-finalization-feedback")
      .getByText("No se pudo publicar el acta de prueba.")
  ).toBeVisible();
});
