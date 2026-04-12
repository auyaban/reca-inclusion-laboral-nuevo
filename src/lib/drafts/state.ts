import type {
  CheckpointColumnsMode,
  CurrentUserIdCache,
  DraftSchemaMode,
  LocalDraftIndexEntry,
} from "./shared";

type DraftsRuntimeState = {
  draftSchemaMode: DraftSchemaMode;
  checkpointColumnsMode: CheckpointColumnsMode;
  reconcileLocalDraftIndexPromise: Promise<LocalDraftIndexEntry[]> | null;
  currentUserIdCache: CurrentUserIdCache;
};

const runtimeState: DraftsRuntimeState = {
  draftSchemaMode: "unknown",
  checkpointColumnsMode: "unknown",
  reconcileLocalDraftIndexPromise: null,
  currentUserIdCache: undefined,
};

export function getDraftSchemaMode() {
  return runtimeState.draftSchemaMode;
}

export function setDraftSchemaMode(mode: DraftSchemaMode) {
  runtimeState.draftSchemaMode = mode;
}

export function getCheckpointColumnsMode() {
  return runtimeState.checkpointColumnsMode;
}

export function setCheckpointColumnsMode(mode: CheckpointColumnsMode) {
  runtimeState.checkpointColumnsMode = mode;
}

export function markCheckpointColumnsUnsupported() {
  setCheckpointColumnsMode("unsupported");
}

export function markDraftSchemaLegacy() {
  setDraftSchemaMode("legacy");
}

export function markDraftSchemaExtended() {
  setDraftSchemaMode("extended");
}

export function getReconcileLocalDraftIndexPromise() {
  return runtimeState.reconcileLocalDraftIndexPromise;
}

export function setReconcileLocalDraftIndexPromise(
  promise: Promise<LocalDraftIndexEntry[]> | null
) {
  runtimeState.reconcileLocalDraftIndexPromise = promise;
}

export function getCurrentUserIdCache() {
  return runtimeState.currentUserIdCache;
}

export function setCurrentUserIdCache(cache: CurrentUserIdCache) {
  runtimeState.currentUserIdCache = cache;
}
