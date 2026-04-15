import type { LocalPersistenceStatus } from "@/lib/draftStorage";
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

export type LocalDraft = {
  step: number;
  data: Record<string, unknown>;
  empresa: Empresa | null;
  updatedAt: string | null;
};

export type DraftPreview = {
  title?: string;
  visitDate?: string;
  quantityLabel?: string;
};

export type SaveLocalCopyResult = LocalPersistenceStatus & {
  updatedAt: string | null;
};

export type ReadLocalCopyResult = LocalPersistenceStatus & {
  draft: LocalDraft | null;
};

export type LocalDraftIndexEntry = {
  id: string;
  slug: string;
  sessionId: string;
  draftId: string | null;
  empresaNit: string;
  empresaNombre?: string;
  empresaSnapshot: Empresa | null;
  step: number;
  updatedAt: string;
  snapshotHash?: string | null;
  hasMeaningfulContent?: boolean;
  preview?: DraftPreview | null;
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
  empresa_snapshot?: Empresa | null;
  step: number;
  draftId: string | null;
  sessionId: string | null;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  effectiveUpdatedAt: string | null;
  syncStatus: HubDraftSyncStatus;
  preview?: DraftPreview | null;
};

export type DraftSelectResult = {
  data: unknown;
  error: unknown;
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

export type DraftSchemaMode = "unknown" | "legacy" | "extended";
export type CheckpointColumnsMode = "unknown" | "supported" | "unsupported";
export type CurrentUserIdCache =
  | {
      value: string | null;
      fetchedAt: number;
      inflight: Promise<string | null> | null;
    }
  | undefined;

export const LOCAL_DRAFT_INDEX_KEY = "draft_index__v1";
export const LOCAL_DRAFT_PREFIX = "draft__";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseDraftPreview(value: unknown): DraftPreview | null {
  if (!isRecord(value)) {
    return null;
  }

  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title.trim()
      : undefined;
  const visitDate =
    typeof value.visitDate === "string" && value.visitDate.trim()
      ? value.visitDate.trim()
      : undefined;
  const quantityLabel =
    typeof value.quantityLabel === "string" && value.quantityLabel.trim()
      ? value.quantityLabel.trim()
      : undefined;

  if (!title && !visitDate && !quantityLabel) {
    return null;
  }

  return {
    title,
    visitDate,
    quantityLabel,
  };
}

export function getLocalStorageHandle() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function listLocalStorageKeys(
  storage: Storage,
  prefix?: string
): string[] {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => typeof key === "string")
    .filter((key) => (prefix ? key.startsWith(prefix) : true));
}

export function normalizeDraftData(value: unknown) {
  return isRecord(value) ? value : {};
}

export function isMissingDraftSchemaError(error: unknown) {
  return isRecord(error) && error.code === "42703";
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isRecord(error)) {
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : null;
    const details =
      typeof error.details === "string" && error.details.trim()
        ? error.details.trim()
        : null;
    const hint =
      typeof error.hint === "string" && error.hint.trim()
        ? error.hint.trim()
        : null;

    const combined = [message, details, hint].filter(Boolean).join(" ");
    if (combined) {
      return combined;
    }
  }

  return fallback;
}

export function buildDraftSummary(
  row: DraftRow,
  empresaSnapshot: Empresa | null
): DraftSummary {
  return {
    id: row.id,
    form_slug: row.form_slug,
    step: row.step ?? 0,
    empresa_nit: row.empresa_nit,
    empresa_nombre: row.empresa_nombre ?? undefined,
    empresa_snapshot: empresaSnapshot,
    updated_at: row.updated_at ?? undefined,
    created_at: row.created_at ?? undefined,
    last_checkpoint_at: row.last_checkpoint_at ?? null,
    last_checkpoint_hash: row.last_checkpoint_hash ?? null,
  };
}

export function buildDraftMeta(
  row: DraftRow,
  empresaSnapshot: Empresa | null
): DraftMeta {
  return {
    ...buildDraftSummary(row, empresaSnapshot),
    data: row.data ?? {},
    last_checkpoint_hash: row.last_checkpoint_hash ?? null,
  };
}

export function buildLocalDraftIndexId(
  slug: string,
  draftId: string | null,
  sessionId: string
) {
  return draftId ? `draft:${draftId}` : `session:${slug}:${sessionId}`;
}

export function getDraftUpdatedAt(draft: DraftSummary | DraftMeta) {
  return draft.updated_at ?? draft.created_at ?? null;
}

export function hasRemoteCheckpoint(draft: DraftSummary | DraftMeta) {
  return Boolean(draft.last_checkpoint_at ?? null);
}

export function getTimestampValue(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function compareTimestamps(a?: string | null, b?: string | null) {
  return getTimestampValue(a) - getTimestampValue(b);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function buildDraftSnapshotHash(
  step: number,
  data: Record<string, unknown>
) {
  const source = stableSerialize({ step, data });
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

export function buildDraftReconcileFingerprint(
  slug: string,
  draft: LocalDraft,
  empresaNit?: string,
  empresaNombre?: string
) {
  return [
    slug,
    empresaNit ?? draft.empresa?.nit_empresa ?? "",
    empresaNombre ?? draft.empresa?.nombre_empresa ?? "",
    buildDraftSnapshotHash(draft.step, draft.data),
  ].join("|");
}

export function parseLegacyUpdatedAt(ts: unknown) {
  if (typeof ts === "number" && Number.isFinite(ts)) {
    return new Date(ts).toISOString();
  }

  if (typeof ts === "string" && ts.trim()) {
    const parsed = new Date(ts);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}
