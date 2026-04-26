import { trashDriveFile } from "@/lib/google/drive";

export type PersistedDriveCleanupStatus =
  | "skipped"
  | "trashed"
  | "failed"
  | "pending";

export type DriveCleanupResponseStatus =
  | PersistedDriveCleanupStatus
  | "not_found";

export const DRIVE_CLEANUP_TIMEOUT_MS = 2_500;
export const DRIVE_CLEANUP_RETRY_STATUSES = ["pending", "failed"] as const;

export function getDriveCleanupErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "No se pudo mover el spreadsheet provisional a papelera.";
}

export async function attemptDriveCleanup(fileId: string) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<"timeout">((resolve) => {
    timeoutId = setTimeout(() => resolve("timeout"), DRIVE_CLEANUP_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      trashDriveFile(fileId).then(() => "trashed" as const),
      timeout,
    ]);
    return result === "timeout" ? "pending" : result;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
