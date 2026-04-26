import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  attemptDriveCleanup,
  DRIVE_CLEANUP_RETRY_STATUSES,
  DRIVE_CLEANUP_TIMEOUT_MS,
  getDriveCleanupErrorMessage,
  type DriveCleanupStatus,
} from "@/lib/drafts/driveCleanup";
import { parseDraftGooglePrewarmState } from "@/lib/drafts/serverDraftPrewarm";
import { createClient } from "@/lib/supabase/server";

const DRAFT_CLEANUP_SELECT_FIELDS = [
  "id",
  "user_id",
  "form_slug",
  "updated_at",
  "deleted_at",
  "google_prewarm_cleanup_status",
  "google_prewarm_cleanup_error",
  "google_prewarm",
].join(", ");

const DEFAULT_LIMIT = 25;
const DEFAULT_PURGE_LIMIT = 100;
const DEFAULT_PURGE_RETENTION_DAYS = 30;
const MAX_LIMIT = 100;
const PURGE_CONFIRMATION = "PURGE_SOFT_DELETED_DRAFTS";
const DRAFT_CLEANUP_PURGE_STATUSES = ["trashed", "skipped"] as const;

const postBodySchema = z.object({
  draftIds: z.array(z.string().uuid()).min(1).max(MAX_LIMIT).optional(),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
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
  google_prewarm_cleanup_status: DriveCleanupStatus | string | null;
  google_prewarm_cleanup_error: string | null;
  google_prewarm: unknown;
};

function parseAdminEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase("es-CO"))
      .filter(Boolean)
  );
}

async function authorizeInternalDraftCleanup() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { success: false, error: "No autenticado." },
        { status: 401 }
      ),
    };
  }

  const adminEmails = parseAdminEmails(process.env.DRAFT_CLEANUP_ADMIN_EMAILS);
  if (adminEmails.size === 0) {
    console.warn("[draft-cleanup.auth] missing_admin_allowlist", {
      userId: user.id,
      email: user.email ?? null,
    });
    return {
      response: NextResponse.json(
        { success: false, error: "Operacion interna no configurada." },
        { status: 403 }
      ),
    };
  }

  const userEmail = user.email?.trim().toLocaleLowerCase("es-CO") ?? "";
  if (!userEmail || !adminEmails.has(userEmail)) {
    return {
      response: NextResponse.json(
        { success: false, error: "No autorizado." },
        { status: 403 }
      ),
    };
  }

  return { user };
}

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin no esta configurado.");
  }

  return createAdminClient(supabaseUrl, serviceRoleKey);
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
  admin: ReturnType<typeof createAdminSupabaseClient>;
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

async function listPurgeableRows(options: {
  admin: ReturnType<typeof createAdminSupabaseClient>;
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
  admin: ReturnType<typeof createAdminSupabaseClient>;
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
  admin: ReturnType<typeof createAdminSupabaseClient>;
  draftId: string;
  cleanupStatus: DriveCleanupStatus;
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
  admin: ReturnType<typeof createAdminSupabaseClient>;
  row: DraftCleanupRow;
}) {
  const state = parseDraftGooglePrewarmState(options.row.google_prewarm);
  let cleanupStatus: DriveCleanupStatus = "skipped";
  let cleanupError: string | null = null;

  if (state.spreadsheetId && state.status !== "finalized") {
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

export async function GET(request: Request) {
  try {
    const authorization = await authorizeInternalDraftCleanup();
    if ("response" in authorization) {
      return authorization.response;
    }

    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .default(view === "purgeable" ? DEFAULT_PURGE_LIMIT : DEFAULT_LIMIT)
      .parse(url.searchParams.get("limit") ?? undefined);
    const admin = createAdminSupabaseClient();
    const rows =
      view === "purgeable"
        ? await listPurgeableRows({
            admin,
            limit,
            olderThanDays: z.coerce
              .number()
              .int()
              .min(1)
              .max(365)
              .default(DEFAULT_PURGE_RETENTION_DAYS)
              .parse(url.searchParams.get("olderThanDays") ?? undefined),
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

    const admin = createAdminSupabaseClient();
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

    const draftIds = parsed.data.draftIds;
    const limit = parsed.data.limit ?? draftIds?.length ?? DEFAULT_LIMIT;
    const admin = createAdminSupabaseClient();
    const rows = await listCleanupRows({ admin, limit, draftIds });
    const results = [];

    for (const row of rows) {
      results.push(await retryDraftCleanup({ admin, row }));
    }

    console.info("[draft-cleanup.post] completed", {
      requestedDrafts: draftIds?.length ?? null,
      matchedDrafts: rows.length,
      results: results.map((result) => ({
        draftId: result.draftId,
        cleanupStatus: result.cleanupStatus,
      })),
      timeoutMs: DRIVE_CLEANUP_TIMEOUT_MS,
    });

    return NextResponse.json({
      success: true,
      matched: rows.length,
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
