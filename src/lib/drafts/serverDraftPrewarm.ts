import {
  DRAFT_GOOGLE_PREWARM_VERSION,
  DRAFT_GOOGLE_PREWARM_STATUSES,
  type DraftGooglePrewarmLeaseState,
  type DraftGooglePrewarmState,
  type DraftGooglePrewarmStatus,
  type DraftGooglePrewarmTiming,
} from "@/lib/finalization/prewarmTypes";
import { isRecord } from "@/lib/finalization/valueUtils";

const DRAFT_PREWARM_SELECT_FIELDS = [
  "id",
  "google_prewarm_status",
  "google_prewarm_updated_at",
  "google_prewarm",
  "google_prewarm_lease_owner",
  "google_prewarm_lease_expires_at",
].join(", ");

type DraftPrewarmRow = {
  id: string;
  google_prewarm_status: string | null;
  google_prewarm_updated_at: string | null;
  google_prewarm: unknown;
  google_prewarm_lease_owner: string | null;
  google_prewarm_lease_expires_at: string | null;
};

type DraftPrewarmSelectBuilder = {
  eq: (field: string, value: unknown) => DraftPrewarmSelectBuilder;
  is: (field: string, value: null) => DraftPrewarmSelectBuilder;
  maybeSingle: () => Promise<{ data: DraftPrewarmRow | null; error: unknown }>;
};

type DraftPrewarmUpdateSelectBuilder = {
  maybeSingle: () => Promise<{ data: DraftPrewarmRow | null; error: unknown }>;
};

type DraftPrewarmUpdateBuilder = {
  eq: (field: string, value: unknown) => DraftPrewarmUpdateBuilder;
  is: (field: string, value: null) => DraftPrewarmUpdateBuilder;
  select: (fields?: string) => DraftPrewarmUpdateSelectBuilder;
};

export type DraftPrewarmSupabaseClient = {
  from: (table: "form_drafts") => {
    select: (fields?: string) => DraftPrewarmSelectBuilder;
    update: (value: Record<string, unknown>) => DraftPrewarmUpdateBuilder;
  };
  rpc: (
    fn:
      | "claim_form_draft_prewarm_lease"
      | "renew_form_draft_prewarm_lease"
      | "release_form_draft_prewarm_lease",
    params: Record<string, unknown>
  ) => {
    maybeSingle: () => Promise<{
      data: boolean | Record<string, unknown> | null;
      error: unknown;
    }>;
  };
};

type DraftPrewarmLeaseRow = {
  claimed: boolean | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
  google_prewarm_status: string | null;
  google_prewarm_updated_at: string | null;
  google_prewarm: unknown;
};

function isTiming(value: unknown): value is DraftGooglePrewarmTiming {
  return (
    isRecord(value) &&
    typeof value.requestId === "string" &&
    typeof value.startedAt === "string" &&
    typeof value.totalMs === "number" &&
    Array.isArray(value.steps)
  );
}

export function createEmptyDraftGooglePrewarmState(): DraftGooglePrewarmState {
  return {
    version: DRAFT_GOOGLE_PREWARM_VERSION,
    folderId: null,
    spreadsheetId: null,
    provisionalName: null,
    bundleKey: null,
    structureSignature: null,
    templateRevision: null,
    validatedAt: null,
    activeSheetName: null,
    activeSheetId: null,
    bundleSheetNames: [],
    status: "idle",
    lastError: null,
    attemptCount: 0,
    lastRunTiming: null,
    lastSuccessfulTiming: null,
  };
}

export function parseDraftGooglePrewarmState(value: unknown): DraftGooglePrewarmState {
  const source = isRecord(value) ? value : {};
  const base = createEmptyDraftGooglePrewarmState();
  const status =
    typeof source.status === "string" &&
    DRAFT_GOOGLE_PREWARM_STATUSES.includes(
      source.status as DraftGooglePrewarmStatus
    )
      ? (source.status as DraftGooglePrewarmStatus)
      : base.status;

  return {
    version:
      typeof source.version === "number" ? source.version : base.version,
    folderId: typeof source.folderId === "string" ? source.folderId : null,
    spreadsheetId:
      typeof source.spreadsheetId === "string" ? source.spreadsheetId : null,
    provisionalName:
      typeof source.provisionalName === "string" ? source.provisionalName : null,
    bundleKey: typeof source.bundleKey === "string" ? source.bundleKey : null,
    structureSignature:
      typeof source.structureSignature === "string"
        ? source.structureSignature
        : null,
    templateRevision:
      typeof source.templateRevision === "string"
        ? source.templateRevision
        : null,
    validatedAt:
      typeof source.validatedAt === "string"
        ? source.validatedAt
        : null,
    activeSheetName:
      typeof source.activeSheetName === "string" ? source.activeSheetName : null,
    activeSheetId:
      typeof source.activeSheetId === "number" ? source.activeSheetId : null,
    bundleSheetNames: Array.isArray(source.bundleSheetNames)
      ? source.bundleSheetNames.filter(
          (sheetName): sheetName is string => typeof sheetName === "string"
        )
      : [],
    status,
    lastError: typeof source.lastError === "string" ? source.lastError : null,
    attemptCount:
      typeof source.attemptCount === "number" ? source.attemptCount : 0,
    lastRunTiming: isTiming(source.lastRunTiming) ? source.lastRunTiming : null,
    lastSuccessfulTiming: isTiming(source.lastSuccessfulTiming)
      ? source.lastSuccessfulTiming
      : null,
  };
}

export async function readDraftGooglePrewarm(options: {
  supabase: DraftPrewarmSupabaseClient;
  draftId: string;
  userId: string;
}) {
  const { data, error } = await options.supabase
    .from("form_drafts")
    .select(DRAFT_PREWARM_SELECT_FIELDS)
    .eq("id", options.draftId)
    .eq("user_id", options.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    row: data,
    state: parseDraftGooglePrewarmState(data.google_prewarm),
    updatedAt: data.google_prewarm_updated_at,
    leaseOwner: data.google_prewarm_lease_owner,
    leaseExpiresAt: data.google_prewarm_lease_expires_at,
  };
}

export async function updateDraftGooglePrewarm(options: {
  supabase: DraftPrewarmSupabaseClient;
  draftId: string;
  userId: string;
  state: DraftGooglePrewarmState;
  status: DraftGooglePrewarmStatus;
  updatedAt?: string;
  clearLease?: boolean;
  onlyIfUpdatedAt?: string | null;
}) {
  const updatedAt = options.updatedAt ?? new Date().toISOString();
  let query = options.supabase
    .from("form_drafts")
    .update({
      google_prewarm_status: options.status,
      google_prewarm_updated_at: updatedAt,
      ...(options.clearLease
        ? {
            google_prewarm_lease_owner: null,
            google_prewarm_lease_expires_at: null,
          }
        : {}),
      google_prewarm: {
        ...options.state,
        version: DRAFT_GOOGLE_PREWARM_VERSION,
        status: options.status,
      },
    })
    .eq("id", options.draftId)
    .eq("user_id", options.userId)
    .is("deleted_at", null);

  if (options.onlyIfUpdatedAt) {
    query = query.eq("google_prewarm_updated_at", options.onlyIfUpdatedAt);
  }

  const { data, error } = await query
    .select(DRAFT_PREWARM_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? {
        row: data,
        state: parseDraftGooglePrewarmState(data.google_prewarm),
        updatedAt: data.google_prewarm_updated_at,
        leaseOwner: data.google_prewarm_lease_owner,
        leaseExpiresAt: data.google_prewarm_lease_expires_at,
      }
    : null;
}

function parseDraftPrewarmLeaseRow(
  value: boolean | Record<string, unknown> | null
): DraftGooglePrewarmLeaseState | null {
  if (!value || typeof value === "boolean") {
    return null;
  }

  const row = value as unknown as DraftPrewarmLeaseRow;
  return {
    claimed: Boolean(row.claimed),
    leaseOwner: row.lease_owner ?? null,
    leaseExpiresAt: row.lease_expires_at ?? null,
    status: row.google_prewarm_status ?? null,
    updatedAt: row.google_prewarm_updated_at ?? null,
    state: parseDraftGooglePrewarmState(row.google_prewarm),
  };
}

export async function claimDraftGooglePrewarmLease(options: {
  supabase: DraftPrewarmSupabaseClient;
  draftId: string;
  ttlSeconds: number;
  requestId: string;
}) {
  const { data, error } = await options.supabase
    .rpc("claim_form_draft_prewarm_lease", {
      target_draft_id: options.draftId,
      ttl_seconds: options.ttlSeconds,
      request_id: options.requestId,
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return parseDraftPrewarmLeaseRow(data);
}

export async function releaseDraftGooglePrewarmLease(options: {
  supabase: DraftPrewarmSupabaseClient;
  draftId: string;
  requestId: string;
}) {
  const { data, error } = await options.supabase
    .rpc("release_form_draft_prewarm_lease", {
      target_draft_id: options.draftId,
      request_id: options.requestId,
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === true || (isRecord(data) && data.release_form_draft_prewarm_lease === true);
}

export async function renewDraftGooglePrewarmLease(options: {
  supabase: DraftPrewarmSupabaseClient;
  draftId: string;
  ttlSeconds: number;
  requestId: string;
}) {
  const { data, error } = await options.supabase
    .rpc("renew_form_draft_prewarm_lease", {
      target_draft_id: options.draftId,
      ttl_seconds: options.ttlSeconds,
      request_id: options.requestId,
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return parseDraftPrewarmLeaseRow(data);
}

export async function markDraftGooglePrewarmStatus(options: {
  supabase: DraftPrewarmSupabaseClient;
  draftId?: string | null;
  userId?: string | null;
  status: DraftGooglePrewarmStatus;
  errorMessage?: string | null;
  statePatch?: Partial<DraftGooglePrewarmState>;
  baseState?: DraftGooglePrewarmState | null;
}) {
  if (!options.supabase || !options.draftId || !options.userId) {
    return null;
  }

  const existingState = options.baseState
    ? { state: options.baseState }
    : await readDraftGooglePrewarm({
        supabase: options.supabase,
        draftId: options.draftId,
        userId: options.userId,
      });

  if (!existingState) {
    return null;
  }

  return updateDraftGooglePrewarm({
    supabase: options.supabase,
    draftId: options.draftId,
    userId: options.userId,
    status: options.status,
    state: {
      ...existingState.state,
      ...options.statePatch,
      lastError:
        options.errorMessage === undefined
          ? existingState.state.lastError
          : options.errorMessage,
    },
  });
}

export async function markDraftGooglePrewarmStatusSafely(
  options: Parameters<typeof markDraftGooglePrewarmStatus>[0] & {
    source: string;
  }
) {
  try {
    await markDraftGooglePrewarmStatus(options);
  } catch (error) {
    console.error(`[${options.source}] failed_to_mark_draft_google_prewarm_status`, {
      draftId: options.draftId ?? null,
      userId: options.userId ?? null,
      status: options.status,
      error,
    });
  }
}
