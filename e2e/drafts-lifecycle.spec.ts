import { expect, test } from "@playwright/test";
import {
  fillFieldAndWaitForDraftAutosave,
  getVisibleDraftSaveButton,
  openSeededForm,
  waitForDraftAutosave,
  reopenSessionAsPersistedDraft,
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

test("@integration presentacion keeps the session route after persisting a remote draft", async ({
  page,
}) => {
  await openSeededForm(page, "presentacion", {
    sessionId: "e2e-presentacion-hidden-draft",
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await expect
    .poll(
      async () => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          session: url.searchParams.get("session"),
          draft: url.searchParams.get("draft"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected Presentacion to keep the visible editor in session mode after persisting a remote draft.",
      }
    )
    .toEqual({
      pathname: "/formularios/presentacion",
      session: "e2e-presentacion-hidden-draft",
      draft: null,
    });

  await page.reload();

  await expect(page.locator("#acuerdos_observaciones")).toHaveValue(
    "Acta de prueba diligenciada para validar el flujo de publicacion."
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("draft"))
    .toBeNull();
});

test("@integration presentacion restores a persisted draft and normalizes back to session mode", async ({
  page,
}) => {
  const sessionId = "e2e-presentacion-bootstrap";
  const draftId = "persisted-presentacion-bootstrap";

  await openSeededForm(page, "presentacion", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await reopenSessionAsPersistedDraft({
    page,
    slug: "presentacion",
    sessionId,
    draftId,
  });

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
        message:
          "Expected Presentacion to bootstrap from ?draft= and then normalize back to a stable session route.",
      }
    )
    .toEqual({
      pathname: "/formularios/presentacion",
      hasDraft: false,
      hasSession: true,
    });

  await expect(page.locator("#acuerdos_observaciones")).toHaveValue(
    "Acta de prueba diligenciada para validar el flujo de publicacion."
  );
});

test("@integration presentacion opens the exact hub draft without switching to visible draft mode", async ({
  page,
  context,
}) => {
  const sessionId = "e2e-presentacion-hub-bootstrap";

  await openSeededForm(page, "presentacion", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await page.goto("/hub");
  await page.getByTestId("hub-drafts-button").click();
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  const draftOpenButton = page.locator('[data-testid^="hub-draft-open-"]').first();

  const newPagePromise = context.waitForEvent("page");
  await draftOpenButton.click();
  const draftPage = await newPagePromise;
  await draftPage.waitForLoadState("domcontentloaded");
  await expect(draftPage.getByTestId("long-form-root")).toBeVisible();

  await expect
    .poll(
      async () => {
        const url = new URL(draftPage.url());
        return {
          pathname: url.pathname,
          hasDraft: url.searchParams.has("draft"),
          hasSession: url.searchParams.has("session"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected the draft opened from hub to restore the exact remote draft and then hide draft mode from the URL.",
      }
    )
    .toEqual({
      pathname: "/formularios/presentacion",
      hasDraft: false,
      hasSession: true,
    });

  await expect(draftPage.locator("#acuerdos_observaciones")).toHaveValue(
    "Acta de prueba diligenciada para validar el flujo de publicacion."
  );
});

test("@integration sensibilizacion keeps the session route after persisting a remote draft", async ({
  page,
}) => {
  await openSeededForm(page, "sensibilizacion", {
    sessionId: "e2e-sensibilizacion-hidden-draft",
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await expect
    .poll(
      async () => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          session: url.searchParams.get("session"),
          draft: url.searchParams.get("draft"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected Sensibilizacion to keep the visible editor in session mode after persisting a remote draft.",
      }
    )
    .toEqual({
      pathname: "/formularios/sensibilizacion",
      session: "e2e-sensibilizacion-hidden-draft",
      draft: null,
    });

  await page.reload();

  await expect(page.locator("#observaciones")).toHaveValue(
    "Observaciones de prueba diligenciadas para validar el cierre del acta."
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("draft"))
    .toBeNull();
});

test("@integration sensibilizacion restores a persisted draft and normalizes back to session mode", async ({
  page,
}) => {
  const sessionId = "e2e-sensibilizacion-bootstrap";
  const draftId = "persisted-sensibilizacion-bootstrap";

  await openSeededForm(page, "sensibilizacion", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await reopenSessionAsPersistedDraft({
    page,
    slug: "sensibilizacion",
    sessionId,
    draftId,
  });

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
        message:
          "Expected Sensibilizacion to bootstrap from ?draft= and then normalize back to a stable session route.",
      }
    )
    .toEqual({
      pathname: "/formularios/sensibilizacion",
      hasDraft: false,
      hasSession: true,
    });

  await expect(page.locator("#observaciones")).toHaveValue(
    "Observaciones de prueba diligenciadas para validar el cierre del acta."
  );
});

test("@integration sensibilizacion opens the exact hub draft without switching to visible draft mode", async ({
  page,
  context,
}) => {
  const sessionId = "e2e-sensibilizacion-hub-bootstrap";

  await openSeededForm(page, "sensibilizacion", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await page.goto("/hub");
  await page.getByTestId("hub-drafts-button").click();
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  const draftOpenButton = page.locator('[data-testid^="hub-draft-open-"]').first();

  const newPagePromise = context.waitForEvent("page");
  await draftOpenButton.click();
  const draftPage = await newPagePromise;
  await draftPage.waitForLoadState("domcontentloaded");
  await expect(draftPage.getByTestId("long-form-root")).toBeVisible();

  await expect
    .poll(
      async () => {
        const url = new URL(draftPage.url());
        return {
          pathname: url.pathname,
          hasDraft: url.searchParams.has("draft"),
          hasSession: url.searchParams.has("session"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected the Sensibilizacion draft opened from hub to restore the exact remote draft and then hide draft mode from the URL.",
      }
    )
    .toEqual({
      pathname: "/formularios/sensibilizacion",
      hasDraft: false,
      hasSession: true,
    });

  await expect(draftPage.locator("#observaciones")).toHaveValue(
    "Observaciones de prueba diligenciadas para validar el cierre del acta."
  );
});

test("@integration condiciones-vacante keeps the session route after persisting a remote draft", async ({
  page,
}) => {
  await openSeededForm(page, "condiciones-vacante", {
    sessionId: "e2e-condiciones-hidden-draft",
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await expect
    .poll(
      async () => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          session: url.searchParams.get("session"),
          draft: url.searchParams.get("draft"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected Condiciones de la Vacante to keep the visible editor in session mode after persisting a remote draft.",
      }
    )
    .toEqual({
      pathname: "/formularios/condiciones-vacante",
      session: "e2e-condiciones-hidden-draft",
      draft: null,
    });

  await page.reload();

  await expect(page.locator("#observaciones_recomendaciones")).toHaveValue(
    "Se recomienda induccion gradual y ajustes razonables basicos."
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("draft"))
    .toBeNull();
});

test("@integration condiciones-vacante restores a persisted draft and normalizes back to session mode", async ({
  page,
}) => {
  const sessionId = "e2e-condiciones-bootstrap";
  const draftId = "persisted-condiciones-bootstrap";

  await openSeededForm(page, "condiciones-vacante", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await reopenSessionAsPersistedDraft({
    page,
    slug: "condiciones-vacante",
    sessionId,
    draftId,
  });

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
        message:
          "Expected Condiciones de la Vacante to bootstrap from ?draft= and then normalize back to a stable session route.",
      }
    )
    .toEqual({
      pathname: "/formularios/condiciones-vacante",
      hasDraft: false,
      hasSession: true,
    });

  await expect(page.locator("#observaciones_recomendaciones")).toHaveValue(
    "Se recomienda induccion gradual y ajustes razonables basicos."
  );
});

test("@integration condiciones-vacante opens the exact hub draft without switching to visible draft mode", async ({
  page,
  context,
}) => {
  const sessionId = "e2e-condiciones-hub-bootstrap";

  await openSeededForm(page, "condiciones-vacante", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await page.goto("/hub");
  await page.getByTestId("hub-drafts-button").click();
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  const draftOpenButton = page.locator('[data-testid^="hub-draft-open-"]').first();

  const newPagePromise = context.waitForEvent("page");
  await draftOpenButton.click();
  const draftPage = await newPagePromise;
  await draftPage.waitForLoadState("domcontentloaded");
  await expect(draftPage.getByTestId("long-form-root")).toBeVisible();

  await expect
    .poll(
      async () => {
        const url = new URL(draftPage.url());
        return {
          pathname: url.pathname,
          hasDraft: url.searchParams.has("draft"),
          hasSession: url.searchParams.has("session"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected the Condiciones de la Vacante draft opened from hub to restore the exact remote draft and then hide draft mode from the URL.",
      }
    )
    .toEqual({
      pathname: "/formularios/condiciones-vacante",
      hasDraft: false,
      hasSession: true,
    });

  await expect(draftPage.locator("#observaciones_recomendaciones")).toHaveValue(
    "Se recomienda induccion gradual y ajustes razonables basicos."
  );
});

test("@integration seleccion keeps the session route after persisting a remote draft", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion", {
    sessionId: "e2e-seleccion-hidden-draft",
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await expect
    .poll(
      async () => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          session: url.searchParams.get("session"),
          draft: url.searchParams.get("draft"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected Selección to keep the visible editor in session mode after persisting a remote draft.",
      }
    )
    .toEqual({
      pathname: "/formularios/seleccion",
      session: "e2e-seleccion-hidden-draft",
      draft: null,
    });

  await page.reload();

  await expect(page.getByTestId("desarrollo_actividad")).toHaveValue(
    "Actividad de prueba diligenciada para validacion manual del formulario."
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("draft"))
    .toBeNull();
});

test("@integration seleccion restores a persisted draft and normalizes back to session mode", async ({
  page,
}) => {
  const sessionId = "e2e-seleccion-bootstrap";
  const draftId = "persisted-seleccion-bootstrap";

  await openSeededForm(page, "seleccion", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await reopenSessionAsPersistedDraft({
    page,
    slug: "seleccion",
    sessionId,
    draftId,
  });

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
        message:
          "Expected Selección to bootstrap from ?draft= and then normalize back to a stable session route.",
      }
    )
    .toEqual({
      pathname: "/formularios/seleccion",
      hasDraft: false,
      hasSession: true,
    });

  await expect(page.getByTestId("desarrollo_actividad")).toHaveValue(
    "Actividad de prueba diligenciada para validacion manual del formulario."
  );
});

test("@integration seleccion opens the exact hub draft without switching to visible draft mode", async ({
  page,
  context,
}) => {
  const sessionId = "e2e-seleccion-hub-bootstrap";

  await openSeededForm(page, "seleccion", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await page.goto("/hub");
  await page.getByTestId("hub-drafts-button").click();
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  const draftOpenButton = page.locator('[data-testid^="hub-draft-open-"]').first();

  const newPagePromise = context.waitForEvent("page");
  await draftOpenButton.click();
  const draftPage = await newPagePromise;
  await draftPage.waitForLoadState("domcontentloaded");
  await expect(draftPage.getByTestId("long-form-root")).toBeVisible();

  await expect
    .poll(
      async () => {
        const url = new URL(draftPage.url());
        return {
          pathname: url.pathname,
          hasDraft: url.searchParams.has("draft"),
          hasSession: url.searchParams.has("session"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected the Selección draft opened from hub to restore the exact remote draft and then hide draft mode from the URL.",
      }
    )
    .toEqual({
      pathname: "/formularios/seleccion",
      hasDraft: false,
      hasSession: true,
    });

  await expect(draftPage.getByTestId("desarrollo_actividad")).toHaveValue(
    "Actividad de prueba diligenciada para validacion manual del formulario."
  );
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

test("@integration contratacion keeps the session route after persisting a remote draft", async ({
  page,
}) => {
  await openSeededForm(page, "contratacion", {
    sessionId: "e2e-contratacion-hidden-draft",
  });

  await fillFieldAndWaitForDraftAutosave(
    page,
    "ajustes_recomendaciones",
    "Ajuste de contratación invisible persistido para QA."
  );
  await getVisibleDraftSaveButton(page).click();

  await expect
    .poll(
      async () => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          session: url.searchParams.get("session"),
          draft: url.searchParams.get("draft"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected Contratacion to keep the visible editor in session mode after persisting a remote draft.",
      }
    )
    .toEqual({
      pathname: "/formularios/contratacion",
      session: "e2e-contratacion-hidden-draft",
      draft: null,
    });

  await page.reload();

  await expect(page.getByTestId("ajustes_recomendaciones")).toHaveValue(
    "Ajuste de contratación invisible persistido para QA."
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("draft"))
    .toBeNull();
});

test("@integration contratacion restores a persisted draft and normalizes back to session mode", async ({
  page,
}) => {
  const sessionId = "e2e-contratacion-bootstrap";
  const draftId = "persisted-contratacion-bootstrap";

  await openSeededForm(page, "contratacion", {
    sessionId,
  });

  await fillFieldAndWaitForDraftAutosave(
    page,
    "ajustes_recomendaciones",
    "Ajuste de contratación reabierto desde draft legacy."
  );
  await getVisibleDraftSaveButton(page).click();

  await reopenSessionAsPersistedDraft({
    page,
    slug: "contratacion",
    sessionId,
    draftId,
  });

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
        message:
          "Expected Contratacion to bootstrap from ?draft= and then normalize back to a stable session route.",
      }
    )
    .toEqual({
      pathname: "/formularios/contratacion",
      hasDraft: false,
      hasSession: true,
    });

  await expect(page.getByTestId("ajustes_recomendaciones")).toHaveValue(
    "Ajuste de contratación reabierto desde draft legacy."
  );
});

test("@integration contratacion opens the exact hub draft without switching to visible draft mode", async ({
  page,
  context,
}) => {
  const sessionId = "e2e-contratacion-hub-bootstrap";

  await openSeededForm(page, "contratacion", {
    sessionId,
  });

  await fillFieldAndWaitForDraftAutosave(
    page,
    "ajustes_recomendaciones",
    "Ajuste de contratación visible desde hub."
  );
  await getVisibleDraftSaveButton(page).click();

  await page.goto("/hub");
  await page.getByTestId("hub-drafts-button").click();
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  const draftOpenButton = page
    .locator('[data-testid^="hub-draft-open-"]')
    .first();

  const newPagePromise = context.waitForEvent("page");
  await draftOpenButton.click();
  const draftPage = await newPagePromise;
  await draftPage.waitForLoadState("domcontentloaded");
  await expect(draftPage.getByTestId("long-form-root")).toBeVisible();

  await expect
    .poll(
      async () => {
        const url = new URL(draftPage.url());
        return {
          pathname: url.pathname,
          hasDraft: url.searchParams.has("draft"),
          hasSession: url.searchParams.has("session"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected the Contratacion draft opened from hub to restore the exact remote draft and then hide draft mode from the URL.",
      }
    )
    .toEqual({
      pathname: "/formularios/contratacion",
      hasDraft: false,
      hasSession: true,
    });

  await expect(draftPage.getByTestId("ajustes_recomendaciones")).toHaveValue(
    "Ajuste de contratación visible desde hub."
  );
});
test("@integration induccion-organizacional keeps the session route after persisting a remote draft", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-organizacional", {
    sessionId: "e2e-induccion-organizacional-hidden-draft",
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await expect
    .poll(
      async () => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          session: url.searchParams.get("session"),
          draft: url.searchParams.get("draft"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected Induccion Organizacional to keep the visible editor in session mode after persisting a remote draft.",
      }
    )
    .toEqual({
      pathname: "/formularios/induccion-organizacional",
      session: "e2e-induccion-organizacional-hidden-draft",
      draft: null,
    });

  await page.reload();

  await expect(page.getByTestId("section_5.observaciones")).toHaveValue(
    "Observaciones de prueba."
  );
});

test("@integration induccion-organizacional restores a persisted draft and normalizes back to session mode", async ({
  page,
}) => {
  const sessionId = "e2e-induccion-organizacional-bootstrap";
  const draftId = "persisted-induccion-organizacional-bootstrap";

  await openSeededForm(page, "induccion-organizacional", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();
  await reopenSessionAsPersistedDraft({
    page,
    slug: "induccion-organizacional",
    sessionId,
    draftId,
  });

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
        message:
          "Expected Induccion Organizacional to bootstrap from ?draft= and then normalize back to a stable session route.",
      }
    )
    .toEqual({
      pathname: "/formularios/induccion-organizacional",
      hasDraft: false,
      hasSession: true,
    });

  await expect(page.getByTestId("section_5.observaciones")).toHaveValue(
    "Observaciones de prueba."
  );
});

test("@integration induccion-organizacional opens the exact hub draft without switching to visible draft mode", async ({
  page,
  context,
}) => {
  const sessionId = "e2e-induccion-organizacional-hub-bootstrap";

  await openSeededForm(page, "induccion-organizacional", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await page.goto("/hub");
  await page.getByTestId("hub-drafts-button").click();
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  const draftOpenButton = page.locator('[data-testid^="hub-draft-open-"]').first();

  const newPagePromise = context.waitForEvent("page");
  await draftOpenButton.click();
  const draftPage = await newPagePromise;
  await draftPage.waitForLoadState("domcontentloaded");
  await expect(draftPage.getByTestId("long-form-root")).toBeVisible();

  await expect
    .poll(
      async () => {
        const url = new URL(draftPage.url());
        return {
          pathname: url.pathname,
          hasDraft: url.searchParams.has("draft"),
          hasSession: url.searchParams.has("session"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected the Induccion Organizacional draft opened from hub to restore the exact remote draft and then hide draft mode from the URL.",
      }
    )
    .toEqual({
      pathname: "/formularios/induccion-organizacional",
      hasDraft: false,
      hasSession: true,
    });

  await expect(draftPage.getByTestId("section_5.observaciones")).toHaveValue(
    "Observaciones de prueba."
  );
});

test("@integration induccion-operativa keeps the session route after persisting a remote draft", async ({
  page,
}) => {
  await openSeededForm(page, "induccion-operativa", {
    sessionId: "e2e-induccion-operativa-hidden-draft",
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await expect
    .poll(
      async () => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          session: url.searchParams.get("session"),
          draft: url.searchParams.get("draft"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected Induccion Operativa to keep the visible editor in session mode after persisting a remote draft.",
      }
    )
    .toEqual({
      pathname: "/formularios/induccion-operativa",
      session: "e2e-induccion-operativa-hidden-draft",
      draft: null,
    });

  await page.reload();

  await expect(page.getByTestId("ajustes_requeridos")).toHaveValue(
    "Ajustes de prueba para QA."
  );
});

test("@integration induccion-operativa restores a persisted draft and normalizes back to session mode", async ({
  page,
}) => {
  const sessionId = "e2e-induccion-operativa-bootstrap";
  const draftId = "persisted-induccion-operativa-bootstrap";

  await openSeededForm(page, "induccion-operativa", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();
  await reopenSessionAsPersistedDraft({
    page,
    slug: "induccion-operativa",
    sessionId,
    draftId,
  });

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
        message:
          "Expected Induccion Operativa to bootstrap from ?draft= and then normalize back to a stable session route.",
      }
    )
    .toEqual({
      pathname: "/formularios/induccion-operativa",
      hasDraft: false,
      hasSession: true,
    });

  await expect(page.getByTestId("ajustes_requeridos")).toHaveValue(
    "Ajustes de prueba para QA."
  );
});

test("@integration induccion-operativa opens the exact hub draft without switching to visible draft mode", async ({
  page,
  context,
}) => {
  const sessionId = "e2e-induccion-operativa-hub-bootstrap";

  await openSeededForm(page, "induccion-operativa", {
    sessionId,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);
  await getVisibleDraftSaveButton(page).click();

  await page.goto("/hub");
  await page.getByTestId("hub-drafts-button").click();
  await expect(page.getByTestId("drafts-drawer")).toBeVisible();
  const draftOpenButton = page.locator('[data-testid^="hub-draft-open-"]').first();

  const newPagePromise = context.waitForEvent("page");
  await draftOpenButton.click();
  const draftPage = await newPagePromise;
  await draftPage.waitForLoadState("domcontentloaded");
  await expect(draftPage.getByTestId("long-form-root")).toBeVisible();

  await expect
    .poll(
      async () => {
        const url = new URL(draftPage.url());
        return {
          pathname: url.pathname,
          hasDraft: url.searchParams.has("draft"),
          hasSession: url.searchParams.has("session"),
        };
      },
      {
        timeout: 10_000,
        message:
          "Expected the Induccion Operativa draft opened from hub to restore the exact remote draft and then hide draft mode from the URL.",
      }
    )
    .toEqual({
      pathname: "/formularios/induccion-operativa",
      hasDraft: false,
      hasSession: true,
    });

  await expect(draftPage.getByTestId("ajustes_requeridos")).toHaveValue(
    "Ajustes de prueba para QA."
  );
});
