import { expect, test } from "@playwright/test";
import {
  fillFieldAndWaitForDraftAutosave,
  openSeededForm,
} from "./helpers/forms";

test("@integration seleccion restores the local draft after reload", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion", {
    sessionId: "e2e-seleccion-draft-restore-local",
  });

  await fillFieldAndWaitForDraftAutosave(
    page,
    "desarrollo_actividad",
    "Actividad restaurada desde autosave."
  );

  await page.reload();

  await expect(page.getByTestId("desarrollo_actividad")).toHaveValue(
    "Actividad restaurada desde autosave."
  );
});

test("@integration seleccion keeps the same local draft state across tabs for the same session", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion", {
    sessionId: "e2e-seleccion-shared-session",
  });

  await fillFieldAndWaitForDraftAutosave(
    page,
    "desarrollo_actividad",
    "Actividad compartida entre pestanas."
  );

  const currentUrl = page.url();
  const secondPage = await page.context().newPage();

  try {
    await secondPage.goto(currentUrl);
    await expect(secondPage.getByTestId("desarrollo_actividad")).toHaveValue(
      "Actividad compartida entre pestanas."
    );
  } finally {
    await secondPage.close();
  }
});
