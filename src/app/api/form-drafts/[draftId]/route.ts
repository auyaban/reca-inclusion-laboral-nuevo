import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readDraftGooglePrewarm,
  type DraftPrewarmSupabaseClient,
} from "@/lib/drafts/serverDraftPrewarm";
import {
  attemptDriveCleanup,
  getDriveCleanupErrorMessage,
  type DriveCleanupStatus,
  DRIVE_CLEANUP_TIMEOUT_MS,
} from "@/lib/drafts/driveCleanup";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  draftId: z.string().uuid(),
});

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ draftId: string }> }
) {
  const requestStartedAt = Date.now();
  let draftIdForLogs: string | null = null;
  let userIdForLogs: string | null = null;
  let readPrewarmMs = 0;
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
    const readPrewarmStartedAt = Date.now();
    const prewarm = await readDraftGooglePrewarm({
      supabase: draftPrewarmSupabase,
      draftId,
      userId: user.id,
    });
    readPrewarmMs = Date.now() - readPrewarmStartedAt;
    userIdForLogs = user.id;

    if (!prewarm) {
      console.warn("[form-drafts.delete.not_found]", {
        draftId,
        userId: user.id,
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

    const shouldCleanupDrive = Boolean(
      prewarm.state.spreadsheetId && prewarm.state.status !== "finalized"
    );
    let driveCleanup: DriveCleanupStatus = shouldCleanupDrive
      ? "pending"
      : "skipped";
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
      .select("id")
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

    if (shouldCleanupDrive && prewarm.state.spreadsheetId) {
      const driveCleanupStartedAt = Date.now();
      try {
        driveCleanup = await attemptDriveCleanup(prewarm.state.spreadsheetId);
        if (driveCleanup === "pending") {
          driveCleanupErrorMessage =
            "El cleanup de Drive quedo pendiente por timeout.";
          console.warn("[form-drafts.delete.cleanup_drive] pending", {
            draftId,
            spreadsheetId: prewarm.state.spreadsheetId,
            timeoutMs: DRIVE_CLEANUP_TIMEOUT_MS,
          });
        }
      } catch (error) {
        driveCleanup = "failed";
        driveCleanupErrorMessage = getDriveCleanupErrorMessage(error);
        console.error("[form-drafts.delete.cleanup_drive] failed", {
          draftId,
          spreadsheetId: prewarm.state.spreadsheetId,
          error,
        });
      } finally {
        driveCleanupMs = Date.now() - driveCleanupStartedAt;
      }

      const { error: cleanupStatusError } = await supabase
        .from("form_drafts")
        .update({
          google_prewarm_cleanup_status: driveCleanup,
          google_prewarm_cleanup_error: driveCleanupErrorMessage,
        })
        .eq("id", draftId)
        .eq("user_id", user.id);

      if (cleanupStatusError) {
        console.error("[form-drafts.delete.cleanup_status] failed", {
          draftId,
          userId: user.id,
          cleanupStatus: driveCleanup,
          error: cleanupStatusError,
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
