"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save } from "lucide-react";
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
  onSave?: () => void | Promise<void>;
  saveDisabled?: boolean;
  tone?: "light" | "dark";
  className?: string;
};

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

  let localStatus = "Sin guardar";
  if (hasPendingAutosave) {
    localStatus = "Guardando...";
  } else if (localDraftSavedAt) {
    localStatus = `${formatRelative(localDraftSavedAt)} (${formatTime(localDraftSavedAt)})`;
  }

  let cloudStatus = "Sin cambios pendientes";
  if (savingDraft || remoteSyncState === "syncing") {
    cloudStatus = "Sincronizando...";
  } else if (remoteIdentityState === "creating") {
    cloudStatus = "Preparando...";
  } else if (
    remoteIdentityState === "local_only_fallback" ||
    remoteSyncState === "local_only_fallback"
  ) {
    cloudStatus = "Solo local";
  } else if (
    hasPendingRemoteSync ||
    remoteSyncState === "pending_remote_sync" ||
    hasLocalDirtyChanges
  ) {
    cloudStatus = "Cambios locales pendientes";
  } else if (draftSavedAt) {
    cloudStatus = `${formatRelative(draftSavedAt)} (${formatTime(draftSavedAt)})`;
  } else if (remoteIdentityState === "ready") {
    cloudStatus = "Preparado para sincronizar";
  }

  const isDark = tone === "dark";
  const containerClasses = isDark
    ? "rounded-2xl border border-white/15 bg-white/10 p-3 text-white"
    : "rounded-2xl border border-gray-200 bg-gray-50/90 p-3 text-gray-900";
  const labelClasses = isDark ? "text-white/70" : "text-gray-500";
  const valueClasses = isDark ? "text-white" : "text-gray-900";
  const buttonClasses = isDark
    ? "border border-white/15 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
    : "bg-reca text-white hover:bg-reca-dark disabled:opacity-50";

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
    localPersistenceState === "indexeddb" ? null : localPersistenceMessage;
  const persistenceAlertClass =
    localPersistenceState === "local_storage_fallback"
      ? persistenceAlertClasses.local_storage_fallback
      : persistenceAlertClasses.unavailable;

  return (
    <div className={cn(containerClasses, className)}>
      {onSave ? (
        <button
          type="button"
          onClick={() => {
            void onSave();
          }}
          disabled={saveDisabled}
          className={cn(
            "mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            buttonClasses
          )}
        >
          {savingDraft || remoteSyncState === "syncing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {savingDraft || remoteSyncState === "syncing"
            ? "Guardando..."
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
          <span className={cn("font-medium", labelClasses)}>Último cambio local</span>
          <span className={cn("text-right font-semibold", valueClasses)}>
            {localStatus}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className={cn("font-medium", labelClasses)}>
            Último cambio en la nube
          </span>
          <span className={cn("text-right font-semibold", valueClasses)}>
            {cloudStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
