import { expect, test, type Page } from "@playwright/test";
import {
  installLongFormRenderObserver,
  mockDelayedFinalization,
  mockFailedFinalization,
  mockFinalizationStatusResponses,
  mockSuccessfulFinalization,
  readLongFormRenderMetrics,
  resetLongFormRenderMetrics,
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
  slug:
    | "presentacion"
    | "sensibilizacion"
    | "condiciones-vacante"
    | "seleccion"
    | "contratacion"
    | "induccion-organizacional"
    | "induccion-operativa";
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

async function addRepeatedRows(page: Page, testId: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    await page.getByTestId(testId).click();
  }
}

async function expectLongFormHydrationWithoutRemount(options: {
  page: Page;
  slug: "interprete-lsc" | "presentacion";
}) {
  const { page, slug } = options;
  const sessionId = `${slug}-hydration-loop`;
  const draftId = `persisted-${slug}-hydration-loop`;

  await installLongFormRenderObserver(page);
  await openSeededForm(page, slug, {
    sessionId,
  });
  await page.evaluate(
    ({ nextSlug, nextSessionId, nextDraftId }) => {
      const storageKey = `draft__${nextSlug}__${nextDraftId}`;
      const rawEmpresaStore = window.sessionStorage.getItem(
        "reca-empresa-seleccionada"
      );

      let empresaSnapshot: Record<string, unknown> | null = null;
      if (rawEmpresaStore) {
        try {
          const parsedEmpresaStore = JSON.parse(rawEmpresaStore) as {
            state?: { empresa?: Record<string, unknown> | null };
          };
          empresaSnapshot = parsedEmpresaStore.state?.empresa ?? null;
        } catch {
          empresaSnapshot = null;
        }
      }

      const updatedAt = new Date().toISOString();
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 2,
          step: 0,
          data: {},
          empresaSnapshot,
          updatedAt,
        })
      );

      const rawIndex = window.localStorage.getItem("draft_index__v1");
      const parsedIndex = (() => {
        if (!rawIndex) {
          return [] as Array<Record<string, unknown>>;
        }

        try {
          return JSON.parse(rawIndex) as Array<Record<string, unknown>>;
        } catch {
          return [] as Array<Record<string, unknown>>;
        }
      })().filter(
        (entry) =>
          !(
            entry &&
            entry.slug === nextSlug &&
            entry.sessionId === nextSessionId &&
            entry.draftId === nextDraftId
          )
      );

      parsedIndex.push({
        id: `draft:${nextDraftId}`,
        slug: nextSlug,
        sessionId: nextSessionId,
        draftId: nextDraftId,
        empresaNit:
          typeof empresaSnapshot?.nit_empresa === "string"
            ? empresaSnapshot.nit_empresa
            : "",
        empresaNombre:
          typeof empresaSnapshot?.nombre_empresa === "string"
            ? empresaSnapshot.nombre_empresa
            : "",
        empresaSnapshot,
        step: 0,
        updatedAt,
        snapshotHash: null,
        hasMeaningfulContent: true,
        preview: null,
      });
      window.localStorage.setItem("draft_index__v1", JSON.stringify(parsedIndex));
    },
    {
      nextSlug: slug,
      nextSessionId: sessionId,
      nextDraftId: draftId,
    }
  );

  await resetLongFormRenderMetrics(page);

  await page.goto(`/formularios/${slug}?draft=${draftId}`);

  await expect(page.getByTestId("long-form-root")).toBeVisible();
  await expect
    .poll(async () => {
      const url = new URL(page.url());
      return {
        hasDraft: url.searchParams.has("draft"),
        hasSession: url.searchParams.has("session"),
      };
    })
    .toEqual({
      hasDraft: false,
      hasSession: true,
    });

  const metrics = await readLongFormRenderMetrics(page);

  expect(metrics.loadingStateAdds).toBeLessThanOrEqual(1);
  expect(metrics.rootRemovals).toBeLessThanOrEqual(1);
  expect(metrics.rootAdds).toBeGreaterThan(0);

  await expect(page.getByTestId("long-form-loading-overlay")).toHaveCount(0);
  await page.getByTestId("manual-test-fill-button").click();
  await expect(page.getByTestId("long-form-root")).toBeVisible();
}

async function fillAttendeeRow(
  page: Page,
  index: number,
  values: {
    nombre: string;
    cargo: string;
  }
) {
  await page.locator(`input[name="asistentes.${index}.nombre"]`).fill(values.nombre);
  await page.locator(`input[name="asistentes.${index}.cargo"]`).fill(values.cargo);
}

async function expectDraftPublishShowsSuccess(options: {
  page: Page;
  slug:
    | "presentacion"
    | "sensibilizacion"
    | "condiciones-vacante"
    | "seleccion"
    | "contratacion"
    | "induccion-organizacional"
    | "induccion-operativa";
  expectsPdf: boolean;
  expectSessionRouteAfterBootstrap?: boolean;
}) {
  const { page, slug, expectsPdf, expectSessionRouteAfterBootstrap = false } = options;
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

  if (expectSessionRouteAfterBootstrap) {
    await expect
      .poll(
        async () => {
          const url = new URL(page.url());
          return {
            pathname: url.pathname,
            hasDraft: url.searchParams.has("draft"),
            hasSession: url.searchParams.has("session"),
          };
        },
        {
          timeout: 10_000,
          message: `Expected ${slug} to normalize a persisted draft bootstrap back to a session route.`,
        }
      )
      .toEqual({
        pathname: `/formularios/${slug}`,
        hasDraft: false,
        hasSession: true,
      });
  }

  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  if (expectSessionRouteAfterBootstrap) {
    await expect
      .poll(
        () => {
          const url = new URL(page.url());
          const session = url.searchParams.get("session");

          return {
            draft: url.searchParams.get("draft"),
            hasSession: typeof session === "string" && session.length > 0,
          };
        },
        {
          timeout: 5_000,
        }
      )
      .toEqual({
        draft: null,
        hasSession: true,
      });
  } else {
    await expect
      .poll(() => new URL(page.url()).searchParams.get("draft"))
      .toBe(draftId);
  }
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

test("@publish interprete-lsc reaches submit with aggressive overflow rows", async ({
  page,
}) => {
  await openSeededForm(page, "interprete-lsc");
  await mockSuccessfulFinalization(page, "interprete-lsc");

  await addRepeatedRows(page, "oferentes-add-button", 9);
  await addRepeatedRows(page, "interpretes-add-button", 4);
  await page.getByTestId("manual-test-fill-button").click();

  await addRepeatedRows(page, "asistentes-add-button", 2);
  await fillAttendeeRow(page, 2, {
    nombre: "Asistente Overflow 3",
    cargo: "Coordinador",
  });
  await fillAttendeeRow(page, 3, {
    nombre: "Asistente Overflow 4",
    cargo: "Talento Humano",
  });

  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
});

test("@publish interprete-lsc restores persisted drafts without remounting the editor shell", async ({
  page,
}) => {
  await expectLongFormHydrationWithoutRemount({
    page,
    slug: "interprete-lsc",
  });
});

test("@publish presentacion restores persisted drafts without remounting the editor shell", async ({
  page,
}) => {
  await expectLongFormHydrationWithoutRemount({
    page,
    slug: "presentacion",
  });
});

test("@publish condiciones-vacante restores persisted drafts without remounting the editor shell", async ({
  page,
}) => {
  await expectLongFormHydrationWithoutRemount({
    page,
    slug: "condiciones-vacante",
  });
});

test("@publish contratacion reaches submit with overflow rows and attendees", async ({
  page,
}) => {
  await openSeededForm(page, "contratacion");
  await mockSuccessfulFinalization(page, "contratacion");

  await addRepeatedRows(page, "vinculados-add-button", 5);
  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);

  await addRepeatedRows(page, "asistentes-add-button", 3);
  await fillAttendeeRow(page, 2, {
    nombre: "Asistente Overflow 3",
    cargo: "Coordinador",
  });
  await fillAttendeeRow(page, 3, {
    nombre: "Asistente Overflow 4",
    cargo: "Analista",
  });
  await fillAttendeeRow(page, 4, {
    nombre: "Asistente Overflow 5",
    cargo: "Psicologia",
  });
  await waitForDraftAutosave(page);

  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
});

test("@publish interprete-lsc keeps the finalization clock moving during processing", async ({
  page,
}) => {
  await openSeededForm(page, "interprete-lsc");
  await mockSuccessfulFinalization(page, "interprete-lsc", {
    delayMs: 3200,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  const elapsed = page.getByTestId("long-form-finalization-elapsed");
  await expect(elapsed).toBeVisible();
  await expect(elapsed).toHaveText("00:00");
  await expect
    .poll(async () => await elapsed.textContent(), {
      timeout: 5000,
      message:
        "Expected the interprete-lsc finalization clock to move past 00:00 while processing.",
    })
    .not.toBe("00:00");

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
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

test("@publish seleccion recovers success by polling and clears the draft", async ({
  page,
}) => {
  await expectRecoveredPublishClearsDraft({
    page,
    slug: "seleccion",
    expectsPdf: true,
  });
});

test("@publish contratacion recovers success by polling and clears the draft", async ({
  page,
}) => {
  await expectRecoveredPublishClearsDraft({
    page,
    slug: "contratacion",
    expectsPdf: true,
  });
});

test("@publish induccion-organizacional recovers success by polling and clears the draft", async ({
  page,
}) => {
  await expectRecoveredPublishClearsDraft({
    page,
    slug: "induccion-organizacional",
    expectsPdf: true,
  });
});

test("@publish induccion-operativa recovers success by polling and clears the draft", async ({
  page,
}) => {
  await expectRecoveredPublishClearsDraft({
    page,
    slug: "induccion-operativa",
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

test("@publish seleccion keeps the modal open while autosave tries to promote session to draft", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion", {
    sessionId: "seleccion-finalization-lock",
  });
  await mockSuccessfulFinalization(page, "seleccion", {
    delayMs: 2000,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await page.waitForTimeout(1200);
  await expect(dialog).toBeVisible();
  await expectUrlToStayInSessionWhilePublishing(page, "seleccion");

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
});

test("@publish contratacion keeps the modal open while autosave tries to promote session to draft", async ({
  page,
}) => {
  await openSeededForm(page, "contratacion", {
    sessionId: "contratacion-finalization-lock",
  });
  await mockSuccessfulFinalization(page, "contratacion", {
    delayMs: 2000,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await page.waitForTimeout(1200);
  await expect(dialog).toBeVisible();
  await expectUrlToStayInSessionWhilePublishing(page, "contratacion");

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
});

test("@publish induccion-organizacional keeps the modal open while autosave tries to promote session to draft", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-organizacional", {
    sessionId: "induccion-organizacional-finalization-lock",
  });
  await mockSuccessfulFinalization(page, "induccion-organizacional", {
    delayMs: 2000,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await page.waitForTimeout(1200);
  await expect(dialog).toBeVisible();
  await expectUrlToStayInSessionWhilePublishing(
    page,
    "induccion-organizacional"
  );

  await expect(
    page.locator('[data-testid="long-form-success-state"]:visible')
  ).toBeVisible();
});

test("@publish induccion-operativa keeps the modal open while autosave tries to promote session to draft", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-operativa", {
    sessionId: "induccion-operativa-finalization-lock",
  });
  await mockSuccessfulFinalization(page, "induccion-operativa", {
    delayMs: 2000,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await page.getByTestId("long-form-finalize-button").click();
  const dialog = page.getByTestId("form-submit-confirm-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("form-submit-confirm-accept").click();

  await page.waitForTimeout(1200);
  await expect(dialog).toBeVisible();
  await expectUrlToStayInSessionWhilePublishing(page, "induccion-operativa");

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
    expectSessionRouteAfterBootstrap: true,
  });
});

test("@publish sensibilizacion started from a persisted draft keeps the success screen visible", async ({
  page,
}) => {
  await expectDraftPublishShowsSuccess({
    page,
    slug: "sensibilizacion",
    expectsPdf: false,
    expectSessionRouteAfterBootstrap: true,
  });
});

test("@publish condiciones-vacante started from a persisted draft keeps the success screen visible", async ({
  page,
}) => {
  await expectDraftPublishShowsSuccess({
    page,
    slug: "condiciones-vacante",
    expectsPdf: true,
    expectSessionRouteAfterBootstrap: true,
  });
});

test("@publish seleccion started from a persisted draft keeps the success screen visible", async ({
  page,
}) => {
  await expectDraftPublishShowsSuccess({
    page,
    slug: "seleccion",
    expectsPdf: true,
    expectSessionRouteAfterBootstrap: true,
  });
});

test("@publish contratacion started from a persisted draft keeps the success screen visible", async ({
  page,
}) => {
  await expectDraftPublishShowsSuccess({
    page,
    slug: "contratacion",
    expectsPdf: true,
    expectSessionRouteAfterBootstrap: true,
  });
});

test("@publish induccion-organizacional started from a persisted draft keeps the success screen visible", async ({
  page,
}) => {
  await expectDraftPublishShowsSuccess({
    page,
    slug: "induccion-organizacional",
    expectsPdf: true,
    expectSessionRouteAfterBootstrap: true,
  });
});

test("@publish induccion-operativa started from a persisted draft keeps the success screen visible", async ({
  page,
}) => {
  await expectDraftPublishShowsSuccess({
    page,
    slug: "induccion-operativa",
    expectsPdf: true,
    expectSessionRouteAfterBootstrap: true,
  });
});
