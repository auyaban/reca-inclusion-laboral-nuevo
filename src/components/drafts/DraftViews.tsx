"use client";

import { Clock, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import type { DraftMeta, HubDraft } from "@/lib/drafts";
import { getFormLabel } from "@/lib/forms";
import { cn } from "@/lib/utils";

export function formatDraftTimestamp(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function DraftSelectionPanel({
  drafts,
  loading,
  onResume,
  onStartNew,
}: {
  drafts: DraftMeta[];
  loading?: boolean;
  onResume: (draftId: string) => void;
  onStartNew: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Borradores encontrados
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Esta empresa ya tiene borradores para este formulario. Elige cuál
            reanudar o inicia una acta nueva.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="inline-flex items-center gap-2 rounded-xl border border-reca-200 bg-reca-50 px-3 py-2 text-sm font-semibold text-reca transition-colors hover:bg-reca-100"
        >
          <Plus className="h-4 w-4" />
          Nueva acta
        </button>
      </div>

      {loading ? (
        <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Cargando borradores...
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  Paso {draft.step + 1}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{draft.empresa_nombre ?? "Empresa sin nombre"}</span>
                  <span>{formatDraftTimestamp(draft.updated_at)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onResume(draft.id)}
                className="inline-flex items-center justify-center rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
              >
                Reanudar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DraftsList({
  drafts,
  loading,
  deletingDraftId,
  onOpen,
  onDelete,
}: {
  drafts: HubDraft[];
  loading?: boolean;
  deletingDraftId?: string | null;
  onOpen: (draft: HubDraft) => void;
  onDelete: (draft: HubDraft) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-sm">
        Cargando borradores...
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center shadow-sm">
        <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">
          No tienes borradores guardados.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Cuando empieces una acta o guardes un borrador, aparecerá en esta lista.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {getFormLabel(draft.form_slug)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {draft.empresa_nombre ?? "Empresa sin nombre"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="rounded-full bg-reca-50 px-2 py-0.5 font-medium text-reca">
                  Paso {draft.step + 1}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium",
                    draft.syncStatus === "local_only" &&
                      "bg-amber-100 text-amber-700",
                    draft.syncStatus === "local_newer" &&
                      "bg-blue-100 text-blue-700",
                    (draft.syncStatus === "synced" ||
                      draft.syncStatus === "remote_only") &&
                      "bg-green-100 text-green-700"
                  )}
                >
                  {draft.syncStatus === "local_only"
                    ? "Solo local"
                    : draft.syncStatus === "local_newer"
                      ? "Cambios locales pendientes"
                      : "Sincronizado"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDraftTimestamp(draft.effectiveUpdatedAt ?? undefined)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpen(draft)}
                className="inline-flex items-center gap-2 rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir en nueva pestaña
              </button>
              <button
                type="button"
                onClick={() => onDelete(draft)}
                disabled={deletingDraftId === draft.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                  deletingDraftId === draft.id
                    ? "cursor-not-allowed border-gray-200 text-gray-300"
                    : "border-red-200 text-red-600 hover:bg-red-50"
                )}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
