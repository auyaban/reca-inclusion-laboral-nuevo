import {
  deleteDraftPayload,
  readDraftPayload,
  toLocalPersistenceStatus,
  writeDraftPayload,
} from "@/lib/draftStorage";
import { parseEmpresaSnapshot } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  buildLocalDraftIndexEntry,
  removeLocalDraftIndexEntry,
  upsertLocalDraftIndexEntry,
} from "@/lib/drafts/localIndex";
import {
  buildLocalDraftIndexId,
  getLocalStorageHandle,
  isRecord,
  LOCAL_DRAFT_PREFIX,
  normalizeDraftData,
  parseLegacyUpdatedAt,
  type ReadLocalCopyResult,
  type SaveLocalCopyResult,
} from "./shared";

const LOCAL_PERSISTENCE_UNAVAILABLE_MESSAGE =
  "Guardado local no disponible en este navegador. Guarda en la nube antes de cerrar o cambiar de pestana.";

function buildUnavailableLocalPersistenceState() {
  return toLocalPersistenceStatus({
    ok: false,
    value: null,
    mode: "unavailable",
    errorCode: "missing_storage_key",
    message: LOCAL_PERSISTENCE_UNAVAILABLE_MESSAGE,
  });
}

export function getStorageKey(
  slug: string | null | undefined,
  draftId: string | null,
  localDraftSessionId: string
) {
  if (!slug) {
    return null;
  }

  if (draftId) {
    return `draft__${slug}__${draftId}`;
  }

  return `draft__${slug}__session__${localDraftSessionId}`;
}

export function parseStorageKey(storageKey: string) {
  if (!storageKey.startsWith(LOCAL_DRAFT_PREFIX)) {
    return null;
  }

  const parts = storageKey.split("__");
  if (parts.length === 4 && parts[2] === "session") {
    return {
      slug: parts[1],
      draftId: null,
      sessionId: parts[3],
    };
  }

  if (parts.length === 3) {
    return {
      slug: parts[1],
      draftId: parts[2],
      sessionId: `draft:${parts[2]}`,
    };
  }

  return null;
}

export async function saveLocalCopy(
  storageKey: string | null,
  step: number,
  data: Record<string, unknown>,
  empresaSnapshot: Empresa | null,
  updatedAtOverride?: string | null,
  options?: {
    sessionIdOverride?: string | null;
  }
): Promise<SaveLocalCopyResult> {
  if (!storageKey) {
    return {
      ...buildUnavailableLocalPersistenceState(),
      updatedAt: null,
    };
  }

  const updatedAt =
    typeof updatedAtOverride === "string" && updatedAtOverride.trim()
      ? updatedAtOverride
      : new Date().toISOString();

  const result = await writeDraftPayload(storageKey, {
    step,
    data,
    empresaSnapshot,
    updatedAt,
  });

  if (result.value) {
    const parsedStorageKey = parseStorageKey(storageKey);
    if (parsedStorageKey) {
      const nextIndexEntry = buildLocalDraftIndexEntry({
        slug: parsedStorageKey.slug,
        sessionId:
          options?.sessionIdOverride?.trim() || parsedStorageKey.sessionId,
        draftId: parsedStorageKey.draftId,
        step,
        updatedAt: result.value,
        empresaSnapshot,
        data,
      });
      if (nextIndexEntry) {
        upsertLocalDraftIndexEntry(nextIndexEntry);
        if (
          options?.sessionIdOverride?.trim() &&
          options.sessionIdOverride !== parsedStorageKey.sessionId
        ) {
          removeLocalDraftIndexEntry(
            buildLocalDraftIndexId(
              parsedStorageKey.slug,
              parsedStorageKey.draftId,
              parsedStorageKey.sessionId
            )
          );
        }
      }
    }
  }

  return {
    ...toLocalPersistenceStatus(result),
    updatedAt: result.value,
  };
}

export async function removeLocalCopy(storageKey: string | null) {
  if (!storageKey) {
    return;
  }

  const parsedStorageKey = parseStorageKey(storageKey);

  const localStorageHandle = getLocalStorageHandle();
  if (localStorageHandle) {
    try {
      localStorageHandle.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  await deleteDraftPayload(storageKey);

  if (parsedStorageKey) {
    removeLocalDraftIndexEntry(
      buildLocalDraftIndexId(
        parsedStorageKey.slug,
        parsedStorageKey.draftId,
        parsedStorageKey.sessionId
      )
    );
  }
}

export async function readLocalCopy(
  storageKey: string | null
): Promise<ReadLocalCopyResult> {
  if (!storageKey) {
    return {
      ...buildUnavailableLocalPersistenceState(),
      draft: null,
    };
  }

  const indexedPayload = await readDraftPayload(storageKey);
  if (indexedPayload.value) {
    return {
      ...toLocalPersistenceStatus(indexedPayload),
      draft: {
        step: indexedPayload.value.step,
        data: normalizeDraftData(indexedPayload.value.data),
        empresa: parseEmpresaSnapshot(indexedPayload.value.empresaSnapshot),
        updatedAt: indexedPayload.value.updatedAt ?? null,
      },
    };
  }

  const localStorageHandle = getLocalStorageHandle();
  if (!localStorageHandle) {
    return {
      ...toLocalPersistenceStatus(indexedPayload),
      draft: null,
    };
  }

  try {
    const raw = localStorageHandle.getItem(storageKey);
    if (!raw) {
      return {
        ...toLocalPersistenceStatus(indexedPayload),
        draft: null,
      };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {
        ...toLocalPersistenceStatus(indexedPayload),
        draft: null,
      };
    }

    if (parsed.version === 2) {
      const localDraft = {
        step: typeof parsed.step === "number" ? parsed.step : 0,
        data: normalizeDraftData(parsed.data),
        empresa: parseEmpresaSnapshot(parsed.empresaSnapshot),
        updatedAt:
          typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
            ? parsed.updatedAt
            : null,
      };

      const savedPayload = await writeDraftPayload(storageKey, {
        step: localDraft.step,
        data: localDraft.data,
        empresaSnapshot: localDraft.empresa,
        updatedAt: localDraft.updatedAt ?? new Date().toISOString(),
      });

      if (savedPayload.ok) {
        localStorageHandle.removeItem(storageKey);
      }

      return {
        ...toLocalPersistenceStatus(savedPayload),
        draft: {
          ...localDraft,
          updatedAt: savedPayload.value ?? localDraft.updatedAt,
        },
      };
    }

    const localDraft = {
      step: typeof parsed.step === "number" ? parsed.step : 0,
      data: normalizeDraftData(parsed.data),
      empresa: null,
      updatedAt: parseLegacyUpdatedAt(parsed.ts),
    };

    const savedPayload = await writeDraftPayload(storageKey, {
      step: localDraft.step,
      data: localDraft.data,
      empresaSnapshot: localDraft.empresa,
      updatedAt: localDraft.updatedAt ?? new Date().toISOString(),
    });

    if (savedPayload.ok) {
      localStorageHandle.removeItem(storageKey);
    }

    return {
      ...toLocalPersistenceStatus(savedPayload),
      draft: {
        ...localDraft,
        updatedAt: savedPayload.value ?? localDraft.updatedAt,
      },
    };
  } catch {
    return {
      ...toLocalPersistenceStatus(indexedPayload),
      draft: null,
    };
  }
}
