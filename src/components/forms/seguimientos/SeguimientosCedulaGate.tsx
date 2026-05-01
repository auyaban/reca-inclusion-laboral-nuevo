"use client";

import { useCallback, useState } from "react";
import { FileSpreadsheet, Loader2, Search, UserRound } from "lucide-react";
import { useUsuarioRecaDetail } from "@/hooks/useUsuarioRecaDetail";
import { useUsuariosRecaSearch } from "@/hooks/useUsuariosRecaSearch";
import { SeguimientosEmpresaAssignment } from "@/components/forms/seguimientos/SeguimientosEmpresaAssignment";
import type { SeguimientosCompanyType } from "@/lib/seguimientos";
import { cn } from "@/lib/utils";

type SeguimientosCedulaGateProps = {
  preparing: boolean;
  progressStep: string;
  error: string | null;
  companyTypeResolution:
    | {
        cedula: string;
        context: Record<string, unknown>;
      }
    | null;
  onPrepareCedula: (cedula: string, companyTypeOverride?: SeguimientosCompanyType) => Promise<unknown>;
};

export function SeguimientosCedulaGate({
  preparing,
  progressStep,
  error,
  companyTypeResolution,
  onPrepareCedula,
}: SeguimientosCedulaGateProps) {
  const [query, setQuery] = useState(companyTypeResolution?.cedula ?? "");
  const {
    results,
    loading: searchLoading,
    error: searchError,
    showNoResults,
  } = useUsuariosRecaSearch(query);
  const { loading: detailLoading, error: detailError, loadByCedula } =
    useUsuarioRecaDetail();

  const [pendingAssignment, setPendingAssignment] = useState<{
    cedula: string;
    nombre_usuario: string;
  } | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const handlePrepare = useCallback(
    async (cedula: string, companyTypeOverride?: SeguimientosCompanyType) => {
      setQuery(cedula);
      setAssignmentError(null);
      const record = await loadByCedula(cedula);
      if (!record) {
        return;
      }

      const hasEmpresa =
        typeof record.empresa_nit === "string" &&
        record.empresa_nit.trim().length > 0;

      if (!hasEmpresa) {
        setPendingAssignment({
          cedula: record.cedula_usuario,
          nombre_usuario: record.nombre_usuario ?? record.cedula_usuario,
        });
        return;
      }

      await onPrepareCedula(record.cedula_usuario, companyTypeOverride);
    },
    [loadByCedula, onPrepareCedula]
  );

  const handleAssignEmpresa = useCallback(
    async (nitEmpresa: string, nombreEmpresa: string) => {
      if (!pendingAssignment) {
        return;
      }

      setAssignmentError(null);

      try {
        const response = await fetch("/api/seguimientos/empresa/assign", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cedula: pendingAssignment.cedula,
            nit_empresa: nitEmpresa,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setAssignmentError(
            payload.message ?? "No se pudo asignar la empresa."
          );
          return;
        }

        setPendingAssignment(null);
        setAssignmentError(null);

        try {
          await onPrepareCedula(pendingAssignment.cedula);
        } catch {
          setAssignmentError(
            "La empresa quedó asignada, pero no pudimos abrir el caso. Vuelve a buscar la cédula para reintentar."
          );
        }
      } catch {
        setAssignmentError("No se pudo conectar con el servidor.");
      }
    },
    [onPrepareCedula, pendingAssignment]
  );

  const handleCancelAssignment = useCallback(() => {
    setPendingAssignment(null);
    setAssignmentError(null);
  }, []);

  const loading = preparing || detailLoading;
  const companyName =
    typeof companyTypeResolution?.context.empresa_nombre === "string"
      ? companyTypeResolution.context.empresa_nombre
      : "";

  return (
    <div data-testid="seguimientos-cedula-gate" className="min-h-screen bg-gray-50">
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/15 p-2 text-white">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">
                Seguimientos
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-reca-100">
                Busca al vinculado por cédula para preparar el caso, resolver la
                empresa asociada y abrir la ficha inicial.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="space-y-6">
          {pendingAssignment ? (
            <SeguimientosEmpresaAssignment
              cedula={pendingAssignment.cedula}
              nombreVinculado={pendingAssignment.nombre_usuario}
              loading={loading}
              error={assignmentError}
              onAssign={handleAssignEmpresa}
              onCancel={handleCancelAssignment}
            />
          ) : null}

          <section
            className={cn(
              "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm",
              pendingAssignment ? "opacity-60" : undefined
            )}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-reca-50">
                <UserRound className="h-5 w-5 text-reca" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  Buscar por cédula
                </h2>
                <p className="text-xs text-gray-500">
                  La selección dispara de inmediato el bootstrap del caso.
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                data-testid="seguimientos-cedula-input"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Escribe la cédula"
                disabled={loading}
                className={cn(
                  "w-full rounded-xl border border-gray-200 py-3 pl-10 pr-24 text-sm",
                  "placeholder:text-gray-400 transition-all",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                  loading && "cursor-not-allowed bg-gray-50"
                )}
              />
              <button
                type="button"
                data-testid="seguimientos-cedula-open-button"
                disabled={loading || query.trim().length < 3}
                onClick={() => void handlePrepare(query)}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  loading || query.trim().length < 3
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-reca text-white hover:bg-reca-dark"
                )}
              >
                {loading ? "Preparando" : "Abrir"}
              </button>
            </div>

            {searchError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {searchError}
              </p>
            ) : null}

            {detailError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {detailError}
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            {results.length > 0 ? (
              <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
                {results.map((result) => (
                  <li key={result.cedula_usuario}>
                    <button
                      type="button"
                      data-testid={`seguimientos-cedula-result-${result.cedula_usuario}`}
                      disabled={loading}
                      onClick={() => void handlePrepare(result.cedula_usuario)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-reca-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {result.cedula_usuario}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {result.nombre_usuario}
                        </p>
                      </div>
                      {loading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-reca" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {showNoResults ? (
              <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                No se encontraron coincidencias para esa cédula.
              </div>
            ) : null}

            {companyTypeResolution ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Falta confirmar el tipo de empresa
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  {companyName
                    ? `La empresa asociada es ${companyName}. Confirma cuántos seguimientos hacer (3 o 6) según la cobertura de la empresa.`
                    : "Confirma cuántos seguimientos hacer (3 o 6) según la cobertura de la empresa."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="seguimientos-company-type-compensar"
                    disabled={loading}
                    onClick={() =>
                      void handlePrepare(companyTypeResolution.cedula, "compensar")
                    }
                    className="rounded-xl bg-reca px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark disabled:opacity-50"
                  >
                    Compensar
                  </button>
                  <button
                    type="button"
                    data-testid="seguimientos-company-type-no-compensar"
                    disabled={loading}
                    onClick={() =>
                      void handlePrepare(
                        companyTypeResolution.cedula,
                        "no_compensar"
                      )
                    }
                    className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
                  >
                    No Compensar
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">
            Estado del bootstrap
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            El caso prepara persona, empresa y bundle de Google antes de abrir
            el editor.
          </p>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-reca" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-gray-300" />
              )}
              <p className="text-sm font-medium text-gray-900">
                {loading ? progressStep : "Esperando selección de cédula"}
              </p>
            </div>
          </div>

          {searchLoading && !loading ? (
            <p className="mt-3 text-xs text-gray-500">
              Buscando coincidencias en usuarios RECA…
            </p>
          ) : null}

          {pendingAssignment ? (
            <p className="mt-3 text-xs text-gray-500">
              Asignación de empresa pendiente.
            </p>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
