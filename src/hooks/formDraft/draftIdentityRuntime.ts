import type { Empresa } from "@/lib/store/empresaStore";
import type {
  DraftSummary,
  EnsureDraftIdentityResult,
  LocalDraft,
  RemoteIdentityState,
  RemoteSyncState,
} from "./shared";

export type DraftIdentityInsertStrategy =
  | "extended"
  | "checkpoint_unsupported"
  | "legacy";

type GetDraftIdentityInsertStrategiesParams = {
  draftSchemaMode: "unknown" | "legacy" | "extended";
  checkpointColumnsMode: "unknown" | "supported" | "unsupported";
};

type ResolveIdentityLocalDraftParams = {
  latestLocalDraft: LocalDraft | null;
  storedLocalDraft: LocalDraft | null;
  step: number;
  data: Record<string, unknown>;
  empresa: Empresa | null;
};

type BuildCreatedDraftSummaryParams = {
  draftId: string;
  slug: string;
  step: number;
  empresaSnapshot: Empresa;
  createdAt: string;
};

export type EnsureDraftIdentitySettledState = {
  remoteIdentityState: RemoteIdentityState;
  remoteSyncState: RemoteSyncState;
};

export function getDraftIdentityInsertStrategies({
  draftSchemaMode,
  checkpointColumnsMode,
}: GetDraftIdentityInsertStrategiesParams): DraftIdentityInsertStrategy[] {
  if (draftSchemaMode === "legacy") {
    return ["legacy"];
  }

  if (checkpointColumnsMode === "unsupported") {
    return ["checkpoint_unsupported", "legacy"];
  }

  return ["extended", "checkpoint_unsupported", "legacy"];
}

export function resolveIdentityLocalDraft({
  latestLocalDraft,
  storedLocalDraft,
  step,
  data,
  empresa,
}: ResolveIdentityLocalDraftParams): LocalDraft {
  return (
    latestLocalDraft ??
    storedLocalDraft ?? {
      step,
      data,
      empresa,
      updatedAt: null,
    }
  );
}

export function buildCreatedDraftSummary({
  draftId,
  slug,
  step,
  empresaSnapshot,
  createdAt,
}: BuildCreatedDraftSummaryParams): DraftSummary {
  return {
    id: draftId,
    form_slug: slug,
    step,
    empresa_nit: empresaSnapshot.nit_empresa ?? "",
    empresa_nombre: empresaSnapshot.nombre_empresa,
    empresa_snapshot: empresaSnapshot,
    updated_at: createdAt,
    created_at: createdAt,
    last_checkpoint_at: null,
    last_checkpoint_hash: null,
  };
}

export function resolveEnsureDraftIdentitySettledState(
  result: EnsureDraftIdentityResult
): EnsureDraftIdentitySettledState {
  if (result.ok && result.draftId) {
    return {
      remoteIdentityState: "ready",
      remoteSyncState: "synced",
    };
  }

  return {
    remoteIdentityState: "local_only_fallback",
    remoteSyncState: "local_only_fallback",
  };
}
