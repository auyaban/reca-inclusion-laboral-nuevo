import { listDraftPayloadKeys } from "@/lib/draftStorage";
import {
  buildLocalDraftIndexEntry,
  readLocalDraftIndex,
  writeLocalDraftIndex,
} from "./localIndex";
import { getStorageKey, parseStorageKey, readLocalCopy } from "./localCopies";
import {
  buildDraftReconcileFingerprint,
  buildLocalDraftIndexId,
  compareTimestamps,
  getDraftUpdatedAt,
  getLocalStorageHandle,
  hasRemoteCheckpoint,
  listLocalStorageKeys,
  LOCAL_DRAFT_PREFIX,
  type DraftSummary,
  type HubDraft,
  type LocalDraft,
  type LocalDraftIndexEntry,
} from "./shared";
import {
  getReconcileLocalDraftIndexPromise,
  setReconcileLocalDraftIndexPromise,
} from "./state";

export async function reconcileLocalDraftIndex() {
  const pendingPromise = getReconcileLocalDraftIndexPromise();
  if (pendingPromise) {
    return pendingPromise;
  }

  const nextPromise = (async () => {
    const reconciled = new Map<string, LocalDraftIndexEntry>();
    const draftFingerprints = new Set<string>();
    const sessionEntryIdsByFingerprint = new Map<string, Set<string>>();
    const indexedEntries = readLocalDraftIndex();
    let canPersistReconciledIndex = true;

    const commitEntry = (
      entry: LocalDraftIndexEntry,
      localDraft: LocalDraft,
      options?: { skipIfDuplicateSession?: boolean }
    ) => {
      const fingerprint = buildDraftReconcileFingerprint(
        entry.slug,
        localDraft,
        entry.empresaNit,
        entry.empresaNombre
      );

      if (
        options?.skipIfDuplicateSession &&
        !entry.draftId &&
        draftFingerprints.has(fingerprint)
      ) {
        return;
      }

      if (entry.draftId) {
        const duplicateSessionIds = sessionEntryIdsByFingerprint.get(fingerprint);
        if (duplicateSessionIds) {
          for (const sessionEntryId of duplicateSessionIds) {
            reconciled.delete(sessionEntryId);
          }
          sessionEntryIdsByFingerprint.delete(fingerprint);
        }
      }

      reconciled.set(entry.id, entry);
      if (entry.draftId) {
        draftFingerprints.add(fingerprint);
      } else {
        const fingerprintEntries =
          sessionEntryIdsByFingerprint.get(fingerprint) ?? new Set<string>();
        fingerprintEntries.add(entry.id);
        sessionEntryIdsByFingerprint.set(fingerprint, fingerprintEntries);
      }
    };

    for (const entry of indexedEntries) {
      const storageKey = getStorageKey(entry.slug, entry.draftId, entry.sessionId);
      const { draft: localDraft } = await readLocalCopy(storageKey);
      if (!localDraft) {
        continue;
      }

      const refreshedEntry = buildLocalDraftIndexEntry({
        slug: entry.slug,
        sessionId: entry.sessionId,
        draftId: entry.draftId,
        step: localDraft.step,
        updatedAt: localDraft.updatedAt ?? entry.updatedAt,
        empresaSnapshot: localDraft.empresa ?? entry.empresaSnapshot,
        empresaNit: entry.empresaNit,
        empresaNombre: entry.empresaNombre,
      });

      if (refreshedEntry) {
        commitEntry(refreshedEntry, localDraft);
      }
    }

    try {
      const indexedDbKeysResult = await listDraftPayloadKeys();
      if (indexedDbKeysResult.ok) {
        const indexedDbKeys = indexedDbKeysResult.value;
        for (const storageKey of indexedDbKeys) {
          const parsedKey = parseStorageKey(storageKey);
          if (!parsedKey) {
            continue;
          }

          const entryId = buildLocalDraftIndexId(
            parsedKey.slug,
            parsedKey.draftId,
            parsedKey.sessionId
          );
          if (reconciled.has(entryId)) {
            continue;
          }

          const { draft: localDraft } = await readLocalCopy(storageKey);
          if (!localDraft) {
            continue;
          }

          const discoveredEntry = buildLocalDraftIndexEntry({
            slug: parsedKey.slug,
            sessionId: parsedKey.sessionId,
            draftId: parsedKey.draftId,
            step: localDraft.step,
            updatedAt: localDraft.updatedAt,
            empresaSnapshot: localDraft.empresa,
          });

          if (discoveredEntry) {
            commitEntry(discoveredEntry, localDraft, {
              skipIfDuplicateSession: true,
            });
          }
        }
      } else {
        canPersistReconciledIndex = false;
      }
    } catch {
      canPersistReconciledIndex = false;
    }

    const localStorageHandle = getLocalStorageHandle();
    if (!localStorageHandle) {
      canPersistReconciledIndex = false;
    } else {
      try {
        const localStorageKeys = listLocalStorageKeys(
          localStorageHandle,
          LOCAL_DRAFT_PREFIX
        );
        for (const storageKey of localStorageKeys) {
          const parsedKey = parseStorageKey(storageKey);
          if (!parsedKey) {
            continue;
          }

          const entryId = buildLocalDraftIndexId(
            parsedKey.slug,
            parsedKey.draftId,
            parsedKey.sessionId
          );
          if (reconciled.has(entryId)) {
            continue;
          }

          const { draft: localDraft } = await readLocalCopy(storageKey);
          if (!localDraft) {
            continue;
          }

          const discoveredEntry = buildLocalDraftIndexEntry({
            slug: parsedKey.slug,
            sessionId: parsedKey.sessionId,
            draftId: parsedKey.draftId,
            step: localDraft.step,
            updatedAt: localDraft.updatedAt,
            empresaSnapshot: localDraft.empresa,
          });

          if (discoveredEntry) {
            commitEntry(discoveredEntry, localDraft, {
              skipIfDuplicateSession: true,
            });
          }
        }
      } catch {
        canPersistReconciledIndex = false;
      }
    }

    const nextEntries = Array.from(reconciled.values()).sort((left, right) =>
      compareTimestamps(right.updatedAt, left.updatedAt)
    );

    if (canPersistReconciledIndex) {
      writeLocalDraftIndex(nextEntries);
    }
    return nextEntries;
  })();

  setReconcileLocalDraftIndexPromise(nextPromise);

  try {
    return await nextPromise;
  } finally {
    setReconcileLocalDraftIndexPromise(null);
  }
}

export function buildHubDrafts(
  remoteDrafts: DraftSummary[],
  localEntries: LocalDraftIndexEntry[]
) {
  const drafts: HubDraft[] = [];
  const usedRemoteDraftIds = new Set<string>();
  const remoteDraftsById = new Map(
    remoteDrafts.map((draft) => [draft.id, draft] as const)
  );

  for (const localEntry of localEntries) {
    const remoteDraft =
      localEntry.draftId ? remoteDraftsById.get(localEntry.draftId) : null;

    if (!remoteDraft || !hasRemoteCheckpoint(remoteDraft)) {
      drafts.push({
        id: localEntry.id,
        form_slug: localEntry.slug,
        empresa_nit: localEntry.empresaNit,
        empresa_nombre: localEntry.empresaNombre,
        empresa_snapshot: localEntry.empresaSnapshot,
        step: localEntry.step,
        draftId: remoteDraft?.id ?? localEntry.draftId,
        sessionId: localEntry.sessionId,
        localUpdatedAt: localEntry.updatedAt,
        remoteUpdatedAt: remoteDraft ? getDraftUpdatedAt(remoteDraft) : null,
        effectiveUpdatedAt: localEntry.updatedAt,
        syncStatus: "local_only",
      });

      if (remoteDraft) {
        usedRemoteDraftIds.add(remoteDraft.id);
      }
      continue;
    }

    usedRemoteDraftIds.add(remoteDraft.id);

    const remoteUpdatedAt = getDraftUpdatedAt(remoteDraft);
    const localIsNewer = compareTimestamps(localEntry.updatedAt, remoteUpdatedAt) > 0;
    const empresaSnapshot =
      localEntry.empresaSnapshot ?? remoteDraft.empresa_snapshot;

    drafts.push({
      id: buildLocalDraftIndexId(
        remoteDraft.form_slug,
        remoteDraft.id,
        localEntry.sessionId
      ),
      form_slug: remoteDraft.form_slug,
      empresa_nit: localEntry.empresaNit || remoteDraft.empresa_nit,
      empresa_nombre:
        localEntry.empresaNombre ?? remoteDraft.empresa_nombre ?? undefined,
      empresa_snapshot: empresaSnapshot,
      step: localIsNewer ? localEntry.step : remoteDraft.step,
      draftId: remoteDraft.id,
      sessionId: localEntry.sessionId,
      localUpdatedAt: localEntry.updatedAt,
      remoteUpdatedAt,
      effectiveUpdatedAt: localIsNewer ? localEntry.updatedAt : remoteUpdatedAt,
      syncStatus: localIsNewer ? "local_newer" : "synced",
    });
  }

  for (const remoteDraft of remoteDrafts) {
    if (usedRemoteDraftIds.has(remoteDraft.id)) {
      continue;
    }

    if (!hasRemoteCheckpoint(remoteDraft)) {
      continue;
    }

    const remoteUpdatedAt = getDraftUpdatedAt(remoteDraft);
    drafts.push({
      id: buildLocalDraftIndexId(
        remoteDraft.form_slug,
        remoteDraft.id,
        `draft:${remoteDraft.id}`
      ),
      form_slug: remoteDraft.form_slug,
      empresa_nit: remoteDraft.empresa_nit,
      empresa_nombre: remoteDraft.empresa_nombre,
      empresa_snapshot: remoteDraft.empresa_snapshot,
      step: remoteDraft.step,
      draftId: remoteDraft.id,
      sessionId: null,
      localUpdatedAt: null,
      remoteUpdatedAt,
      effectiveUpdatedAt: remoteUpdatedAt,
      syncStatus: "remote_only",
    });
  }

  return drafts.sort((left, right) =>
    compareTimestamps(right.effectiveUpdatedAt, left.effectiveUpdatedAt)
  );
}
