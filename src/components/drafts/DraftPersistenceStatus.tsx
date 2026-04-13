"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type DraftPersistenceStatusProps = {
  savingDraft: boolean;
  remoteIdentityState: "idle" | "creating" | "ready" | "local_only_fallback";
  remoteSyncState:
    | "synced"
    | "syncing"
    | "pending_remote_sync"
    | "local_only_fallback";
  hasPendingAutosave: boolean;
  hasLocalDirtyChanges: boolean;
  hasPendingRemoteSync: boolean;
  localDraftSavedAt: Date | null;
  draftSavedAt: Date | null;
  localPersistenceState:
    | "indexeddb"
    | "local_storage_fallback"
    | "unavailable";
  localPersistenceMessage: string | null;
  onSave?: () => boolean | Promise<boolean>;
  saveDisabled?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

function getButtonClasses(isDark: boolean, saved: boolean) {
  if (saved) {
    return isDark
      ? "border border-green-300/30 bg-green-400/15 text-green-100 hover:bg-green-400/20 disabled:opacity-50"
      : "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50";
  }

  return isDark
    ? "border border-white/15 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
    : "bg-reca text-white hover:bg-reca-dark disabled:opacity-50";
}

export function DraftPersistenceStatus({
  savingDraft,
  remoteIdentityState,
  remoteSyncState,
  hasPendingAutosave,
  hasLocalDirtyChanges,
  hasPendingRemoteSync,
  localDraftSavedAt,
  draftSavedAt,
  localPersistenceState,
  localPersistenceMessage,
  onSave,
  saveDisabled = false,
  tone = "light",
  className = "",
}: DraftPersistenceStatusProps) {
  const [now, setNow] = useState(() => Date.now());
  const [saveFeedbackState, setSaveFeedbackState] = useState<
    "idle" | "awaiting_confirmation" | "saved"
  >("idle");
  const shouldRefreshRelativeTime = Boolean(localDraftSavedAt || draftSavedAt);

  useEffect(() => {
    if (!shouldRefreshRelativeTime) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [shouldRefreshRelativeTime]);

  useEffect(() => {
    if (saveFeedbackState !== "awaiting_confirmation") {
      return;
    }

    if (savingDraft || remoteSyncState === "syncing") {
      return;
    }

    const canConfirmSave =
      remoteSyncState === "synced" &&
      !hasPendingRemoteSync &&
      !hasLocalDirtyChanges &&
      remoteIdentityState !== "creating";

    if (!canConfirmSave) {
      setSaveFeedbackState("idle");
      return;
    }

    setSaveFeedbackState("saved");

    const timeoutId = window.setTimeout(() => {
      setSaveFeedbackState("idle");
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    hasLocalDirtyChanges,
    hasPendingRemoteSync,
    remoteIdentityState,
    remoteSyncState,
    saveFeedbackState,
    savingDraft,
  ]);

  const formatTime = (value: Date) =>
    value.toLocaleTimeString("es-CO", { timeStyle: "short" });

  const formatRelative = (value: Date) => {
    const diffSeconds = Math.max(0, Math.floor((now - value.getTime()) / 1000));

    if (diffSeconds < 5) {
      return "justo ahora";
    }

    if (diffSeconds < 60) {
      return `hace ${diffSeconds} s`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `hace ${diffMinutes} min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `hace ${diffHours} h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays} d`;
  };

  let localStatus = "Aún no guardado";
  if (hasPendingAutosave) {
    localStatus = "Guardando cambios...";
  } else if (localDraftSavedAt) {
    localStatus = `${formatRelative(localDraftSavedAt)} (${formatTime(localDraftSavedAt)})`;
  }

  let cloudStatus = "Sincronizado";
  if (savingDraft || remoteSyncState === "syncing") {
    cloudStatus = "Sincronizando...";
  } else if (remoteIdentityState === "creating") {
    cloudStatus = "Preparando guardado...";
  } else if (
    remoteIdentityState === "local_only_fallback" ||
    remoteSyncState === "local_only_fallback"
  ) {
    cloudStatus = "Solo guardado en este dispositivo";
  } else if (
    hasPendingRemoteSync ||
    remoteSyncState === "pending_remote_sync" ||
    hasLocalDirtyChanges
  ) {
    cloudStatus = "Cambios sin sincronizar";
  } else if (draftSavedAt) {
    cloudStatus = `Sincronizado (${formatRelative(draftSavedAt)})`;
  } else if (remoteIdentityState === "ready") {
    cloudStatus = "Cambios sin sincronizar";
  }

  const isDark = tone === "dark";
  const containerClasses = isDark
    ? "rounded-2xl border border-white/15 bg-white/10 p-3 text-white"
    : "rounded-2xl border border-gray-200 bg-gray-50/90 p-3 text-gray-900";
  const labelClasses = isDark ? "text-white/70" : "text-gray-500";
  const valueClasses = isDark ? "text-white" : "text-gray-900";
  const persistenceAlertClasses = isDark
    ? {
        local_storage_fallback:
          "border border-amber-300/30 bg-amber-400/10 text-amber-100",
        unavailable: "border border-red-300/30 bg-red-400/10 text-red-100",
      }
    : {
        local_storage_fallback:
          "border border-amber-200 bg-amber-50 text-amber-900",
        unavailable: "border border-red-200 bg-red-50 text-red-900",
      };

  const alertMessage =
    localPersistenceState === "local_storage_fallback"
      ? "Solo guardado en este dispositivo"
      : localPersistenceState === "unavailable"
        ? "No se puede guardar localmente"
        : null;
  const persistenceAlertClass =
    localPersistenceState === "local_storage_fallback"
      ? persistenceAlertClasses.local_storage_fallback
      : persistenceAlertClasses.unavailable;

  const showSavingState = savingDraft || remoteSyncState === "syncing";
  const showSavedState = saveFeedbackState === "saved" && !showSavingState;

  async function handleSaveClick() {
    if (!onSave) {
      return;
    }

    setSaveFeedbackState("idle");

    try {
      const result = await onSave();
      if (result) {
        setSaveFeedbackState("awaiting_confirmation");
      }
    } catch {
      setSaveFeedbackState("idle");
    }
  }

  return (
    <div className={cn(containerClasses, className)}>
      {onSave ? (
        <button
          type="button"
          onClick={() => {
            void handleSaveClick();
          }}
          disabled={saveDisabled}
          className={cn(
            "mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            getButtonClasses(isDark, showSavedState)
          )}
        >
          {showSavingState ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showSavedState ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {showSavingState
            ? "Guardando..."
            : showSavedState
              ? "Guardado"
              : "Guardar borrador"}
        </button>
      ) : null}

      {alertMessage ? (
        <div
          className={cn(
            "mb-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium",
            persistenceAlertClass
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{alertMessage}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className={cn("font-medium", labelClasses)}>
            Último guardado en este dispositivo
          </span>
          <span className={cn("text-right font-semibold", valueClasses)}>
            {localStatus}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className={cn("font-medium", labelClasses)}>
            Estado de sincronización
          </span>
          <span className={cn("text-right font-semibold", valueClasses)}>
            {cloudStatus}
          </span>
        </div>
      </div>

      {process.env.NODE_ENV === "development" && localPersistenceMessage ? (
        <span className="sr-only">{localPersistenceMessage}</span>
      ) : null}
    </div>
  );
}
