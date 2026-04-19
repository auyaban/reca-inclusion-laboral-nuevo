import { expect, test, type Page } from "@playwright/test";
import { openSeededForm, waitForDraftAutosave } from "./helpers/forms";

async function completeEvaluacionForm(page: Page) {
  await page.evaluate(() => {
    const setElementValue = (
      element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
      value: string
    ) => {
      const prototype =
        element instanceof HTMLInputElement
          ? HTMLInputElement.prototype
          : element instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLTextAreaElement.prototype;

      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      descriptor?.set?.call(element, value);
    };

    const dispatchTextValue = (
      element: HTMLInputElement | HTMLTextAreaElement,
      value: string
    ) => {
      setElementValue(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    };

    const dispatchSelectValue = (element: HTMLSelectElement, value: string) => {
      setElementValue(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    };

    Array.from(
      document.querySelectorAll<HTMLSelectElement>("select[data-testid]")
    ).forEach((select) => {
      if (select.disabled) {
        return;
      }

      const nextOption = Array.from(select.options).find(
        (option) => option.value !== "" && !option.disabled
      );
      if (!nextOption) {
        return;
      }

      dispatchSelectValue(select, nextOption.value);
    });

    Array.from(
      document.querySelectorAll<HTMLTextAreaElement>("textarea[data-testid]")
    ).forEach((textarea, index) => {
      if (textarea.disabled || textarea.readOnly) {
        return;
      }

      dispatchTextValue(textarea, `Texto de prueba ${index + 1}`);
    });

    const firstCargo = document.querySelector<HTMLInputElement>(
      'input[id="asistentes.0.cargo"]'
    );
    if (firstCargo) {
      dispatchTextValue(firstCargo, "Profesional RECA");
    }

    const attendeeName = document.querySelector<HTMLInputElement>(
      'input[id="asistentes.1.nombre"]'
    );
    if (attendeeName) {
      dispatchTextValue(attendeeName, "Invitado QA");
    }

    const attendeeCargo = document.querySelector<HTMLInputElement>(
      'input[id="asistentes.1.cargo"]'
    );
    if (attendeeCargo) {
      dispatchTextValue(attendeeCargo, "Analista");
    }

    const advisorName = document.querySelector<HTMLInputElement>(
      'input[placeholder="Nombre del asesor agencia..."]'
    );
    if (advisorName) {
      dispatchTextValue(advisorName, "Asesor QA");
    }
  });
}

test("@smoke evaluacion exposes the long-form shell with finalization disabled until complete", async ({
  page,
}) => {
  await openSeededForm(page, "evaluacion", {
    sessionId: "evaluacion-shell",
    waitForPersistedIdentity: false,
  });

  await expect(page.getByTestId("long-form-root")).toBeVisible();
  await expect(page.getByTestId("long-form-title")).toContainText(/Evaluaci.n/i);
  await expect(page.getByTestId("long-form-finalize-button")).toBeDisabled();
});

test("@smoke evaluacion exposes the manual test fill action in preview-style environments", async ({
  page,
}) => {
  await openSeededForm(page, "evaluacion", {
    sessionId: "evaluacion-manual-test-fill",
    waitForPersistedIdentity: false,
  });

  await expect(page.getByTestId("manual-test-fill-button")).toBeVisible();
  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);

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
  await expect(
    page.getByTestId("section_5.discapacidad_fisica.nota")
  ).toHaveValue(/CIE-10/i);
  await expect(
    page.getByTestId("section_5.discapacidad_fisica.ajustes")
  ).toHaveValue(/barreras/i);

  await completeEvaluacionForm(page);
  await waitForDraftAutosave(page);

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

  await waitForDraftAutosave(page);

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

  await page.getByTestId("cargos_compatibles").fill("Analista de soporte");
  await page.getByTestId("cargos_compatibles").blur();

  await waitForDraftAutosave(page);

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

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);

  await page.getByTestId("observaciones_generales").fill("");
  await page.getByTestId("observaciones_generales").blur();
  await waitForDraftAutosave(page);

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

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
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
