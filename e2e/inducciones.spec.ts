import { expect, test, type Page } from "@playwright/test";
import { mockFailedFinalization } from "./helpers/finalization";
import { openSeededForm } from "./helpers/forms";
import {
  loadInduccionUsuariosRecaByEnter,
  mockUsuariosReca,
} from "./helpers/usuariosReca";

async function expandSectionIfNeeded(page: Page, title: string) {
  const section = page
    .locator("section", {
      has: page.getByRole("heading", { name: title, exact: true }),
    })
    .first();

  await expect(section).toBeVisible();
  const expandButton = section.getByRole("button", { name: "Expandir" });
  if ((await expandButton.count()) > 0) {
    await expandButton.click();
  }
}

test("@smoke induccion-organizacional opens, loads vinculados RECA, and shows shared sections", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await openSeededForm(page, "induccion-organizacional", {
    waitForPersistedIdentity: false,
  });

  await expect(page.getByTestId("long-form-title")).toContainText(
    /Organizacional/i
  );
  await expect(page.getByTestId("long-form-finalize-button")).toBeVisible();

  await expandSectionIfNeeded(page, "Vinculado");
  await loadInduccionUsuariosRecaByEnter(page);

  await expect(page.getByTestId("vinculado.snapshot-banner")).toBeVisible();
  await expect(page.getByTestId("vinculado.numero")).toHaveValue("1");
  await expect(page.getByTestId("vinculado.nombre_oferente")).toHaveValue(
    "Ana Perez"
  );

  await expandSectionIfNeeded(page, "Observaciones");
  await expect(page.getByTestId("section_5.observaciones")).toBeVisible();

  await expandSectionIfNeeded(page, "Asistentes");
  await expect(page.locator("#asistentes\\.0\\.nombre")).toBeVisible();
  await expect(page.locator("#asistentes\\.0\\.cargo")).toBeVisible();
});

test("@integration induccion-organizacional derives readonly recommendations from medium", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-organizacional", {
    waitForPersistedIdentity: false,
  });

  await expandSectionIfNeeded(page, "Ajustes razonables");
  await page
    .getByTestId("section_4.0.medio")
    .selectOption(
      "Documentos Escritos, Presentaciones, Imagenes y Evaluaciones escritas"
    );

  await expect(page.locator("#section_4\\.0\\.recomendacion")).toHaveValue(
    /usar letra legible/i
  );

  await page.getByTestId("section_4.0.medio").selectOption("No aplica");
  await expect(page.locator("#section_4\\.0\\.recomendacion")).toHaveValue(
    "No aplica"
  );
});

test("@smoke induccion-organizacional manual test fill hydrates the document quickly", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-organizacional", {
    waitForPersistedIdentity: false,
  });

  await page.getByTestId("manual-test-fill-button").click();

  await expect(page.getByTestId("vinculado.nombre_oferente")).toHaveValue(
    "Vinculado Test 1"
  );
  await expect(page.getByTestId("section_3.historia_empresa.visto")).toHaveValue(
    "Si"
  );
  await expect(page.getByTestId("section_5.observaciones")).toHaveValue(
    "Observaciones de prueba."
  );
});

test("@smoke induccion-operativa opens, loads vinculados RECA, and shows shared sections", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await openSeededForm(page, "induccion-operativa", {
    waitForPersistedIdentity: false,
  });

  await expect(page.getByTestId("long-form-title")).toContainText(/Operativa/i);
  await expect(page.getByTestId("long-form-finalize-button")).toBeVisible();

  await expandSectionIfNeeded(page, "Vinculado");
  await loadInduccionUsuariosRecaByEnter(page);

  await expect(page.getByTestId("vinculado.snapshot-banner")).toBeVisible();
  await expect(page.getByTestId("vinculado.numero")).toHaveValue("1");
  await expect(page.getByTestId("vinculado.cargo_oferente")).toHaveValue(
    "Analista"
  );

  await expandSectionIfNeeded(page, "Ajustes razonables requeridos");
  await expect(page.getByTestId("ajustes_requeridos")).toBeVisible();

  await expandSectionIfNeeded(page, "Primer seguimiento");
  await expect(page.locator("#fecha_primer_seguimiento")).toBeVisible();

  await expandSectionIfNeeded(page, "Asistentes");
  await expect(page.locator("#asistentes\\.0\\.nombre")).toBeVisible();
  await expect(page.locator("#asistentes\\.0\\.cargo")).toBeVisible();
});

test("@integration induccion-operativa syncs prefixed dropdowns in section 4", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-operativa", {
    waitForPersistedIdentity: false,
  });

  await expandSectionIfNeeded(page, "Habilidades socioemocionales");
  await page
    .getByTestId("section_4.items.reconoce_instrucciones.nivel_apoyo")
    .selectOption("2. Nivel de apoyo medio.");

  await expect(
    page.getByTestId("section_4.items.reconoce_instrucciones.observaciones")
  ).toHaveValue("2. Requiere apoyo medio.");

  await page
    .getByTestId("section_4.items.reconoce_instrucciones.observaciones")
    .selectOption("0. Cumple autonomamente.");

  await expect(
    page.getByTestId("section_4.items.reconoce_instrucciones.nivel_apoyo")
  ).toHaveValue("0. No requiere apoyo.");
});

test("@smoke induccion-operativa manual test fill hydrates the document quickly", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-operativa", {
    waitForPersistedIdentity: false,
  });

  await page.getByTestId("manual-test-fill-button").click();

  await expect(page.getByTestId("vinculado.nombre_oferente")).toHaveValue(
    "Vinculado Test 1"
  );
  await expect(
    page.getByTestId("section_3.funciones_corresponden_perfil.ejecucion")
  ).toHaveValue("Si");
  await expect(page.getByTestId("ajustes_requeridos")).toHaveValue(
    "Ajustes de prueba para QA."
  );
});

test("@publish induccion-organizacional keeps the finalization error inside the dialog", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-organizacional", {
    waitForPersistedIdentity: false,
  });
  await mockFailedFinalization(
    page,
    "induccion-organizacional",
    "No existe la hoja '6. INDUCCION ORGANIZACIONAL' en el archivo maestro."
  );

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Publicación interrumpida" })
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "No existe la hoja '6. INDUCCION ORGANIZACIONAL' en el archivo maestro."
    ).first()
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
      .getByText(
        "No existe la hoja '6. INDUCCION ORGANIZACIONAL' en el archivo maestro."
      )
  ).toBeVisible();
});
