export type {
  DraftMeta,
  DraftSummary,
  HubDraft,
  HubDraftSyncStatus,
  LocalDraft,
  LocalDraftIndexEntry,
  ReadLocalCopyResult,
  SaveLocalCopyResult,
} from "./drafts/shared";

export {
  buildDraftMeta,
  buildDraftSummary,
  getDraftUpdatedAt,
  getErrorMessage,
  hasRemoteCheckpoint,
  isMissingDraftSchemaError,
  LOCAL_DRAFT_INDEX_KEY,
  LOCAL_DRAFT_PREFIX,
} from "./drafts/shared";

export {
  getCheckpointColumnsMode,
  getDraftSchemaMode,
  markCheckpointColumnsUnsupported,
  markDraftSchemaExtended,
  markDraftSchemaLegacy,
} from "./drafts/state";

export {
  getStorageKey,
  readLocalCopy,
  removeLocalCopy,
  saveLocalCopy,
} from "./drafts/localCopies";

export { buildHubDrafts, reconcileLocalDraftIndex } from "./drafts/reconcile";

export {
  fetchDraftPayload,
  fetchDraftSummaries,
  fetchRecoverableRemoteDraftIds,
  getCurrentUserId,
  getDraftCheckpointWritePayload,
  getDraftFields,
  getDraftStubWritePayload,
  getDraftWritePayload,
  getEmpresaFromNit,
  runDraftSelect,
} from "./drafts/remoteDrafts";
