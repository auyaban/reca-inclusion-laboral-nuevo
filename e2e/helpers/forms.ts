import { expect, type Page } from "@playwright/test";
import { seedEmpresaSelection } from "./empresa";

type LongFormSlug =
  | "presentacion"
  | "evaluacion"
  | "sensibilizacion"
  | "condiciones-vacante"
  | "seleccion"
  | "contratacion"
  | "interprete-lsc"
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
  await expect(page.getByTestId("long-form-root")).toBeVisible({
    timeout: 15000,
  });
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

export async function waitForDraftRoute(page: Page) {
  await expect
    .poll(
      async () => new URL(page.url()).searchParams.get("draft"),
      {
        timeout: 10000,
        message: "Expected the form URL to promote to a persisted draft route.",
      }
    )
    .not.toBeNull();

  return new URL(page.url()).searchParams.get("draft") as string;
}

export async function reopenSessionAsPersistedDraft(options: {
  page: Page;
  slug: LongFormSlug;
  sessionId: string;
  draftId: string;
}) {
  const { page, slug, sessionId, draftId } = options;

  await page.evaluate(
    async ({ slug: nextSlug, sessionId: nextSessionId, draftId: nextDraftId }) => {
      const sessionKey = `draft__${nextSlug}__session__${nextSessionId}`;
      const persistedDraftKey = `draft__${nextSlug}__${nextDraftId}`;
      const rawSessionDraft = window.localStorage.getItem(sessionKey);

      const draftIndexKey = "draft_index__v1";
      const aliasKey = "draft_aliases__v1";

      if (rawSessionDraft) {
        window.localStorage.setItem(persistedDraftKey, rawSessionDraft);
        window.localStorage.removeItem(sessionKey);
      }

      const clonedPayload = await new Promise<Record<string, unknown> | null>(
        (resolve, reject) => {
          const request = window.indexedDB.open("reca-drafts", 1);

          request.onerror = () => {
            reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
          };

          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("draft-payloads", "readonly");
            const store = transaction.objectStore("draft-payloads");
            const getRequest = store.get(sessionKey);

            getRequest.onerror = () => {
              reject(
                getRequest.error ?? new Error("No se pudo leer el draft local")
              );
            };

            getRequest.onsuccess = () => {
              const result = getRequest.result as Record<string, unknown> | undefined;
              if (!result) {
                resolve(null);
                return;
              }

              resolve({
                ...result,
                storageKey: persistedDraftKey,
              });
            };
          };
        }
      );

      if (clonedPayload) {
        await new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.open("reca-drafts", 1);

          request.onerror = () => {
            reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
          };

          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("draft-payloads", "readwrite");
            const store = transaction.objectStore("draft-payloads");
            const putRequest = store.put(clonedPayload);
            const deleteRequest = store.delete(sessionKey);

            const fail = (error: unknown) => {
              reject(error ?? new Error("No se pudo clonar el draft local"));
            };

            putRequest.onerror = () => fail(putRequest.error);
            deleteRequest.onerror = () => fail(deleteRequest.error);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => fail(transaction.error);
            transaction.onabort = () =>
              fail(transaction.error ?? new Error("La transaccion fue abortada"));
          };
        });
      }

      if (!rawSessionDraft && !clonedPayload) {
        throw new Error(`Missing local session draft for ${sessionKey}`);
      }

      const rawIndex = window.localStorage.getItem(draftIndexKey);
      if (rawIndex) {
        try {
          const parsedIndex = JSON.parse(rawIndex) as Array<Record<string, unknown>>;
          const nextIndex = parsedIndex
            .filter(
              (entry) =>
                !(
                  entry &&
                  entry.slug === nextSlug &&
                  entry.sessionId === nextSessionId
                )
            )
            .map((entry) =>
              entry &&
              entry.slug === nextSlug &&
              entry.draftId === nextDraftId
                ? entry
                : entry
            );
          const sessionEntry = parsedIndex.find(
            (entry) =>
              entry &&
              entry.slug === nextSlug &&
              entry.sessionId === nextSessionId
          );

          if (sessionEntry) {
            nextIndex.push({
              ...sessionEntry,
              id: `draft:${nextDraftId}`,
              draftId: nextDraftId,
            });
          }

          window.localStorage.setItem(draftIndexKey, JSON.stringify(nextIndex));
        } catch {
          // ignore malformed draft index in tests
        }
      }

      const rawAliases = window.localStorage.getItem(aliasKey);
      if (rawAliases) {
        try {
          const parsedAliases = JSON.parse(rawAliases) as Record<string, string>;
          delete parsedAliases[`${nextSlug}::${nextSessionId}`];
          if (Object.keys(parsedAliases).length === 0) {
            window.localStorage.removeItem(aliasKey);
          } else {
            window.localStorage.setItem(aliasKey, JSON.stringify(parsedAliases));
          }
        } catch {
          // ignore malformed aliases in tests
        }
      }
    },
    { slug, sessionId, draftId }
  );

  await page.goto(`/formularios/${slug}?draft=${draftId}`);
  await expect(page.getByTestId("long-form-root")).toBeVisible();
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
