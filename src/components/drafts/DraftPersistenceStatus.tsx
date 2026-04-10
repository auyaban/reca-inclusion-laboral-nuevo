"use client";

export function DraftPersistenceStatus({
  savingDraft,
  hasPendingAutosave,
  localDraftSavedAt,
  draftSavedAt,
  className = "",
}: {
  savingDraft: boolean;
  hasPendingAutosave: boolean;
  localDraftSavedAt: Date | null;
  draftSavedAt: Date | null;
  className?: string;
}) {
  const formatTime = (value: Date) =>
    value.toLocaleTimeString("es-CO", { timeStyle: "short" });

  let message: string | null = null;

  if (savingDraft) {
    message = "Guardando borrador...";
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
