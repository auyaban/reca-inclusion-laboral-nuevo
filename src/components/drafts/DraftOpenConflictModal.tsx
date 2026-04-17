"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { getFormLabel } from "@/lib/forms";
import type { HubDraft } from "@/lib/drafts";

type DraftOpenConflictModalProps = {
  draft: HubDraft | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DraftOpenConflictModal({
  draft,
  open,
  onCancel,
  onConfirm,
}: DraftOpenConflictModalProps) {
  if (!open || !draft) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900">
              Este borrador ya está abierto
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {getFormLabel(draft.form_slug)}
              {draft.empresa_nombre ? ` · ${draft.empresa_nombre}` : ""}
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Si abres otra pestaña, esa copia guardada entrará en solo lectura
              hasta que tomes el control desde allá.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir otra pestaña
          </button>
        </div>
      </div>
    </div>
  );
}
