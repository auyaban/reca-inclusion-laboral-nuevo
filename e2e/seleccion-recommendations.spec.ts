import { expect, type Locator, test } from "@playwright/test";
import { openSeededForm } from "./helpers/forms";

async function clickRecommendationAction(locator: Locator) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.click({ force: attempt > 0 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await locator.page().waitForTimeout(150);
    }
  }
}

async function selectStableOption(locator: Locator, value: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.selectOption(value);
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await locator.page().waitForTimeout(150);
    }
  }
}

test("@integration seleccion groups legacy helpers and inserts a helper block", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");

  await expect(
    page.getByTestId("seleccion-recommendations-helpers")
  ).toBeVisible();
  await expect(
    page.getByTestId("seleccion-helper-category-base_process")
  ).toBeVisible();
  await expect(
    page.getByTestId("seleccion-helper-preparacion_proceso")
  ).toBeVisible();

  await clickRecommendationAction(
    page.getByTestId("seleccion-helper-preparacion_proceso-add")
  );

  await expect(page.getByTestId("ajustes_recomendaciones")).toHaveValue(
    /Contactar a la agencia de empleo/
  );
  await expect(page.getByTestId("ajustes_recomendaciones")).toHaveValue(
    /Promover la aplicacion de formatos para la hoja de vida/
  );
});

test("@integration seleccion reveals helper content before inserting it", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");

  const helperCard = page.getByTestId("seleccion-helper-preparacion_proceso");
  await expect(helperCard).toBeVisible();

  await clickRecommendationAction(
    page.getByTestId("seleccion-helper-preparacion_proceso-details-toggle")
  );

  await expect(
    page.getByTestId("seleccion-helper-preparacion_proceso-details-panel")
  ).toContainText(/Apoyo de la agencia de empleo/i);
  await expect(
    page.getByTestId("seleccion-helper-preparacion_proceso-details-panel")
  ).toContainText(/Usar formatos de hoja de vida sencillos/i);
});

test("@integration seleccion suggests adjustment statements based on detected disability", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");

  await selectStableOption(
    page.getByTestId("oferentes.0.discapacidad"),
    "Discapacidad auditiva"
  );

  await expect(
    page.getByTestId("seleccion-detected-profile-auditiva")
  ).toBeVisible();
  await expect(
    page.getByTestId(
      "seleccion-profile-adjustments-category-interview_accessibility"
    )
  ).toBeVisible();

  await clickRecommendationAction(
    page.getByTestId(
      "seleccion-profile-adjustments-professional_sign_interpreter-add"
    )
  );

  await expect(page.getByTestId("ajustes_recomendaciones")).toHaveValue(
    /servicio de interpretacion profesional/i
  );
});

test("@integration seleccion adds universal adjustment suggestions in batch without duplicating helper content", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");

  await clickRecommendationAction(
    page.getByTestId("seleccion-helper-trato_respetuoso-add")
  );

  const textarea = page.getByTestId("ajustes_recomendaciones");
  const helperSnapshot = await textarea.inputValue();

  await clickRecommendationAction(
    page.getByTestId("seleccion-universal-adjustments-add-all")
  );

  const nextValue = await textarea.inputValue();

  expect(nextValue).toContain("Evitar en el proceso de entrevista preguntar");
  expect(nextValue).toContain(
    "La evaluacion de desempeno debe ajustarse de acuerdo al perfil del cargo"
  );
  expect(nextValue.length).toBeGreaterThanOrEqual(helperSnapshot.length);
  expect(
    nextValue.match(/Evitar en el proceso de entrevista preguntar/g)?.length
  ).toBe(1);
});

test("@integration seleccion merges multi-profile suggestions without duplicating statements", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");

  await selectStableOption(
    page.getByTestId("oferentes.0.discapacidad"),
    "Discapacidad auditiva"
  );
  await clickRecommendationAction(page.getByTestId("oferentes-add-button"));
  await expect(page.getByTestId("oferentes.1.card")).toBeVisible();
  await selectStableOption(
    page.getByTestId("oferentes.1.discapacidad"),
    "Discapacidad visual baja vision"
  );

  await expect(
    page.getByTestId("seleccion-detected-profile-auditiva")
  ).toBeVisible();
  await expect(
    page.getByTestId("seleccion-detected-profile-visual")
  ).toBeVisible();

  await clickRecommendationAction(
    page.getByTestId("seleccion-profile-adjustments-add-all")
  );

  const nextValue = await page.getByTestId("ajustes_recomendaciones").inputValue();
  expect(nextValue).toContain("servicio de interpretacion profesional");
  expect(nextValue).toContain(
    "La aplicacion de pruebas de tipo visual y grafico"
  );
  expect(
    nextValue.match(/servicio de interpretacion profesional/gi)?.length
  ).toBe(1);
});
