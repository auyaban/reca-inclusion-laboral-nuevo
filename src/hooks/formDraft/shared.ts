"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { DraftStorageMode, LocalPersistenceStatus } from "@/lib/draftStorage";
import type { Empresa } from "@/lib/store/empresaStore";

export type DraftSummary = {
  id: string;
  form_slug: string;
  step: number;
  empresa_nit: string;
  empresa_nombre?: string;
  empresa_snapshot?: Empresa | null;
  updated_at?: string;
  created_at?: string;
  last_checkpoint_at?: string | null;
  last_checkpoint_hash?: string | null;
};

export type DraftMeta = DraftSummary & {
  data: Record<string, unknown>;
  last_checkpoint_hash?: string | null;
};

export type Options = {
  slug?: string | null;
  empresa?: Empresa | null;
  initialDraftId?: string | null;
  initialLocalDraftSessionId?: string | null;
};

export type SaveDraftResult = {
  ok: boolean;
  draftId?: string;
  error?: string;
};

export type EnsureDraftIdentityResult = {
  ok: boolean;
  draftId?: string;
  error?: string;
};

export type DuplicateDraftResult = {
  ok: boolean;
  draftId?: string;
  sessionId?: string;
  error?: string;
};

export type CheckpointDraftReason =
  | "manual"
  | "interval"
  | "pagehide"
  | "visibilitychange";

export type CheckpointDraftResult = SaveDraftResult;

export type RemoteIdentityState =
  | "idle"
  | "creating"
  | "ready"
  | "local_only_fallback";

export type RemoteSyncState =
  | "synced"
  | "syncing"
  | "pending_remote_sync"
  | "local_only_fallback";

export type LocalPersistenceState = DraftStorageMode;

export type EditingAuthorityState = "checking" | "editor" | "read_only";

export type DraftLockConflict = {
  draftId: string;
  ownerTabId: string;
  ownerSeenAt: string;
  canTakeOver: boolean;
};

export type LoadDraftResult = {
  draft: DraftMeta | null;
  empresa: Empresa | null;
  error?: string;
};

export type LocalDraft = {
  step: number;
  data: Record<string, unknown>;
  empresa: Empresa | null;
  updatedAt: string | null;
};

export type PendingCheckpointEntry = {
  slug: string;
  draftId: string | null;
  sessionId: string | null;
  step: number;
  data: Record<string, unknown>;
  empresaSnapshot: Empresa | null;
  updatedAt: string;
  checkpointHash: string;
  reason: CheckpointDraftReason | "retry";
  lastError?: string | null;
};

export type HubDraftSyncStatus =
  | "local_only"
  | "local_newer"
  | "synced"
  | "remote_only";

export type HubDraft = {
  id: string;
  form_slug: string;
  empresa_nit: string;
  empresa_nombre?: string;
  empresa_snapshot: Empresa | null;
  step: number;
  draftId: string | null;
  sessionId: string | null;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  effectiveUpdatedAt: string | null;
  syncStatus: HubDraftSyncStatus;
};

export type DraftRow = {
  id: string;
  form_slug: string;
  empresa_nit: string;
  empresa_nombre: string | null;
  empresa_snapshot: unknown;
  step: number | null;
  data: Record<string, unknown> | null;
  updated_at: string | null;
  created_at: string | null;
  last_checkpoint_at: string | null;
  last_checkpoint_hash: string | null;
};

export const LOCAL_DRAFT_INDEX_KEY = "draft_index__v1";
export const LOCAL_DRAFT_PREFIX = "draft__";
export const REMOTE_CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;

export type SetState<T> = Dispatch<SetStateAction<T>>;
export type ApplyLocalPersistenceStatus = (
  status: LocalPersistenceStatus
) => void;

export type SyncRemoteDraftState = (
  draft: Pick<
    DraftSummary | DraftMeta,
    "updated_at" | "created_at" | "last_checkpoint_at"
  > | null,
  options?: { checkpointHash?: string | null; identityState?: RemoteIdentityState }
) => void;

export type MarkPendingRemoteSync = (
  entry: PendingCheckpointEntry,
  errorMessage?: string | null
) => Promise<void>;

export type ClearPendingRemoteSync = (storageKey: string | null) => Promise<void>;

export type EnsureDraftIdentity = (
  step: number,
  data: Record<string, unknown>
) => Promise<EnsureDraftIdentityResult>;

export type DebounceRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;
export type IntervalRef = MutableRefObject<ReturnType<typeof setInterval> | null>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function createSessionId() {
  return crypto.randomUUID();
}

function getTimestampValue(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function shouldRunAutomaticCheckpoint(referenceTimestamp?: string | null) {
  if (!referenceTimestamp) {
    return true;
  }

  return (
    Date.now() - getTimestampValue(referenceTimestamp) >=
    REMOTE_CHECKPOINT_INTERVAL_MS
  );
}
