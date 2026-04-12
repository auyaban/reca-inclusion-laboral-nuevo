"use client";

export function DraftPersistenceStatus({
  savingDraft,
  remoteIdentityState,
  remoteSyncState,
  hasPendingAutosave,
  hasPendingRemoteSync,
  localDraftSavedAt,
  draftSavedAt,
  className = "",
}: {
  savingDraft: boolean;
  remoteIdentityState: "idle" | "creating" | "ready" | "local_only_fallback";
  remoteSyncState:
    | "synced"
    | "syncing"
    | "pending_remote_sync"
    | "local_only_fallback";
  hasPendingAutosave: boolean;
  hasPendingRemoteSync: boolean;
  localDraftSavedAt: Date | null;
  draftSavedAt: Date | null;
  className?: string;
}) {
  const formatTime = (value: Date) =>
    value.toLocaleTimeString("es-CO", { timeStyle: "short" });

  let message: string | null = null;

  if (savingDraft || remoteSyncState === "syncing") {
    message = "Guardando borrador...";
  } else if (remoteIdentityState === "creating") {
    message = "Preparando borrador...";
  } else if (
    remoteIdentityState === "local_only_fallback" ||
    remoteSyncState === "local_only_fallback"
  ) {
    message = "Trabajando solo localmente";
  } else if (hasPendingRemoteSync || remoteSyncState === "pending_remote_sync") {
    message = "Pendiente por sincronizar";
  } else if (hasPendingAutosave) {
    message = "Guardando cambios locales...";
  } else if (draftSavedAt) {
    message = `Borrador guardado a las ${formatTime(draftSavedAt)}`;
  } else if (localDraftSavedAt) {
    message = `Cambios locales guardados a las ${formatTime(localDraftSavedAt)}`;
  }

  if (!message) {
    return null;
  }

  return <p className={className}>{message}</p>;
}
