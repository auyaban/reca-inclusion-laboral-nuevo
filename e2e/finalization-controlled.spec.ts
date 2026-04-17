import { expect, test, type Page } from "@playwright/test";
import {
  mockDelayedFinalization,
  mockFailedFinalization,
  mockFinalizationStatusResponses,
  mockSuccessfulFinalization,
} from "./helpers/finalization";
import {
  getVisibleDraftSaveButton,
  openSeededForm,
  reopenSessionAsPersistedDraft,
  waitForDraftAutosave,
} from "./helpers/forms";

function installConfirmationTimeoutOverrides(page: Page) {
  return page.addInitScript(() => {
    (
      window as Window & {
        __RECA_FINALIZATION_CONFIRMATION_TIMEOUT_MS__?: number;
        __RECA_FINALIZATION_CONFIRMATION_DEADLINE_MS__?: number;
        __RECA_FINALIZATION_CONFIRMATION_POLL_INTERVAL_MS__?: number;
      }
    ).__RECA_FINALIZATION_CONFIRMATION_TIMEOUT_MS__ = 50;
    (
      window as Window & {
        __RECA_FINALIZATION_CONFIRMATION_TIMEOUT_MS__?: number;
        __RECA_FINALIZATION_CONFIRMATION_DEADLINE_MS__?: number;
        __RECA_FINALIZATION_CONFIRMATION_POLL_INTERVAL_MS__?: number;
      }
    ).__RECA_FINALIZATION_CONFIRMATION_DEADLINE_MS__ = 250;
    (
      window as Window & {
        __RECA_FINALIZATION_CONFIRMATION_TIMEOUT_MS__?: number;
        __RECA_FINALIZATION_CONFIRMATION_DEADLINE_MS__?: number;
        __RECA_FINALIZATION_CONFIRMATION_POLL_INTERVAL_MS__?: number;
      }
    ).__RECA_FINALIZATION_CONFIRMATION_POLL_INTERVAL_MS__ = 25;
  });
}

async function expectRecoveredPublishClearsDraft(options: {
  page: Page;
  slug: "presentacion" | "sensibilizacion" | "condiciones-vacante";
  expectsPdf: boolean;
}) {
  const { page, slug, expectsPdf } = options;
  await installConfirmationTimeoutOverrides(page);
  await openSeededForm(page, slug, {
    sessionId: `recovery-${slug}`,
  });
  await mockDelayedFinalization(page, slug, 5000);
  await mockFinalizationStatusResponses(page, [
    {
      status: 200,
      body: {
        status: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: `https://example.com/${slug}/recovered-sheet`,
          ...(expectsPdf
            ? { pdfLink: `https://example.com/${slug}/recovered-pdf` }
            : {}),
        },
        recovered: true,
      },
    },
  ]);

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Ver acta en Google Sheets")).toBeVisible();
  if (expectsPdf) {
    await expect(page.getByText("Ver PDF en Drive")).toBeVisible();
  } else {
    await expect(page.getByText("Ver PDF en Drive")).toHaveCount(0);
  }

  await page.goto("/hub?panel=drafts");
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  await expect(page.getByTestId("drafts-drawer")).toContainText(
    "No tienes borradores guardados."
  );
}

async function expectUrlToStayInSessionWhilePublishing(page: Page, slug: string) {
  await expect
    .poll(
      async () => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          hasSession: url.searchParams.has("session"),
          hasDraft: url.searchParams.has("draft"),
        };
      },
      {
        timeout: 4000,
        message: `Expected ${slug} to keep the session URL while publish is still in flight.`,
      }
    )
    .toEqual({
      pathname: `/formularios/${slug}`,
      hasSession: true,
      hasDraft: false,
    });
}

async function expectDraftPublishShowsSuccess(options: {
  page: Page;
  slug: "presentacion" | "sensibilizacion";
  expectsPdf: boolean;
}) {
  const { page, slug, expectsPdf } = options;
  const sessionId = `${slug}-draft-success`;
  const draftId = `persisted-${slug}-draft`;

  await openSeededForm(page, slug, {
    sessionId,
  });
  await mockSuccessfulFinalization(page, slug, {
    delayMs: 600,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();
  await reopenSessionAsPersistedDraft({
    page,
    slug,
    sessionId,
    draftId,
  });

  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("draft"))
    .toBe(draftId);
  await expect(page.getByText("Ver acta en Google Sheets")).toBeVisible();
  if (expectsPdf) {
    await expect(page.getByText("Ver PDF en Drive")).toBeVisible();
  } else {
    await expect(page.getByText("Ver PDF en Drive")).toHaveCount(0);
  }
}

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
  await expect(
    dialog.getByRole("heading", { name: "Publicación interrumpida" })
  ).toBeVisible();
  await expect(
    dialog.getByText("No se pudo publicar el acta de prueba.").first()
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
      .first()
  ).toBeVisible();
});

test("@publish seleccion recovers from a delayed publish response by polling finalization status", async ({
  page,
}) => {
  await installConfirmationTimeoutOverrides(page);
  await openSeededForm(page, "seleccion");
  await mockDelayedFinalization(page, "seleccion", 5000);
  await mockFinalizationStatusResponses(page, [
    {
      status: 200,
      body: {
        status: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: "https://example.com/seleccion/recovered-sheet",
          pdfLink: "https://example.com/seleccion/recovered-pdf",
        },
        recovered: true,
      },
    },
  ]);

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test("@publish seleccion shows a verification retry when finalization status never resolves", async ({
  page,
}) => {
  await installConfirmationTimeoutOverrides(page);
  await openSeededForm(page, "seleccion");
  await mockDelayedFinalization(page, "seleccion", 5000);
  await mockFinalizationStatusResponses(page, [
    {
      status: 202,
      body: {
        status: "processing",
        stage: "drive.export_pdf",
        displayStage: "Generando PDF",
        displayMessage: "Estamos trabajando en: Generando PDF.",
        retryAction: "check_status",
        retryAfterSeconds: 1,
      },
    },
  ]);

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(page.getByTestId("long-form-success-state")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("form-submit-confirm-accept")).toContainText(
    "Verificar de nuevo"
  );
  await expect(
    dialog.getByText(
      "No pudimos confirmar la publicación. Puede que el acta ya esté guardada."
    ).first()
  ).toBeVisible();
});

test("@publish presentacion recovers success by polling and clears the draft", async ({
  page,
}) => {
  await expectRecoveredPublishClearsDraft({
    page,
    slug: "presentacion",
    expectsPdf: true,
  });
});

test("@publish sensibilizacion recovers success by polling and clears the draft", async ({
  page,
}) => {
  await expectRecoveredPublishClearsDraft({
    page,
    slug: "sensibilizacion",
    expectsPdf: false,
  });
});

test("@publish condiciones-vacante recovers success by polling and clears the draft", async ({
  page,
}) => {
  await expectRecoveredPublishClearsDraft({
    page,
    slug: "condiciones-vacante",
    expectsPdf: true,
  });
});

test("@publish presentacion keeps the modal open while autosave tries to promote session to draft", async ({
  page,
}) => {
  await openSeededForm(page, "presentacion", {
    sessionId: "presentacion-finalization-lock",
  });
  await mockSuccessfulFinalization(page, "presentacion", {
    delayMs: 2000,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await page.waitForTimeout(1200);
  await expect(dialog).toBeVisible();
  await expectUrlToStayInSessionWhilePublishing(page, "presentacion");

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
  await page.goto("/hub?panel=drafts");
  await expect(page.getByTestId("drafts-drawer")).toContainText(
    "No tienes borradores guardados."
  );
});

test("@publish sensibilizacion keeps the modal open while autosave tries to promote session to draft", async ({
  page,
}) => {
  await openSeededForm(page, "sensibilizacion", {
    sessionId: "sensibilizacion-finalization-lock",
  });
  await mockSuccessfulFinalization(page, "sensibilizacion", {
    delayMs: 2000,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await page.waitForTimeout(1200);
  await expect(dialog).toBeVisible();
  await expectUrlToStayInSessionWhilePublishing(page, "sensibilizacion");

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
});

test("@publish presentacion started from a persisted draft keeps the success screen visible", async ({
  page,
}) => {
  await expectDraftPublishShowsSuccess({
    page,
    slug: "presentacion",
    expectsPdf: true,
  });
});

test("@publish sensibilizacion started from a persisted draft keeps the success screen visible", async ({
  page,
}) => {
  await expectDraftPublishShowsSuccess({
    page,
    slug: "sensibilizacion",
    expectsPdf: false,
  });
});
