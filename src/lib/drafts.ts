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
  buildDraftSnapshotHash,
  buildDraftSummary,
  getDraftIdFromPseudoSessionId,
  getDraftUpdatedAt,
  getErrorMessage,
  getNavigableInvisibleSessionId,
  hasRemoteCheckpoint,
  isPseudoDraftSessionId,
  isMissingDraftSchemaError,
  LOCAL_DRAFT_INDEX_KEY,
  LOCAL_DRAFT_PREFIX,
  normalizeInvisibleDraftRouteParams,
  PSEUDO_DRAFT_SESSION_PREFIX,
} from "./drafts/shared";

export {
  getCheckpointColumnsMode,
  getDraftSchemaMode,
  markCheckpointColumnsUnsupported,
  markDraftSchemaExtended,
  markDraftSchemaLegacy,
} from "./drafts/state";

export {
  LOCAL_DRAFT_ALIASES_KEY,
  findDraftAliasSessions,
  getDraftAlias,
  removeDraftAlias,
  removeDraftAliasesByDraftId,
  setDraftAlias,
} from "./drafts/aliases";

export {
  findPersistedDraftIdForSession,
  readLocalDraftIndex,
} from "./drafts/localIndex";

export {
  getStorageKey,
  readLocalCopy,
  removeLocalCopy,
  saveLocalCopy,
} from "./drafts/localCopies";

export {
  buildHubDrafts,
  projectRecoverableDrafts,
  reconcileLocalDraftIndex,
} from "./drafts/reconcile";

export { purgeDraftArtifacts } from "./drafts/purge";

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
