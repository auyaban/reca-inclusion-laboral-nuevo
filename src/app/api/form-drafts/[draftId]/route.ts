import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseDraftGooglePrewarmState,
  type DraftPrewarmSupabaseClient,
} from "@/lib/drafts/serverDraftPrewarm";
import {
  attemptDriveCleanup,
  getDriveCleanupErrorMessage,
  type PersistedDriveCleanupStatus,
  DRIVE_CLEANUP_TIMEOUT_MS,
} from "@/lib/drafts/driveCleanup";
import {
  findDraftPrewarmCleanupBlocker,
  type FinalizationRequestsSupabaseClient,
} from "@/lib/finalization/requests";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  draftId: z.string().uuid(),
});

const DELETED_DRAFT_SELECT_FIELDS = [
  "id",
  "form_slug",
  "google_prewarm",
  "google_prewarm_status",
  "google_prewarm_lease_owner",
  "google_prewarm_lease_expires_at",
].join(", ");

type DeletedDraftRow = {
  id: string;
  form_slug: string | null;
  google_prewarm: unknown;
  google_prewarm_status: string | null;
  google_prewarm_lease_owner: string | null;
  google_prewarm_lease_expires_at: string | null;
};

function isActiveLease(leaseExpiresAt: string | null, now = Date.now()) {
  const expiresAt = Date.parse(String(leaseExpiresAt ?? ""));
  return Number.isFinite(expiresAt) && expiresAt > now;
}

async function updateCleanupStatus(options: {
  supabase: DraftPrewarmSupabaseClient;
  draftId: string;
  userId: string;
  cleanupStatus: PersistedDriveCleanupStatus;
  cleanupError: string | null;
}) {
  const { error } = await options.supabase
    .from("form_drafts")
    .update({
      google_prewarm_cleanup_status: options.cleanupStatus,
      google_prewarm_cleanup_error: options.cleanupError,
    })
    .eq("id", options.draftId)
    .eq("user_id", options.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[form-drafts.delete.cleanup_status] failed", {
      draftId: options.draftId,
      userId: options.userId,
      cleanupStatus: options.cleanupStatus,
      error,
    });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ draftId: string }> }
) {
  const requestStartedAt = Date.now();
  let draftIdForLogs: string | null = null;
  let userIdForLogs: string | null = null;
  const readPrewarmMs = 0;
  let driveCleanupMs = 0;
  let dbDeleteMs = 0;

  try {
    const params = await context.params;
    const parsed = paramsSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Borrador invalido." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "No autenticado." },
        { status: 401 }
      );
    }

    const draftId = parsed.data.draftId;
    draftIdForLogs = draftId;
    const draftPrewarmSupabase = supabase as unknown as DraftPrewarmSupabaseClient;
    const finalizationRequestsSupabase =
      supabase as unknown as FinalizationRequestsSupabaseClient;
    userIdForLogs = user.id;
    let driveCleanup: PersistedDriveCleanupStatus = "pending";
    let driveCleanupErrorMessage: string | null = null;
    const deletedAt = new Date().toISOString();

    const dbDeleteStartedAt = Date.now();
    const { data: deletedDraft, error: softDeleteError } = await supabase
      .from("form_drafts")
      .update({
        deleted_at: deletedAt,
        google_prewarm_cleanup_status: driveCleanup,
        google_prewarm_cleanup_error: null,
      })
      .eq("id", draftId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select(DELETED_DRAFT_SELECT_FIELDS)
      .maybeSingle();

    if (softDeleteError) {
      throw softDeleteError;
    }

    dbDeleteMs = Date.now() - dbDeleteStartedAt;

    if (!deletedDraft) {
      console.warn("[form-drafts.delete.not_found_after_read]", {
        draftId,
        userId: user.id,
        driveCleanup,
      });
      console.info("[form-drafts.delete.timing]", {
        draftId,
        userId: user.id,
        read_prewarm_ms: readPrewarmMs,
        drive_cleanup_ms: driveCleanupMs,
        db_delete_ms: dbDeleteMs,
        total_ms: Date.now() - requestStartedAt,
      });
      return NextResponse.json({
        success: true,
        deleted: false,
        driveCleanup: "not_found",
      });
    }

    const deletedDraftSnapshot = deletedDraft as unknown as DeletedDraftRow;
    const prewarmState = parseDraftGooglePrewarmState(
      deletedDraftSnapshot.google_prewarm
    );
    const spreadsheetId = prewarmState.spreadsheetId;
    const shouldCleanupDrive = Boolean(
      spreadsheetId && prewarmState.status !== "finalized"
    );

    if (!shouldCleanupDrive || !spreadsheetId) {
      driveCleanup = "skipped";
      await updateCleanupStatus({
        supabase: draftPrewarmSupabase,
        draftId,
        userId: user.id,
        cleanupStatus: driveCleanup,
        cleanupError: null,
      });
    } else if (isActiveLease(deletedDraftSnapshot.google_prewarm_lease_expires_at)) {
      driveCleanupErrorMessage = "active_lease";
      await updateCleanupStatus({
        supabase: draftPrewarmSupabase,
        draftId,
        userId: user.id,
        cleanupStatus: driveCleanup,
        cleanupError: driveCleanupErrorMessage,
      });
    } else {
      let blocker: Awaited<ReturnType<typeof findDraftPrewarmCleanupBlocker>> = null;
      try {
        blocker = await findDraftPrewarmCleanupBlocker({
          supabase: finalizationRequestsSupabase,
          formSlug: deletedDraftSnapshot.form_slug ?? "",
          userId: user.id,
          identityKey: draftId,
          spreadsheetId,
        });
      } catch (error) {
        driveCleanupErrorMessage = "cleanup_guard_failed";
        console.error("[form-drafts.delete.cleanup_guard] failed", {
          draftId,
          userId: user.id,
          spreadsheetId,
          error,
        });
        await updateCleanupStatus({
          supabase: draftPrewarmSupabase,
          draftId,
          userId: user.id,
          cleanupStatus: driveCleanup,
          cleanupError: driveCleanupErrorMessage,
        });
      }

      if (blocker) {
        driveCleanupErrorMessage = blocker.blocker;
        await updateCleanupStatus({
          supabase: draftPrewarmSupabase,
          draftId,
          userId: user.id,
          cleanupStatus: driveCleanup,
          cleanupError: driveCleanupErrorMessage,
        });
      } else if (!driveCleanupErrorMessage) {
        const driveCleanupStartedAt = Date.now();
        try {
          driveCleanup = await attemptDriveCleanup(spreadsheetId);
          if (driveCleanup === "pending") {
            driveCleanupErrorMessage =
              "El cleanup de Drive quedo pendiente por timeout.";
            console.warn("[form-drafts.delete.cleanup_drive] pending", {
              draftId,
              spreadsheetId,
              timeoutMs: DRIVE_CLEANUP_TIMEOUT_MS,
            });
          }
        } catch (error) {
          driveCleanup = "failed";
          driveCleanupErrorMessage = getDriveCleanupErrorMessage(error);
          console.error("[form-drafts.delete.cleanup_drive] failed", {
            draftId,
            spreadsheetId,
            error,
          });
        } finally {
          driveCleanupMs = Date.now() - driveCleanupStartedAt;
        }

        await updateCleanupStatus({
          supabase: draftPrewarmSupabase,
          draftId,
          userId: user.id,
          cleanupStatus: driveCleanup,
          cleanupError: driveCleanupErrorMessage,
        });
      }
    }

    if (driveCleanup === "failed" || driveCleanup === "pending") {
      console.error("[form-drafts.delete.cleanup_pending]", {
        draftId,
        userId: user.id,
        cleanupStatus: driveCleanup,
        error: driveCleanupErrorMessage,
      });
    }

    console.info("[form-drafts.delete.timing]", {
      draftId,
      userId: user.id,
      read_prewarm_ms: readPrewarmMs,
      drive_cleanup_ms: driveCleanupMs,
      db_delete_ms: dbDeleteMs,
      total_ms: Date.now() - requestStartedAt,
    });

    return NextResponse.json({
      success: true,
      deleted: true,
      driveCleanup,
    });
  } catch (error) {
    console.error("[form-drafts.delete] failed", { error });
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "No se pudo eliminar el borrador remoto.",
      },
      { status: 500 }
    );
  } finally {
    if (draftIdForLogs && userIdForLogs === null && readPrewarmMs === 0) {
      console.info("[form-drafts.delete.timing]", {
        draftId: draftIdForLogs,
        userId: userIdForLogs,
        read_prewarm_ms: readPrewarmMs,
        drive_cleanup_ms: driveCleanupMs,
        db_delete_ms: dbDeleteMs,
        total_ms: Date.now() - requestStartedAt,
      });
    }
  }
}
