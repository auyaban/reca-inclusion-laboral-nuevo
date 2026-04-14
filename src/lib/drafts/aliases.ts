"use client";

import { getLocalStorageHandle, isRecord } from "./shared";

export const LOCAL_DRAFT_ALIASES_KEY = "draft_aliases__v1";

type DraftAliasMap = Record<string, string>;

function buildDraftAliasKey(slug: string, sessionId: string) {
  return `${slug}::${sessionId}`;
}

function readDraftAliasMap(): DraftAliasMap {
  const storage = getLocalStorageHandle();
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(LOCAL_DRAFT_ALIASES_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) =>
          typeof key === "string" &&
          key.trim() &&
          typeof value === "string" &&
          value.trim()
      )
    ) as DraftAliasMap;
  } catch {
    return {};
  }
}

function writeDraftAliasMap(aliases: DraftAliasMap) {
  const storage = getLocalStorageHandle();
  if (!storage) {
    return;
  }

  try {
    if (Object.keys(aliases).length === 0) {
      storage.removeItem(LOCAL_DRAFT_ALIASES_KEY);
      return;
    }

    storage.setItem(LOCAL_DRAFT_ALIASES_KEY, JSON.stringify(aliases));
  } catch {
    // ignore
  }
}

export function getDraftAlias(slug: string, sessionId: string) {
  if (!slug || !sessionId) {
    return null;
  }

  const aliases = readDraftAliasMap();
  return aliases[buildDraftAliasKey(slug, sessionId)] ?? null;
}

export function setDraftAlias(slug: string, sessionId: string, draftId: string) {
  if (!slug || !sessionId || !draftId) {
    return;
  }

  const aliases = readDraftAliasMap();
  aliases[buildDraftAliasKey(slug, sessionId)] = draftId;
  writeDraftAliasMap(aliases);
}

export function removeDraftAlias(slug: string, sessionId: string) {
  if (!slug || !sessionId) {
    return;
  }

  const aliases = readDraftAliasMap();
  delete aliases[buildDraftAliasKey(slug, sessionId)];
  writeDraftAliasMap(aliases);
}

export function findDraftAliasSessions(slug: string, draftId: string) {
  if (!slug || !draftId) {
    return [];
  }

  const prefix = `${slug}::`;

  return Object.entries(readDraftAliasMap())
    .filter(
      ([key, value]) =>
        key.startsWith(prefix) && value === draftId && key.length > prefix.length
    )
    .map(([key]) => key.slice(prefix.length));
}

export function removeDraftAliasesByDraftId(slug: string, draftId: string) {
  if (!slug || !draftId) {
    return;
  }

  const aliases = readDraftAliasMap();
  let changed = false;

  for (const [key, value] of Object.entries(aliases)) {
    if (key.startsWith(`${slug}::`) && value === draftId) {
      delete aliases[key];
      changed = true;
    }
  }

  if (changed) {
    writeDraftAliasMap(aliases);
  }
}
