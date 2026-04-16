import { expect, type Page } from "@playwright/test";
import { seedEmpresaSelection } from "./empresa";

type LongFormSlug =
  | "presentacion"
  | "sensibilizacion"
  | "condiciones-vacante"
  | "seleccion"
  | "contratacion"
  | "induccion-organizacional"
  | "induccion-operativa";

type OpenSeededFormOptions = {
  sessionId?: string;
  draftId?: string;
  newDraft?: boolean;
  waitForPersistedIdentity?: boolean;
};

type WaitForDraftAutosaveOptions = {
  initialSavedAt?: string;
};

export async function openSeededForm(
  page: Page,
  slug: LongFormSlug,
  options?: OpenSeededFormOptions
) {
  await seedEmpresaSelection(page);

  const params = new URLSearchParams();
  if (options?.sessionId) {
    params.set("session", options.sessionId);
  }
  if (options?.draftId) {
    params.set("draft", options.draftId);
  }
  if (options?.newDraft) {
    params.set("new", "1");
  }

  const query = params.toString();
  await page.goto(`/formularios/${slug}${query ? `?${query}` : ""}`);
  await expect(page.getByTestId("long-form-root")).toBeVisible();
  if (options?.waitForPersistedIdentity !== false) {
    await page.waitForFunction(() => {
      const url = new URL(window.location.href);
      return url.searchParams.has("draft") || url.searchParams.has("session");
    });
  }
}

export async function waitForDraftAutosave(
  page: Page,
  options?: WaitForDraftAutosaveOptions
) {
  const status = page.locator('[data-testid="draft-persistence-status"]:visible');
  await expect(status).toBeVisible();

  const initialSaveState = await status.getAttribute("data-save-state");
  const initialSavedAt =
    options?.initialSavedAt ??
    ((await status.getAttribute("data-local-saved-at")) ?? "");

  if (initialSaveState === "saved" && initialSavedAt) {
    return;
  }

  try {
    await expect
      .poll(
        async () => {
          const saveState = await status.getAttribute("data-save-state");
          const nextSavedAt = (await status.getAttribute("data-local-saved-at")) ?? "";

          if (saveState === "saving") {
            return "saving";
          }

          if (nextSavedAt !== initialSavedAt) {
            return "saved";
          }

          return saveState ?? "missing";
        },
        {
          timeout: 5000,
          message: "Expected draft autosave to start or refresh the local timestamp.",
        }
      )
      .toMatch(/saving|saved/);
  } catch {
    // Si el guardado termina demasiado rapido para observar "saving",
    // la comprobacion final sobre el timestamp actualizado sigue siendo
    // la fuente de verdad.
  }

  await expect
    .poll(
      async () => {
        const saveState = await status.getAttribute("data-save-state");
        const nextSavedAt = (await status.getAttribute("data-local-saved-at")) ?? "";

        if (nextSavedAt && nextSavedAt !== initialSavedAt) {
          return "saved";
        }

        if (saveState === "error") {
          return "error";
        }

        return saveState ?? "missing";
      },
      {
        timeout: 10000,
        message: "Expected draft autosave to finish with an updated local save timestamp.",
      }
    )
    .toBe("saved");
}

export function getVisibleDraftSaveButton(page: Page) {
  return page.locator('[data-testid="draft-save-button"]:visible');
}

export async function fillFieldAndWaitForDraftAutosave(
  page: Page,
  testId: string,
  value: string
) {
  const status = page.locator('[data-testid="draft-persistence-status"]:visible');
  const initialSavedAt = (await status.getAttribute("data-local-saved-at")) ?? "";
  await page.getByTestId(testId).fill(value);
  await waitForDraftAutosave(page, { initialSavedAt });
}
