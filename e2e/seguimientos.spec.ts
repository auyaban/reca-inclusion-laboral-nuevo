import { expect, test, type Page } from "@playwright/test";
import { waitForDraftAutosave } from "./helpers/forms";
import { mockSeguimientosApi } from "./helpers/seguimientos";
import { mockUsuariosReca } from "./helpers/usuariosReca";

test.setTimeout(60_000);

async function openSeguimientosByCedula(page: Page, sessionId: string) {
  await page.goto(`/formularios/seguimientos?session=${sessionId}`);
  await expect(page.getByTestId("seguimientos-cedula-gate")).toBeVisible();
  await page.getByTestId("seguimientos-cedula-input").fill("1000061994");
  await page.getByTestId("seguimientos-cedula-open-button").click();
  await expect(page.getByTestId("long-form-root")).toBeVisible({
    timeout: 15_000,
  });
}

async function getLocalSavedAt(page: Page) {
  return (
    (await page
      .locator('[data-testid="draft-persistence-status"]:visible')
      .getAttribute("data-local-saved-at")) ?? ""
  );
}

test("@smoke seguimientos bootstraps a no_compensar case and renders the dedicated editor", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-smoke");

  await expect(page.getByTestId("long-form-title")).toContainText("Seguimientos");
  await expect(page.getByTestId("seguimientos-base-editor")).toBeVisible();
  await expect(
    page.getByTestId("long-form-nav-desktop-item-followup_3")
  ).toBeVisible();
  await expect(
    page.getByTestId("long-form-nav-desktop-item-followup_4")
  ).toHaveCount(0);
});

test("@integration seguimientos resolves company type manually before opening a compensar case", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    requireCompanyTypeResolution: true,
    companyType: "compensar",
  });

  await page.goto("/formularios/seguimientos?session=e2e-seguimientos-resolution");
  await page.getByTestId("seguimientos-cedula-input").fill("1000061994");
  await page.getByTestId("seguimientos-cedula-open-button").click();

  await expect(
    page.getByTestId("seguimientos-company-type-compensar")
  ).toBeVisible();
  await page.getByTestId("seguimientos-company-type-compensar").click();

  await expect(page.getByTestId("long-form-root")).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByTestId("long-form-nav-desktop-item-followup_6")
  ).toBeVisible();
});

test("@integration seguimientos restores the local draft after reload", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-restore");

  const initialSavedAt = await getLocalSavedAt(page);
  await page.locator("#contacto_emergencia").fill("Contacto E2E");
  await waitForDraftAutosave(page, { initialSavedAt });

  await page.reload();

  await expect(page.getByTestId("long-form-root")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator("#contacto_emergencia")).toHaveValue("Contacto E2E");
});

test("@integration seguimientos keeps the session route invisible after autosave and Google Sheets writes", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
  });

  const sessionId = "e2e-seguimientos-invisible-route";
  await openSeguimientosByCedula(page, sessionId);

  const initialSavedAt = await getLocalSavedAt(page);
  await page.locator("#contacto_emergencia").fill("Contacto ruta invisible");
  await waitForDraftAutosave(page, { initialSavedAt });

  await expect(page).toHaveURL(new RegExp(`session=${sessionId}`));
  expect(page.url()).not.toContain("draft=");

  await page.getByTestId("seguimientos-base-save-button").click();
  await expect(page.getByTestId("seguimientos-status-notice")).toContainText(
    "Ficha inicial guardada en Google Sheets"
  );

  await expect(page).toHaveURL(new RegExp(`session=${sessionId}`));
  expect(page.url()).not.toContain("draft=");
});

test("@integration seguimientos can save ficha inicial twice in the same session without a self case_conflict", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-self-conflict");

  await page.locator("#contacto_emergencia").fill("Contacto primer save");
  await page.getByTestId("seguimientos-base-save-button").click();
  await expect(page.getByTestId("seguimientos-status-notice")).toContainText(
    "Ficha inicial guardada en Google Sheets"
  );

  await page.locator("#telefono_emergencia").fill("3011111111");
  await page.getByTestId("seguimientos-base-save-button").click();

  await expect(page.getByTestId("seguimientos-case-conflict-banner")).toHaveCount(
    0
  );
  await expect(page.getByTestId("seguimientos-status-notice")).toContainText(
    "Ficha inicial guardada en Google Sheets"
  );
});

test("@integration seguimientos keeps Seguimiento 1 open after save and shows explicit next steps", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    baseCompleted: true,
    activeStageId: "followup_1",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-followup-post-save");

  await expect(page.getByTestId("seguimientos-followup-editor-1")).toBeVisible();
  await page.getByTestId("seguimientos-followup-failed-visit-button").click();
  await page.getByTestId("form-submit-confirm-accept").click();
  await page.getByTestId("seguimientos-followup-save-button").click();

  await expect(page.getByTestId("seguimientos-followup-editor-1")).toBeVisible();
  await expect(
    page.getByTestId("seguimientos-save-success-toast")
  ).toContainText("Guardado completado");
  await expect(
    page.getByTestId("seguimientos-save-success-next-button")
  ).toContainText("Ir a Seguimiento 2");
  await expect(
    page.getByTestId("seguimientos-save-success-final-button")
  ).toContainText("Ir a Resultado final");
});

test("@integration seguimientos keeps Seguimiento 3 open in casos compensar and offers Seguimiento 4 manually", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "compensar",
    baseCompleted: true,
    activeStageId: "followup_3",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-compensar-post-save");

  await expect(page.getByTestId("seguimientos-followup-editor-3")).toBeVisible();
  await page.getByTestId("seguimientos-followup-failed-visit-button").click();
  await page.getByTestId("form-submit-confirm-accept").click();
  await page.getByTestId("seguimientos-followup-save-button").click();

  await expect(page.getByTestId("seguimientos-followup-editor-3")).toBeVisible();
  await expect(
    page.getByTestId("seguimientos-save-success-next-button")
  ).toContainText("Ir a Seguimiento 4");
  await expect(
    page.getByTestId("seguimientos-save-success-final-button")
  ).toContainText("Ir a Resultado final");
});

test("@integration seguimientos keeps the active stage after saving a historical override correction", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    baseCompleted: true,
    completedFollowups: [1],
    activeStageId: "followup_2",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-override");

  await page.getByTestId("long-form-nav-desktop-item-followup_1").click();
  await expect(page.getByTestId("seguimientos-followup-editor-1")).toBeVisible();

  await page.getByTestId("seguimientos-stage-override-button").click();
  await expect(page.getByTestId("form-submit-confirm-dialog")).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();
  await expect(page.getByTestId("form-submit-confirm-dialog")).toHaveCount(0);
  await expect(page.locator("#fecha_seguimiento")).toBeEnabled();

  await page.locator("#fecha_seguimiento").fill("2026-05-02");
  await page.getByTestId("seguimientos-followup-save-button").click();

  await expect(page.getByTestId("seguimientos-status-notice")).toContainText(
    "Correccion guardada en Google Sheets"
  );
  await expect(page.getByTestId("seguimientos-followup-editor-1")).toBeVisible();
  await expect(
    page.getByTestId("seguimientos-followup-editor-2")
  ).toHaveCount(0);
});

test("@integration seguimientos restores an unlocked historical stage after reload", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    baseCompleted: true,
    completedFollowups: [1],
    activeStageId: "followup_1",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-lock-checkpoint");

  await expect(page.getByTestId("seguimientos-followup-editor-1")).toBeVisible();
  await page.getByTestId("seguimientos-stage-override-button").click();
  await expect(page.getByTestId("form-submit-confirm-dialog")).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();
  await expect(page.getByTestId("form-submit-confirm-dialog")).toHaveCount(0);
  await expect(page.getByTestId("seguimientos-stage-lock-button")).toBeVisible();

  await page.reload();

  await expect(page.getByTestId("long-form-root")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("seguimientos-followup-editor-1")).toBeVisible();
  await expect(page.getByTestId("seguimientos-stage-lock-button")).toBeVisible();
});

test("@integration seguimientos does not protect Seguimiento 1 after local edits when it is still new", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-local-followup");

  await page.getByTestId("long-form-nav-desktop-item-followup_1").click();
  const followupEditor = page.getByTestId("seguimientos-followup-editor-1");
  await expect(followupEditor).toBeVisible();
  await expect(
    page.getByTestId("seguimientos-stage-override-button")
  ).toHaveCount(0);

  await followupEditor.locator("#modalidad").selectOption("Presencial");

  await expect(
    page.getByTestId("seguimientos-stage-override-button")
  ).toHaveCount(0);
  await expect(followupEditor.locator("#modalidad")).toHaveValue("Presencial");
});

test("@integration seguimientos applies bulk evaluation shortcuts across the whole group and keeps save working", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    baseCompleted: true,
    activeStageId: "followup_1",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-bulk-evals");

  const followupEditor = page.getByTestId("seguimientos-followup-editor-1");
  await expect(followupEditor).toBeVisible();

  await page
    .getByTestId("seguimientos-followup-bulk-item_autoevaluacion-bien")
    .click();
  await expect(followupEditor.locator("#item_autoevaluacion\\.0")).toHaveValue(
    "Bien"
  );
  await expect(followupEditor.locator("#item_autoevaluacion\\.18")).toHaveValue(
    "Bien"
  );

  await page
    .getByTestId("seguimientos-followup-bulk-empresa_eval-no-aplica")
    .click();
  await expect(followupEditor.locator("#empresa_eval\\.0")).toHaveValue(
    "No aplica"
  );
  await expect(followupEditor.locator("#empresa_eval\\.7")).toHaveValue(
    "No aplica"
  );

  await page.getByTestId("seguimientos-followup-save-button").click();
  await expect(page.getByTestId("seguimientos-status-notice")).toContainText(
    /guardad/i
  );
});

test("@integration seguimientos blocks PDF export while there are dirty local changes", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    baseCompleted: true,
    completedFollowups: [1],
    activeStageId: "followup_2",
    exportReady: true,
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-pdf-block");

  await expect(page.getByTestId("seguimientos-followup-editor-2")).toBeVisible();
  await page.locator("#fecha_seguimiento").fill("2026-05-05");
  await expect(page.locator("#fecha_seguimiento")).toHaveValue("2026-05-05");

  await page.getByTestId("long-form-nav-desktop-item-final_result").click();
  await expect(page.getByTestId("seguimientos-final-editor")).toBeVisible();
  await expect(page.getByTestId("seguimientos-final-pdf-notice")).toContainText(
    "Tienes cambios sin guardar en Google Sheets"
  );
  await expect(
    page.getByTestId("seguimientos-final-export-button")
  ).toBeDisabled();
});

test("@integration seguimientos shows all PDF variants for no_compensar and compensar workflows", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "compensar",
    baseCompleted: true,
    completedFollowups: [1],
    activeStageId: "final_result",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-pdf-catalog");

  await page.getByTestId("long-form-nav-desktop-item-final_result").click();
  await expect(page.getByTestId("seguimientos-final-editor")).toBeVisible();
  await expect(
    page.getByTestId("seguimientos-final-pdf-option-base_only")
  ).toContainText("Solo ficha inicial");
  await expect(
    page.getByTestId("seguimientos-final-pdf-option-base_plus_followup_1")
  ).toContainText("Ficha inicial + Seguimiento 1");
  await expect(
    page.getByTestId("seguimientos-final-pdf-option-base_plus_followup_6")
  ).toContainText("Ficha inicial + Seguimiento 6");
  await expect(
    page.getByTestId("seguimientos-final-pdf-option-base_plus_followup_6_plus_final")
  ).toContainText("Consolidado");
});

test("@integration seguimientos enables ficha inicial mas seguimiento for a persisted failed visit", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    baseCompleted: true,
    failedVisitFollowups: [1],
    activeStageId: "final_result",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-failed-visit-pdf");

  await page.getByTestId("long-form-nav-desktop-item-final_result").click();
  const followupOption = page.getByTestId(
    "seguimientos-final-pdf-option-base_plus_followup_1"
  );
  await expect(followupOption).toContainText("Disponible");
  await followupOption.click();
  await expect(
    page.getByTestId("seguimientos-final-pdf-notice")
  ).toHaveCount(0);
  await expect(
    page.getByTestId("seguimientos-final-export-button")
  ).toBeEnabled();
});

test("@integration seguimientos does not mark untouched empty followups as dirty just by opening them", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    baseCompleted: true,
    completedFollowups: [1],
    activeStageId: "followup_2",
    exportReady: true,
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-ghost-dirty");

  await expect(page.getByTestId("seguimientos-followup-editor-2")).toBeVisible();
  await expect(
    page.getByTestId("seguimientos-save-pending-notice")
  ).toHaveCount(0);

  await page.getByTestId("long-form-nav-desktop-item-followup_3").click();
  await expect(page.getByTestId("seguimientos-followup-editor-3")).toBeVisible();
  await expect(
    page.getByTestId("seguimientos-save-pending-notice")
  ).toHaveCount(0);

  await page.getByTestId("long-form-nav-desktop-item-final_result").click();
  await expect(page.getByTestId("seguimientos-final-editor")).toBeVisible();
  await expect(page.getByTestId("seguimientos-final-pdf-notice")).toHaveCount(0);
  await expect(
    page.getByTestId("seguimientos-final-export-button")
  ).toBeEnabled();
});

test("@integration seguimientos rejects followup saves when the ficha inicial is still incomplete", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    baseCompleted: true,
    activeStageId: "followup_1",
    stagesSaveErrorCode: "base_stage_incomplete",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-base-incomplete");

  const followupEditor = page.getByTestId("seguimientos-followup-editor-1");
  await expect(followupEditor).toBeVisible();
  await followupEditor.locator("#fecha_seguimiento").fill("2026-05-07");
  await expect(page.getByTestId("seguimientos-followup-save-button")).toBeEnabled();
  await page.getByTestId("seguimientos-followup-save-button").click();

  await expect(
    page.getByText("La ficha inicial debe estar completa antes de guardar seguimientos.", {
      exact: false,
    })
  ).toBeVisible();
  await expect(page.getByTestId("seguimientos-followup-editor-1")).toBeVisible();
});

test("@integration seguimientos blocks further editing after a write that needs reload until sync is retried", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    saveNeedsReloadOnce: true,
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-sync-recovery");

  await page.locator("#contacto_emergencia").fill("Contacto Recovery");
  await page.getByTestId("seguimientos-base-save-button").click();

  await expect(page.getByTestId("seguimientos-sync-recovery-banner")).toContainText(
    "Los cambios ya quedaron en Google Sheets"
  );
  await expect(page.getByTestId("seguimientos-base-save-button")).toBeDisabled();
  await page.getByTestId("long-form-nav-desktop-item-followup_1").click();
  await expect(page.getByTestId("seguimientos-base-editor")).toBeVisible();

  await page.getByTestId("seguimientos-retry-sync-button").click();
  await expect(page.getByTestId("seguimientos-sync-recovery-banner")).toHaveCount(0);
  await expect(page.getByTestId("seguimientos-base-save-button")).toBeEnabled();
});

test("@integration seguimientos surfaces typed bootstrap storage failures in the cedula gate", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    bootstrapErrorCode: "google_storage_quota_exceeded",
  });

  await page.goto("/formularios/seguimientos?session=e2e-seguimientos-bootstrap-error");
  await page.getByTestId("seguimientos-cedula-input").fill("1000061994");
  await page.getByTestId("seguimientos-cedula-open-button").click();

  await expect(page.getByTestId("seguimientos-cedula-gate")).toBeVisible();
  await expect(
    page.getByText("Google Drive/Sheets no pudo preparar el caso por limite temporal de cuota", {
      exact: false,
    })
  ).toBeVisible();
});

test("@integration seguimientos sends ownerless draft restores back to the cedula gate", async ({
  page,
}) => {
  await mockUsuariosReca(page);
  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
  });

  await openSeguimientosByCedula(page, "e2e-seguimientos-reclaim");

  const initialSavedAt = await getLocalSavedAt(page);
  await page.locator("#contacto_emergencia").fill("Contacto draft antiguo");
  await waitForDraftAutosave(page, { initialSavedAt });

  await mockSeguimientosApi(page, {
    companyType: "no_compensar",
    caseLoadErrorCode: "case_reclaim_required",
  });

  await page.reload();

  await expect(page.getByTestId("seguimientos-cedula-gate")).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText("Este caso todavia no tiene ownership asignado", {
      exact: false,
    })
  ).toBeVisible();
});
