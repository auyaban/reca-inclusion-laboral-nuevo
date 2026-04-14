import { createClient } from "@/lib/supabase/client";
import { EMPRESA_SELECT_FIELDS, parseEmpresaSnapshot } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  buildDraftMeta,
  buildDraftSummary,
  hasRemoteCheckpoint,
  isMissingDraftSchemaError,
  isRecord,
  type DraftRow,
  type DraftSelectResult,
} from "./shared";
import {
  getCheckpointColumnsMode,
  getCurrentUserIdCache,
  getDraftSchemaMode,
  setCheckpointColumnsMode,
  setCurrentUserIdCache,
  setDraftSchemaMode,
} from "./state";

const EXTENDED_DRAFT_BASE_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "step",
  "updated_at",
  "created_at",
].join(", ");

const EXTENDED_DRAFT_SUMMARY_FIELDS = [
  EXTENDED_DRAFT_BASE_FIELDS,
  "last_checkpoint_at",
  "last_checkpoint_hash",
].join(", ");

const EXTENDED_DRAFT_RETURN_FIELDS = [
  EXTENDED_DRAFT_SUMMARY_FIELDS,
  "last_checkpoint_hash",
].join(", ");

const EXTENDED_DRAFT_PAYLOAD_FIELDS = [
  EXTENDED_DRAFT_RETURN_FIELDS,
  "empresa_snapshot",
  "data",
].join(", ");

const LEGACY_DRAFT_BASE_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "step",
  "updated_at",
].join(", ");

const LEGACY_DRAFT_SUMMARY_FIELDS = LEGACY_DRAFT_BASE_FIELDS;
const LEGACY_DRAFT_RETURN_FIELDS = LEGACY_DRAFT_BASE_FIELDS;
const LEGACY_DRAFT_PAYLOAD_FIELDS = [
  LEGACY_DRAFT_BASE_FIELDS,
  "data",
].join(", ");

export function getDraftFields(
  mode: "summary" | "return" | "payload",
  options?: { includeCheckpointColumns?: boolean }
) {
  const includeCheckpointColumns =
    options?.includeCheckpointColumns ?? getCheckpointColumnsMode() !== "unsupported";

  if (getDraftSchemaMode() === "legacy") {
    if (mode === "payload") {
      return LEGACY_DRAFT_PAYLOAD_FIELDS;
    }

    return mode === "return"
      ? LEGACY_DRAFT_RETURN_FIELDS
      : LEGACY_DRAFT_SUMMARY_FIELDS;
  }

  if (mode === "payload") {
    return includeCheckpointColumns
      ? EXTENDED_DRAFT_PAYLOAD_FIELDS
      : [EXTENDED_DRAFT_BASE_FIELDS, "data"].join(", ");
  }

  if (mode === "return") {
    return includeCheckpointColumns
      ? EXTENDED_DRAFT_RETURN_FIELDS
      : EXTENDED_DRAFT_BASE_FIELDS;
  }

  return includeCheckpointColumns
    ? EXTENDED_DRAFT_SUMMARY_FIELDS
    : EXTENDED_DRAFT_BASE_FIELDS;
}

export async function runDraftSelect(
  mode: "summary" | "return" | "payload",
  queryFactory: (fields: string) => PromiseLike<DraftSelectResult>
): Promise<DraftSelectResult> {
  const withCheckpointFields = getDraftFields(mode);
  let result = await queryFactory(withCheckpointFields);

  if (
    getDraftSchemaMode() !== "legacy" &&
    getCheckpointColumnsMode() !== "unsupported" &&
    isRecord(result) &&
    isMissingDraftSchemaError(result.error)
  ) {
    setCheckpointColumnsMode("unsupported");
    result = await queryFactory(
      getDraftFields(mode, { includeCheckpointColumns: false })
    );
  }

  if (
    getDraftSchemaMode() !== "legacy" &&
    isRecord(result) &&
    isMissingDraftSchemaError(result.error)
  ) {
    setDraftSchemaMode("legacy");
    result = await queryFactory(getDraftFields(mode));
  } else if (getDraftSchemaMode() === "unknown" && isRecord(result) && !result.error) {
    setDraftSchemaMode("extended");
  }

  if (
    getDraftSchemaMode() === "extended" &&
    getCheckpointColumnsMode() === "unknown" &&
    isRecord(result) &&
    !result.error &&
    withCheckpointFields.includes("last_checkpoint_at")
  ) {
    setCheckpointColumnsMode("supported");
  }

  return result;
}

export async function getCurrentUserId() {
  const currentUserIdCache = getCurrentUserIdCache();
  const now = Date.now();
  if (
    currentUserIdCache &&
    currentUserIdCache.inflight === null &&
    !!currentUserIdCache.value &&
    now - currentUserIdCache.fetchedAt < 5_000
  ) {
    return currentUserIdCache.value;
  }

  if (currentUserIdCache?.inflight) {
    return currentUserIdCache.inflight;
  }

  const inflight = (async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const value = session?.user.id ?? null;
      setCurrentUserIdCache({
        value,
        fetchedAt: value ? Date.now() : 0,
        inflight: null,
      });
      return value;
    } catch (error) {
      setCurrentUserIdCache({
        value: null,
        fetchedAt: 0,
        inflight: null,
      });
      throw error;
    }
  })();

  setCurrentUserIdCache({
    value: currentUserIdCache?.value ?? null,
    fetchedAt: currentUserIdCache?.fetchedAt ?? 0,
    inflight,
  });

  return inflight;
}

export function getDraftWritePayload(
  slug: string,
  empresa: Empresa,
  step: number,
  data: Record<string, unknown>
) {
  const basePayload = {
    form_slug: slug,
    empresa_nit: empresa.nit_empresa,
    empresa_nombre: empresa.nombre_empresa,
    step,
    data,
  };

  if (getDraftSchemaMode() === "legacy") {
    return basePayload;
  }

  return {
    ...basePayload,
    empresa_snapshot: empresa,
  };
}

export function getDraftStubWritePayload(slug: string, empresa: Empresa, step: number) {
  const basePayload = getDraftWritePayload(slug, empresa, step, {});

  if (getCheckpointColumnsMode() === "unsupported") {
    return basePayload;
  }

  return {
    ...basePayload,
    last_checkpoint_at: null,
    last_checkpoint_hash: null,
  };
}

export function getDraftCheckpointWritePayload(
  slug: string,
  empresa: Empresa,
  step: number,
  data: Record<string, unknown>,
  checkpointAt: string,
  checkpointHash: string
) {
  const basePayload = getDraftWritePayload(slug, empresa, step, data);

  if (getCheckpointColumnsMode() === "unsupported") {
    return basePayload;
  }

  return {
    ...basePayload,
    last_checkpoint_at: checkpointAt,
    last_checkpoint_hash: checkpointHash,
  };
}

export async function getEmpresaFromNit(nit: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .eq("nit_empresa", nit)
    .limit(1)
    .maybeSingle();

  return (data as Empresa | null) ?? null;
}

export async function fetchDraftSummaries(userId: string) {
  const supabase = createClient();
  const { data, error } = await runDraftSelect("summary", (fields) =>
    supabase
      .from("form_drafts")
      .select(fields)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
  );

  if (error) {
    throw error;
  }

  return (((data ?? []) as unknown) as DraftRow[]).map((row) =>
    buildDraftSummary(row, parseEmpresaSnapshot(row.empresa_snapshot))
  );
}

export async function fetchRecoverableRemoteDraftIds(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("form_drafts")
    .select("id")
    .eq("user_id", userId)
    .not("last_checkpoint_at", "is", null);

  if (!error) {
    return (((data ?? []) as unknown[]) as Array<{ id?: string | null }>)
      .map((row) => (typeof row?.id === "string" ? row.id : null))
      .filter((id): id is string => !!id);
  }

  const summaries = await fetchDraftSummaries(userId);
  return summaries
    .filter((draft) => hasRemoteCheckpoint(draft))
    .map((draft) => draft.id);
}

export async function fetchDraftPayload(userId: string, draftId: string) {
  const supabase = createClient();
  const { data, error } = await runDraftSelect("payload", (fields) =>
    supabase
      .from("form_drafts")
      .select(fields)
      .eq("user_id", userId)
      .eq("id", draftId)
      .maybeSingle()
  );

  if (error) {
    throw error;
  }

  if (!data) {
    return { draft: null, empresa: null };
  }

  const row = data as DraftRow;
  let empresaSnapshot = parseEmpresaSnapshot(row.empresa_snapshot);

  if (!empresaSnapshot && row.empresa_nit) {
    empresaSnapshot = await getEmpresaFromNit(row.empresa_nit);
  }

  return {
    draft: buildDraftMeta(row, empresaSnapshot),
    empresa: empresaSnapshot,
  };
}
