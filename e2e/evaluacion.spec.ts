import { expect, test, type Page } from "@playwright/test";
import { openSeededForm, waitForDraftAutosave } from "./helpers/forms";

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

async function getVisibleLocalSavedAt(page: Page) {
  return (
    (await page
      .locator('[data-testid="draft-persistence-status"]:visible')
      .first()
      .getAttribute("data-local-saved-at")) ?? ""
  );
}
test("@smoke evaluacion exposes the long-form shell and finalize action", async ({
  page,
}) => {
  await openSeededForm(page, "evaluacion", {
    sessionId: "evaluacion-shell",
    waitForPersistedIdentity: false,
  });

  await expect(page.getByTestId("long-form-root")).toBeVisible();
  await expect(page.getByTestId("long-form-title")).toContainText(/Evaluaci.n/i);
  await expect(page.getByTestId("long-form-finalize-button")).toBeEnabled();
});

test("@smoke evaluacion exposes the manual test fill action in preview-style environments", async ({
  page,
}) => {
  await openSeededForm(page, "evaluacion", {
    sessionId: "evaluacion-manual-test-fill",
    waitForPersistedIdentity: false,
  });

  const initialSavedAt = await getVisibleLocalSavedAt(page);
  await expect(page.getByTestId("manual-test-fill-button")).toBeVisible();
  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page, { initialSavedAt });

  await expect(page.getByTestId("section_4.nivel_accesibilidad")).not.toHaveValue(
    ""
  );
  await expect(page.getByTestId("long-form-finalize-button")).toBeEnabled();
});

test("@smoke evaluacion uses a productive section 5 and enables finalization after completion", async ({
  page,
}) => {
  await openSeededForm(page, "evaluacion", {
    sessionId: "evaluacion-f4-section5",
    waitForPersistedIdentity: false,
  });

  await page
    .getByRole("button", { name: /5\. Ajustes razonables/i })
    .first()
    .click();
  await page
    .getByTestId("section_5.discapacidad_fisica.aplica")
    .selectOption("Aplica");
  await expect(page.getByTestId("section_5.discapacidad_fisica.aplica")).toHaveValue(
    "Aplica"
  );
  await expect(page.getByTestId("section_5.discapacidad_fisica.nota")).toBeVisible();
  await expect(
    page.getByTestId("section_5.discapacidad_fisica.ajustes")
  ).toBeVisible();

  const initialSavedAt = await getVisibleLocalSavedAt(page);
  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page, { initialSavedAt });

  await expect(page.getByTestId("long-form-finalize-button")).toBeEnabled();
});

test("@smoke evaluacion preserves a manual section 4 override across autosave and reload", async ({
  page,
}) => {
  const sessionId = "evaluacion-section4-override";

  await openSeededForm(page, "evaluacion", {
    sessionId,
    waitForPersistedIdentity: false,
  });

  const initialSavedAt = await getVisibleLocalSavedAt(page);
  await page
    .getByTestId("section_2_1.transporte_publico.accesible")
    .selectOption("Si");
  await page
    .getByTestId("section_2_1.transporte_publico.observaciones")
    .fill("Ruta principal accesible");
  await expect(page.getByTestId("section_4.nivel_accesibilidad")).toHaveValue(
    "Alto"
  );

  await page.getByTestId("section_4.nivel_accesibilidad").selectOption("Bajo");
  await expect(page.getByTestId("section_4.descripcion")).toHaveValue(
    /bajo nivel/i
  );

  await page.getByTestId("section_2_1.rutas_pcd.accesible").selectOption("Si");
  await page
    .getByTestId("section_2_1.rutas_pcd.observaciones")
    .fill("La empresa dispone de rutas para vinculados.");
  await expect(page.getByTestId("evaluacion-section-4-suggestion")).toContainText(
    "Alto"
  );
  await expect(page.getByTestId("section_4.nivel_accesibilidad")).toHaveValue(
    "Bajo"
  );

  await waitForDraftAutosave(page, { initialSavedAt });

  await page.goto(`/formularios/evaluacion?session=${sessionId}`);
  await expect(page.getByTestId("section_4.nivel_accesibilidad")).toHaveValue(
    "Bajo"
  );
  await expect(page.getByTestId("section_4.descripcion")).toHaveValue(
    /bajo nivel/i
  );
});

test("@smoke evaluacion keeps the viewport after autosave on blur", async ({
  page,
}) => {
  const sessionId = `evaluacion-scroll-${Date.now()}`;

  await openSeededForm(page, "evaluacion", {
    sessionId,
    waitForPersistedIdentity: false,
  });

  await page.locator("#section_7").scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const initialSavedAt = await getVisibleLocalSavedAt(page);

  await page.getByTestId("cargos_compatibles").fill("Analista de soporte");
  await page.getByTestId("cargos_compatibles").blur();

  await waitForDraftAutosave(page, { initialSavedAt });

  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(scrollAfter).toBeGreaterThan(scrollBefore - 250);
  await expect(page.locator("#section_7")).toBeInViewport();
});

test("@smoke evaluacion keeps observaciones_generales optional", async ({
  page,
}) => {
  await openSeededForm(page, "evaluacion", {
    sessionId: `evaluacion-observaciones-opcionales-${Date.now()}`,
    waitForPersistedIdentity: false,
  });

  let initialSavedAt = await getVisibleLocalSavedAt(page);
  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page, { initialSavedAt });

  initialSavedAt = await getVisibleLocalSavedAt(page);
  await page.getByTestId("observaciones_generales").fill("");
  await page.getByTestId("observaciones_generales").blur();
  await waitForDraftAutosave(page, { initialSavedAt });

  await expect(page.getByTestId("long-form-finalize-button")).toBeEnabled();
});

test("@smoke evaluacion finalizes with sheet-only success state", async ({
  page,
}) => {
  const sessionId = `evaluacion-f4-finalize-${Date.now()}`;

  await page.route("**/api/formularios/evaluacion", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        sheetLink: "https://docs.google.com/spreadsheets/d/demo/edit",
      }),
    });
  });

  await openSeededForm(page, "evaluacion", {
    sessionId,
    waitForPersistedIdentity: false,
  });

  const initialSavedAt = await getVisibleLocalSavedAt(page);
  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page, { initialSavedAt });
  await expect(page.getByTestId("long-form-finalize-button")).toBeEnabled();

  await page.getByTestId("long-form-finalize-button").click();
  await expect(page.getByTestId("form-submit-confirm-dialog")).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(page.getByTestId("long-form-success-state")).toBeVisible();
  await expect(page.getByText(/fue registrada correctamente/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ver acta en Google Sheets/i })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ver PDF en Drive/i })
  ).toHaveCount(0);
});

test("@smoke evaluacion is exposed in the hub after F5", async ({ page }) => {
  await page.goto("/hub");

  await expect(page.getByTestId("hub-form-card-evaluacion")).toBeEnabled();
});
