import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeDraftCleanupAdmin } from "@/lib/admin/draftCleanupAdmin";
import {
  attemptDriveCleanup,
  DRIVE_CLEANUP_RETRY_STATUSES,
  DRIVE_CLEANUP_TIMEOUT_MS,
  getDriveCleanupErrorMessage,
  type PersistedDriveCleanupStatus,
} from "@/lib/drafts/driveCleanup";
import { parseDraftGooglePrewarmState } from "@/lib/drafts/serverDraftPrewarm";
import { retryFinalizationSpreadsheetRename } from "@/lib/finalization/finalizationSpreadsheet";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DRAFT_CLEANUP_SELECT_FIELDS = [
  "id",
  "user_id",
  "form_slug",
  "updated_at",
  "deleted_at",
  "google_prewarm_cleanup_status",
  "google_prewarm_cleanup_error",
  "google_prewarm_lease_expires_at",
  "google_prewarm",
].join(", ");

const DEFAULT_LIMIT = 25;
const DEFAULT_PURGE_LIMIT = 100;
const DEFAULT_PURGE_RETENTION_DAYS = 30;
const MAX_LIMIT = 100;
const POST_SAFE_LIMIT = 10;
const POST_TIME_BUDGET_MS = 8_000;
const PURGE_CONFIRMATION = "PURGE_SOFT_DELETED_DRAFTS";
const DRAFT_CLEANUP_PURGE_STATUSES = ["trashed", "skipped"] as const;

const retryCleanupPostBodySchema = z.object({
  action: z.literal("retry_cleanup").optional(),
  draftIds: z.array(z.string().uuid()).min(1).max(MAX_LIMIT).optional(),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

const retryRenamePostBodySchema = z.object({
  action: z.literal("retry_rename"),
  drafts: z
    .array(
      z.object({
        spreadsheetId: z.string().trim().min(1).max(256),
        finalDocumentBaseName: z.string().trim().min(1).max(255),
      })
    )
    .min(1)
    .max(MAX_LIMIT),
});

const postBodySchema = z.union([
  retryRenamePostBodySchema,
  retryCleanupPostBodySchema,
]);

const getQuerySchema = z.object({
  view: z.enum(["purgeable"]).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  olderThanDays: z.coerce.number().int().min(1).max(365).optional(),
});

const purgeBodySchema = z.object({
  confirm: z.literal(PURGE_CONFIRMATION),
  draftIds: z.array(z.string().uuid()).min(1).max(MAX_LIMIT).optional(),
  olderThanDays: z.number().int().min(1).max(365).optional(),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

type DraftCleanupRow = {
  id: string;
  user_id: string | null;
  form_slug: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  google_prewarm_cleanup_status: PersistedDriveCleanupStatus | string | null;
  google_prewarm_cleanup_error: string | null;
  google_prewarm_lease_expires_at: string | null;
  google_prewarm: unknown;
};

type CleanupBlockerReason =
  | "active_lease"
  | "active_finalization_identity"
  | "active_finalization_spreadsheet";

type CleanupBlocker = {
  reason: CleanupBlockerReason;
  idempotencyKey?: string | null;
  status?: string | null;
  stage?: string | null;
};

async function authorizeInternalDraftCleanup() {
  const authorization = await authorizeDraftCleanupAdmin();
  if (authorization.ok) {
    return authorization;
  }

  return {
    response: NextResponse.json(
      { success: false, error: authorization.error },
      { status: authorization.status }
    ),
  };
}

function serializeDraftCleanupRow(row: DraftCleanupRow) {
  const state = parseDraftGooglePrewarmState(row.google_prewarm);

  return {
    id: row.id,
    userId: row.user_id,
    formSlug: row.form_slug,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    googlePrewarmCleanupStatus: row.google_prewarm_cleanup_status,
    googlePrewarmCleanupError: row.google_prewarm_cleanup_error,
    spreadsheetId: state.spreadsheetId,
  };
}

async function listCleanupRows(options: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  limit: number;
  draftIds?: string[];
  cleanupStatuses?: readonly string[];
  deletedBeforeOrAt?: string;
}) {
  let query = options.admin
    .from("form_drafts")
    .select(DRAFT_CLEANUP_SELECT_FIELDS)
    .not("deleted_at", "is", null)
    .in("google_prewarm_cleanup_status", [
      ...(options.cleanupStatuses ?? DRIVE_CLEANUP_RETRY_STATUSES),
    ])
    .order("deleted_at", { ascending: false });

  if (options.deletedBeforeOrAt) {
    query = query.lte("deleted_at", options.deletedBeforeOrAt);
  }

  if (options.draftIds) {
    query = query.in("id", options.draftIds);
  }

  const { data, error } = await query.limit(options.limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as DraftCleanupRow[];
}

function getPurgeCutoffIso(olderThanDays = DEFAULT_PURGE_RETENTION_DAYS) {
  return new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
}

function getActiveLeaseCleanupBlocker(row: DraftCleanupRow): CleanupBlocker | null {
  const expiresAt = Date.parse(String(row.google_prewarm_lease_expires_at ?? ""));
  if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
    return { reason: "active_lease" };
  }

  return null;
}

function serializeCleanupBlocker(
  reason: CleanupBlockerReason,
  row: Record<string, unknown> | null
): CleanupBlocker {
  return {
    reason,
    idempotencyKey:
      typeof row?.idempotency_key === "string" ? row.idempotency_key : null,
    status: typeof row?.status === "string" ? row.status : null,
    stage: typeof row?.stage === "string" ? row.stage : null,
  };
}

async function findActiveFinalizationCleanupBlocker(options: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  row: DraftCleanupRow;
  spreadsheetId: string;
}): Promise<CleanupBlocker | null> {
  const leaseBlocker = getActiveLeaseCleanupBlocker(options.row);
  if (leaseBlocker) {
    return leaseBlocker;
  }

  if (options.row.user_id && options.row.form_slug) {
    const { data: identityBlocker, error: identityError } = await options.admin
      .from("form_finalization_requests")
      .select("idempotency_key,status,stage")
      .eq("form_slug", options.row.form_slug)
      .eq("user_id", options.row.user_id)
      .eq("identity_key", options.row.id)
      .in("status", ["processing", "succeeded"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (identityError) {
      throw identityError;
    }

    if (identityBlocker) {
      return serializeCleanupBlocker(
        "active_finalization_identity",
        identityBlocker as Record<string, unknown>
      );
    }
  }

  if (options.row.user_id) {
    const { data: spreadsheetBlocker, error: spreadsheetError } =
      await options.admin
        .from("form_finalization_requests")
        .select("idempotency_key,status,stage")
        .eq("user_id", options.row.user_id)
        .eq("external_artifacts->>spreadsheetId", options.spreadsheetId)
        .in("status", ["processing", "succeeded"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (spreadsheetError) {
      throw spreadsheetError;
    }

    if (spreadsheetBlocker) {
      return serializeCleanupBlocker(
        "active_finalization_spreadsheet",
        spreadsheetBlocker as Record<string, unknown>
      );
    }
  }

  return null;
}

async function listPurgeableRows(options: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  limit: number;
  draftIds?: string[];
  olderThanDays?: number;
}) {
  return listCleanupRows({
    admin: options.admin,
    limit: options.limit,
    draftIds: options.draftIds,
    cleanupStatuses: DRAFT_CLEANUP_PURGE_STATUSES,
    deletedBeforeOrAt: getPurgeCutoffIso(options.olderThanDays),
  });
}

async function purgeDraftRows(options: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  rows: DraftCleanupRow[];
}) {
  const draftIds = options.rows.map((row) => row.id);
  if (draftIds.length === 0) {
    return [];
  }

  const { data, error } = await options.admin
    .from("form_drafts")
    .delete()
    .in("id", draftIds)
    .not("deleted_at", "is", null)
    .in("google_prewarm_cleanup_status", [...DRAFT_CLEANUP_PURGE_STATUSES])
    .select(DRAFT_CLEANUP_SELECT_FIELDS);

  if (error) {
    throw error;
  }

  return (data ?? options.rows) as unknown as DraftCleanupRow[];
}

async function updateCleanupStatus(options: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  draftId: string;
  cleanupStatus: PersistedDriveCleanupStatus;
  cleanupError: string | null;
}) {
  const { error } = await options.admin
    .from("form_drafts")
    .update({
      google_prewarm_cleanup_status: options.cleanupStatus,
      google_prewarm_cleanup_error: options.cleanupError,
    })
    .eq("id", options.draftId)
    .not("deleted_at", "is", null)
    .in("google_prewarm_cleanup_status", [...DRIVE_CLEANUP_RETRY_STATUSES]);

  if (error) {
    throw error;
  }
}

async function retryDraftCleanup(options: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  row: DraftCleanupRow;
}) {
  const state = parseDraftGooglePrewarmState(options.row.google_prewarm);
  let cleanupStatus: PersistedDriveCleanupStatus = "skipped";
  let cleanupError: string | null = null;

  if (state.spreadsheetId && state.status !== "finalized") {
    const blocker = await findActiveFinalizationCleanupBlocker({
      admin: options.admin,
      row: options.row,
      spreadsheetId: state.spreadsheetId,
    });

    if (blocker) {
      cleanupStatus = "pending";
      cleanupError = blocker.reason;
    } else {
      try {
        cleanupStatus = await attemptDriveCleanup(state.spreadsheetId);
        if (cleanupStatus === "pending") {
          cleanupError = "El cleanup de Drive quedo pendiente por timeout.";
        }
      } catch (error) {
        cleanupStatus = "failed";
        cleanupError = getDriveCleanupErrorMessage(error);
      }
    }
  }

  await updateCleanupStatus({
    admin: options.admin,
    draftId: options.row.id,
    cleanupStatus,
    cleanupError,
  });

  return {
    draftId: options.row.id,
    cleanupStatus,
    cleanupError,
    spreadsheetId: state.spreadsheetId,
  };
}

async function retryFinalizationRenames(
  drafts: Array<{ spreadsheetId: string; finalDocumentBaseName: string }>
) {
  const selectedDrafts = drafts.slice(0, POST_SAFE_LIMIT);
  const results = [];
  const startedAt = Date.now();
  let stoppedEarly = false;

  for (const draft of selectedDrafts) {
    const elapsedMs = Date.now() - startedAt;
    if (results.length > 0 && elapsedMs > POST_TIME_BUDGET_MS) {
      stoppedEarly = true;
      break;
    }

    const result = await retryFinalizationSpreadsheetRename(draft);
    results.push({
      spreadsheetId: draft.spreadsheetId,
      finalDocumentBaseName: draft.finalDocumentBaseName,
      ...result,
    });
  }

  return {
    matched: drafts.length,
    processed: results.length,
    remainingEstimate: Math.max(drafts.length - results.length, 0),
    stoppedEarly,
    cappedToSafeLimit: drafts.length > selectedDrafts.length,
    results,
  };
}

export async function GET(request: Request) {
  try {
    const authorization = await authorizeInternalDraftCleanup();
    if ("response" in authorization) {
      return authorization.response;
    }

    const url = new URL(request.url);
    const parsedQuery = getQuerySchema.safeParse({
      view: url.searchParams.get("view") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      olderThanDays: url.searchParams.get("olderThanDays") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: "Parametros de consulta invalidos." },
        { status: 400 }
      );
    }

    const view = parsedQuery.data.view;
    const limit =
      parsedQuery.data.limit ??
      (view === "purgeable" ? DEFAULT_PURGE_LIMIT : DEFAULT_LIMIT);
    const admin = createSupabaseAdminClient();
    const rows =
      view === "purgeable"
        ? await listPurgeableRows({
            admin,
            limit,
            olderThanDays:
              parsedQuery.data.olderThanDays ?? DEFAULT_PURGE_RETENTION_DAYS,
          })
        : await listCleanupRows({ admin, limit });

    return NextResponse.json({
      success: true,
      drafts: rows.map(serializeDraftCleanupRow),
    });
  } catch (error) {
    console.error("[draft-cleanup.get] failed", { error });
    return NextResponse.json(
      { success: false, error: "No se pudo listar cleanup pendiente." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authorization = await authorizeInternalDraftCleanup();
    if ("response" in authorization) {
      return authorization.response;
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = purgeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Confirmacion de purga invalida." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const draftIds = parsed.data.draftIds;
    const limit = parsed.data.limit ?? draftIds?.length ?? DEFAULT_PURGE_LIMIT;
    const rows = await listPurgeableRows({
      admin,
      draftIds,
      limit,
      olderThanDays: parsed.data.olderThanDays,
    });
    const purgedRows = await purgeDraftRows({ admin, rows });

    console.info("[draft-cleanup.delete] completed", {
      requestedDrafts: draftIds?.length ?? null,
      matchedDrafts: rows.length,
      purgedDrafts: purgedRows.length,
      olderThanDays: parsed.data.olderThanDays ?? DEFAULT_PURGE_RETENTION_DAYS,
    });

    return NextResponse.json({
      success: true,
      matched: rows.length,
      purged: purgedRows.length,
      drafts: purgedRows.map(serializeDraftCleanupRow),
    });
  } catch (error) {
    console.error("[draft-cleanup.delete] failed", { error });
    return NextResponse.json(
      { success: false, error: "No se pudo purgar borradores eliminados." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeInternalDraftCleanup();
    if ("response" in authorization) {
      return authorization.response;
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Solicitud invalida." },
        { status: 400 }
      );
    }

    if (parsed.data.action === "retry_rename") {
      const retryResult = await retryFinalizationRenames(parsed.data.drafts);

      console.info("[draft-cleanup.post.retry_rename] completed", {
        matched: retryResult.matched,
        processed: retryResult.processed,
        remainingEstimate: retryResult.remainingEstimate,
        stoppedEarly: retryResult.stoppedEarly,
        cappedToSafeLimit: retryResult.cappedToSafeLimit,
        results: retryResult.results.map((result) => ({
          spreadsheetId: result.spreadsheetId,
          success: result.success,
        })),
      });

      return NextResponse.json({
        success: true,
        ...retryResult,
      });
    }

    const draftIds = parsed.data.draftIds;
    const requestedLimit = parsed.data.limit ?? draftIds?.length ?? DEFAULT_LIMIT;
    const limit = Math.min(requestedLimit, POST_SAFE_LIMIT);
    const admin = createSupabaseAdminClient();
    const rows = await listCleanupRows({ admin, limit, draftIds });
    const results = [];
    const startedAt = Date.now();
    let stoppedEarly = false;

    for (const row of rows) {
      const elapsedMs = Date.now() - startedAt;
      if (
        results.length > 0 &&
        elapsedMs + DRIVE_CLEANUP_TIMEOUT_MS > POST_TIME_BUDGET_MS
      ) {
        stoppedEarly = true;
        break;
      }

      results.push(await retryDraftCleanup({ admin, row }));
    }
    const remainingEstimate = Math.max(rows.length - results.length, 0);

    console.info("[draft-cleanup.post] completed", {
      requestedDrafts: draftIds?.length ?? null,
      matchedDrafts: rows.length,
      processedDrafts: results.length,
      remainingEstimate,
      stoppedEarly,
      requestedLimit,
      appliedLimit: limit,
      results: results.map((result) => ({
        draftId: result.draftId,
        cleanupStatus: result.cleanupStatus,
      })),
      timeoutMs: DRIVE_CLEANUP_TIMEOUT_MS,
      timeBudgetMs: POST_TIME_BUDGET_MS,
    });

    return NextResponse.json({
      success: true,
      matched: rows.length,
      processed: results.length,
      remainingEstimate,
      stoppedEarly,
      cappedToSafeLimit: requestedLimit > limit,
      results,
    });
  } catch (error) {
    console.error("[draft-cleanup.post] failed", { error });
    return NextResponse.json(
      { success: false, error: "No se pudo reintentar cleanup pendiente." },
      { status: 500 }
    );
  }
}
