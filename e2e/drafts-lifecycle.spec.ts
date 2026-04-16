import { expect, test } from "@playwright/test";
import {
  fillFieldAndWaitForDraftAutosave,
  getVisibleDraftSaveButton,
  openSeededForm,
  waitForDraftAutosave,
} from "./helpers/forms";

test("@integration seleccion saves and restores a local draft by session", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion", {
    sessionId: "e2e-seleccion-draft-restore",
  });

  await page
    .getByTestId("desarrollo_actividad")
    .fill("Actividad de prueba para restore E2E.");
  const initialSavedAt =
    (await page
      .locator('[data-testid="draft-persistence-status"]:visible')
      .getAttribute("data-local-saved-at")) ?? "";
  await getVisibleDraftSaveButton(page).click();
  await waitForDraftAutosave(page, { initialSavedAt });

  await page.reload();

  await expect(page.getByTestId("desarrollo_actividad")).toHaveValue(
    "Actividad de prueba para restore E2E."
  );
});

test("@integration seleccion keeps the current work context after draft restore", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion", {
    sessionId: "e2e-seleccion-context-restore",
  });

  await page.locator("#recommendations").scrollIntoViewIfNeeded();
  await fillFieldAndWaitForDraftAutosave(
    page,
    "ajustes_recomendaciones",
    "Contexto de trabajo que debe permanecer despues del restore."
  );

  const beforeReloadScrollY = await page.evaluate(() => window.scrollY);
  expect(beforeReloadScrollY).toBeGreaterThan(300);

  await page.reload();

  await expect(page.getByTestId("ajustes_recomendaciones")).toHaveValue(
    "Contexto de trabajo que debe permanecer despues del restore."
  );

  await expect(page.locator("#recommendations")).toBeInViewport();
});

test("@integration hub drawer exposes the saved draft", async ({ page }) => {
  await openSeededForm(page, "seleccion", {
    sessionId: "e2e-seleccion-draft-hub",
  });

  await fillFieldAndWaitForDraftAutosave(
    page,
    "desarrollo_actividad",
    "Draft visible en hub."
  );

  await page.goto("/hub");
  await page.getByTestId("hub-drafts-button").click();

  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  await expect(page.getByTestId("drafts-drawer")).toContainText(/selecci.n/i);
  await expect(page.getByTestId("drafts-drawer")).toContainText("ACME SAS");
});

test("@integration invalid submit does not leave seleccion finalization stuck", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion", {
    sessionId: "e2e-seleccion-invalid-submit",
  });

  await page.getByTestId("long-form-finalize-button").click();

  await expect(page.getByText("Revisa los campos resaltados")).toBeVisible();
  await expect(page.getByTestId("long-form-finalize-button")).toContainText(
    "Finalizar"
  );
  await expect(page.getByTestId("form-submit-confirm-dialog")).toHaveCount(0);
});

test("@integration contratacion keeps the current work context after draft restore", async ({
  page,
}) => {
  await openSeededForm(page, "contratacion", {
    sessionId: "e2e-contratacion-context-restore",
  });

  await page.locator("#recommendations").scrollIntoViewIfNeeded();
  await fillFieldAndWaitForDraftAutosave(
    page,
    "ajustes_recomendaciones",
    "Ajuste de contratación que debe quedar en contexto."
  );

  const beforeReloadScrollY = await page.evaluate(() => window.scrollY);
  expect(beforeReloadScrollY).toBeGreaterThan(300);

  await page.reload();

  await expect(page.getByTestId("ajustes_recomendaciones")).toHaveValue(
    "Ajuste de contratación que debe quedar en contexto."
  );

  const afterReloadScrollY = await page.evaluate(() => window.scrollY);
  expect(afterReloadScrollY).toBeGreaterThan(300);
});
