"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type CleanupView = "pending" | "purgeable";

type DraftCleanupRow = {
  id: string;
  userId?: string | null;
  formSlug?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  googlePrewarmCleanupStatus?: string | null;
  googlePrewarmCleanupError?: string | null;
  spreadsheetId?: string | null;
};

type OperationResult = {
  success?: boolean;
  matched?: number;
  processed?: number;
  remainingEstimate?: number;
  stoppedEarly?: boolean;
  purged?: number;
  cappedToSafeLimit?: boolean;
  error?: string;
};

function getSpreadsheetUrl(spreadsheetId?: string | null) {
  return spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Sin dato";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

async function readJsonResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as OperationResult & {
    drafts?: DraftCleanupRow[];
  };

  if (!response.ok) {
    throw new Error(payload.error || "La operacion interna fallo.");
  }

  return payload;
}

export function DraftCleanupAdminPanel() {
  const [view, setView] = useState<CleanupView>("pending");
  const [drafts, setDrafts] = useState<DraftCleanupRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OperationResult | null>(null);

  const selectedCount = selectedIds.size;
  const endpoint = useMemo(() => {
    return view === "purgeable"
      ? "/api/internal/draft-cleanup?view=purgeable"
      : "/api/internal/draft-cleanup";
  }, [view]);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await readJsonResponse(await fetch(endpoint));
      setDrafts(payload.drafts ?? []);
      setSelectedIds(new Set());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la lista."
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  function toggleSelected(draftId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(draftId)) {
        next.delete(draftId);
      } else {
        next.add(draftId);
      }
      return next;
    });
  }

  async function runAction(action: "retrySelected" | "retryVisible" | "purgeSelected") {
    setActionLoading(true);
    setError(null);
    setResult(null);

    try {
      const draftIds = Array.from(selectedIds);
      let response: Response;

      if (action === "purgeSelected") {
        if (draftIds.length === 0) {
          throw new Error("Selecciona al menos un borrador purgable.");
        }

        const confirmed = window.confirm(
          `Se purgaran ${draftIds.length} borrador(es) soft-deleted. Esta accion no se puede deshacer.`
        );
        if (!confirmed) {
          return;
        }

        response = await fetch("/api/internal/draft-cleanup", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirm: "PURGE_SOFT_DELETED_DRAFTS",
            draftIds,
          }),
        });
      } else {
        const body =
          action === "retrySelected"
            ? { draftIds }
            : { limit: Math.max(drafts.length, 1) };
        if (action === "retrySelected" && draftIds.length === 0) {
          throw new Error("Selecciona al menos un borrador para reintentar.");
        }

        response = await fetch("/api/internal/draft-cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const payload = await readJsonResponse(response);
      setResult(payload);
      await loadDrafts();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "No se pudo completar la operacion."
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Cleanup de borradores
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Operacion interna para diagnosticar, reintentar y purgar archivos
              provisionales de Drive.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("pending")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                view === "pending"
                  ? "bg-reca text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Cleanup pendiente/fallido
            </button>
            <button
              type="button"
              onClick={() => setView("purgeable")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                view === "purgeable"
                  ? "bg-reca text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Purgables
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadDrafts}
            disabled={loading || actionLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
          {view === "pending" ? (
            <>
              <button
                type="button"
                onClick={() => runAction("retrySelected")}
                disabled={actionLoading || selectedCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-reca px-3 py-2 text-xs font-semibold text-white hover:bg-reca-700 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reintentar seleccionados ({selectedCount})
              </button>
              <button
                type="button"
                onClick={() => runAction("retryVisible")}
                disabled={actionLoading || drafts.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-reca-200 px-3 py-2 text-xs font-semibold text-reca hover:bg-reca-50 disabled:opacity-50"
              >
                Reintentar lote visible
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => runAction("purgeSelected")}
              disabled={actionLoading || selectedCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Purgar seleccionados ({selectedCount})
            </button>
          )}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span className="font-semibold">Resultado:</span>{" "}
            {[
              result.matched != null ? `matched ${result.matched}` : null,
              result.processed != null ? `processed ${result.processed}` : null,
              result.remainingEstimate != null
                ? `remaining ${result.remainingEstimate}`
                : null,
              result.purged != null ? `purged ${result.purged}` : null,
              result.stoppedEarly ? "stoppedEarly" : null,
              result.cappedToSafeLimit ? "batch cap aplicado" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Seleccion</th>
              <th className="px-4 py-3">Formulario</th>
              <th className="px-4 py-3">Borrador</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Eliminado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Spreadsheet</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drafts.map((draft) => {
              const spreadsheetUrl = getSpreadsheetUrl(draft.spreadsheetId);
              return (
                <tr key={draft.id} className="align-top">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(draft.id)}
                      onChange={() => toggleSelected(draft.id)}
                      aria-label={`Seleccionar ${draft.id}`}
                      className="h-4 w-4 rounded border-gray-300 text-reca focus:ring-reca"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {draft.formSlug ?? "Sin formulario"}
                  </td>
                  <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-gray-600">
                    {draft.id}
                  </td>
                  <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-gray-500">
                    {draft.userId ?? "Sin usuario"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(draft.deletedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                      {draft.googlePrewarmCleanupStatus ?? "sin estado"}
                    </span>
                  </td>
                  <td className="max-w-[180px] px-4 py-3 font-mono text-xs">
                    {spreadsheetUrl ? (
                      <a
                        href={spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-reca underline-offset-2 hover:underline"
                      >
                        {draft.spreadsheetId}
                      </a>
                    ) : (
                      <span className="text-gray-400">Sin spreadsheet</span>
                    )}
                  </td>
                  <td className="max-w-[260px] px-4 py-3 text-xs text-gray-600">
                    {draft.googlePrewarmCleanupError ?? "Sin error"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && drafts.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">
          No hay borradores en esta vista.
        </div>
      ) : null}
    </section>
  );
}
