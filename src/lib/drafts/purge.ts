"use client";

import { deletePendingCheckpoint } from "@/lib/draftStorage";
import {
  findDraftAliasSessions,
  getDraftAlias,
  removeDraftAlias,
  removeDraftAliasesByDraftId,
} from "./aliases";
import { getStorageKey, removeLocalCopy } from "./localCopies";
import { readLocalDraftIndex, removeLocalDraftIndexEntry } from "./localIndex";
import { buildLocalDraftIndexId } from "./shared";

type PurgeDraftArtifactsParams = {
  slug?: string | null;
  draftId?: string | null;
  sessionId?: string | null;
};

export async function purgeDraftArtifacts({
  slug,
  draftId = null,
  sessionId = null,
}: PurgeDraftArtifactsParams = {}) {
  const targetSlug = slug?.trim() || null;
  if (!targetSlug) {
    return;
  }

  let targetDraftId = draftId?.trim() || null;
  const targetSessionId = sessionId?.trim() || null;

  if (!targetDraftId && targetSessionId) {
    targetDraftId = getDraftAlias(targetSlug, targetSessionId);
  }

  const sessionIds = new Set<string>();
  if (targetSessionId) {
    sessionIds.add(targetSessionId);
  }

  if (targetDraftId) {
    for (const linkedSessionId of findDraftAliasSessions(targetSlug, targetDraftId)) {
      sessionIds.add(linkedSessionId);
    }

    for (const entry of readLocalDraftIndex()) {
      if (entry.slug === targetSlug && entry.draftId === targetDraftId) {
        sessionIds.add(entry.sessionId);
      }
    }
  }

  const storageKeys = new Set<string>();
  if (targetDraftId) {
    const draftStorageKey = getStorageKey(
      targetSlug,
      targetDraftId,
      targetSessionId ?? `draft:${targetDraftId}`
    );
    if (draftStorageKey) {
      storageKeys.add(draftStorageKey);
    }
  }

  for (const linkedSessionId of sessionIds) {
    const sessionStorageKey = getStorageKey(targetSlug, null, linkedSessionId);
    if (sessionStorageKey) {
      storageKeys.add(sessionStorageKey);
    }
  }

  for (const storageKey of storageKeys) {
    await removeLocalCopy(storageKey);
    await deletePendingCheckpoint(storageKey);
  }

  if (targetDraftId) {
    removeLocalDraftIndexEntry(
      buildLocalDraftIndexId(targetSlug, targetDraftId, `draft:${targetDraftId}`)
    );
    removeDraftAliasesByDraftId(targetSlug, targetDraftId);
  }

  for (const linkedSessionId of sessionIds) {
    removeLocalDraftIndexEntry(
      buildLocalDraftIndexId(targetSlug, null, linkedSessionId)
    );
    removeDraftAlias(targetSlug, linkedSessionId);
  }
}
