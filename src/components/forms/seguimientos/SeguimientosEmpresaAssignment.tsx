"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { EmpresaSearchPanel } from "@/components/forms/shared/EmpresaSearchPanel";
import type {
  SeguimientosEmpresaAssignmentResolution,
  SeguimientosEmpresaCatalogOption,
} from "@/lib/seguimientosRuntime";
import type { Empresa } from "@/lib/store/empresaStore";
import { cn } from "@/lib/utils";

export type EmpresaAssignmentMode = SeguimientosEmpresaAssignmentResolution;

type SeguimientosEmpresaAssignmentProps = {
  mode?: EmpresaAssignmentMode;
  cedula?: string;
  nombreVinculado?: string;
  loading: boolean;
  error: string | null;
  onAssign: (nitEmpresa: string, nombreEmpresa: string) => Promise<void>;
  onCancel: () => void;
};

function describeEmpresaOption(empresa: SeguimientosEmpresaCatalogOption) {
  return [
    empresa.ciudad_empresa,
    empresa.sede_empresa,
    empresa.zona_empresa,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function getOptionKey(empresa: SeguimientosEmpresaCatalogOption) {
  return empresa.id || empresa.nombre_empresa || empresa.nit_empresa || "empresa";
}

function getOptionReference(empresa: SeguimientosEmpresaCatalogOption) {
  const id = String(empresa.id ?? "").trim();
  return id ? id.slice(0, 8) : "sin-id";
}

export function SeguimientosEmpresaAssignment({
  mode,
  cedula,
  nombreVinculado,
  loading,
  error,
  onAssign,
  onCancel,
}: SeguimientosEmpresaAssignmentProps) {
  const activeMode: EmpresaAssignmentMode = useMemo(
    () =>
      mode ?? {
        kind: "new",
        cedula: cedula ?? "",
        nombreVinculado: nombreVinculado ?? "",
      },
    [cedula, mode, nombreVinculado]
  );
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [selectedDisambiguationId, setSelectedDisambiguationId] = useState<
    string | null
  >(
    activeMode.kind === "disambiguate"
      ? activeMode.preselected?.id ?? null
      : null
  );

  useEffect(() => {
    setSelectedEmpresa(null);
    setSelectedDisambiguationId(
      activeMode.kind === "disambiguate"
        ? activeMode.preselected?.id ?? null
        : null
    );
  }, [activeMode]);

  const selectedDisambiguation = useMemo(() => {
    if (activeMode.kind !== "disambiguate" || !selectedDisambiguationId) {
      return null;
    }

    return (
      activeMode.options.find(
        (empresa) => empresa.id === selectedDisambiguationId
      ) ?? null
    );
  }, [activeMode, selectedDisambiguationId]);

  const handleSelect = useCallback((empresa: Empresa) => {
    setSelectedEmpresa(empresa);
  }, []);

  const handleAssign = useCallback(async () => {
    if (activeMode.kind === "disambiguate") {
      if (!selectedDisambiguation) {
        return;
      }

      await onAssign(
        activeMode.nit,
        selectedDisambiguation.nombre_empresa ?? ""
      );
      return;
    }

    if (!selectedEmpresa?.nit_empresa) {
      return;
    }

    await onAssign(
      selectedEmpresa.nit_empresa,
      selectedEmpresa.nombre_empresa ?? ""
    );
  }, [activeMode, onAssign, selectedDisambiguation, selectedEmpresa]);

  const handleClearSelection = useCallback(() => {
    setSelectedEmpresa(null);
  }, []);

  if (activeMode.kind === "disambiguate") {
    const confirmDisabled = loading || !selectedDisambiguation;

    return (
      <section
        data-testid="seguimientos-empresa-assignment-disambiguation"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <Building2 className="h-5 w-5 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900">
              Seleccionar empresa registrada
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              El NIT {activeMode.nit} tiene {activeMode.options.length} empresas
              registradas. Selecciona la correcta para este vinculado.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Vinculado: {activeMode.nombreVinculado} ({activeMode.cedula})
            </p>

            <div className="mt-4 space-y-3">
              {activeMode.options.map((empresa) => {
                const optionKey = getOptionKey(empresa);
                const details = describeEmpresaOption(empresa);
                const checked = selectedDisambiguationId === empresa.id;

                return (
                  <label
                    key={optionKey}
                    data-testid={`seguimientos-empresa-disambiguation-card-${empresa.id}`}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition-colors",
                      checked
                        ? "border-reca-300 bg-reca-50"
                        : "border-gray-200 hover:bg-amber-100/50",
                      loading && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <input
                      type="radio"
                      name="seguimientos-empresa-disambiguation"
                      data-testid={`seguimientos-empresa-disambiguation-option-${empresa.id}`}
                      disabled={loading}
                      checked={checked}
                      onChange={() => setSelectedDisambiguationId(empresa.id)}
                      className="mt-1 h-4 w-4 border-gray-300 text-reca focus:ring-reca-400"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">
                        {empresa.nombre_empresa}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        NIT: {empresa.nit_empresa ?? activeMode.nit}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Ref: {getOptionReference(empresa)}
                      </span>
                      {details.length > 0 ? (
                        <span className="mt-2 flex flex-wrap gap-2">
                          {details.map((detail) => (
                            <span
                              key={`${optionKey}-${detail}`}
                              className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                            >
                              {detail}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>

            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="seguimientos-empresa-assign-confirm-button"
                disabled={confirmDisabled}
                onClick={() => void handleAssign()}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                  confirmDisabled
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-reca text-white hover:bg-reca-dark"
                )}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Asignando...
                  </span>
                ) : (
                  "Confirmar y abrir caso"
                )}
              </button>
              <button
                type="button"
                data-testid="seguimientos-empresa-assign-cancel-button"
                disabled={loading}
                onClick={onCancel}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (selectedEmpresa) {
    return (
      <section
        data-testid="seguimientos-empresa-assignment-confirm"
        className="rounded-2xl border border-reca-200 bg-reca-50 p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-reca-100">
            <Building2 className="h-5 w-5 text-reca" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900">
              Confirmar asignación de empresa
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Vinculado: {activeMode.nombreVinculado} ({activeMode.cedula})
            </p>

            <div className="mt-4 rounded-xl border border-reca-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">
                {selectedEmpresa.nombre_empresa}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                NIT: {selectedEmpresa.nit_empresa}
              </p>
            </div>

            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="seguimientos-empresa-assign-confirm-button"
                disabled={loading}
                onClick={() => void handleAssign()}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                  loading
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-reca text-white hover:bg-reca-dark"
                )}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Asignando...
                  </span>
                ) : (
                  "Asignar empresa y continuar"
                )}
              </button>
              <button
                type="button"
                data-testid="seguimientos-empresa-assign-change-button"
                disabled={loading}
                onClick={handleClearSelection}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cambiar empresa
              </button>
              <button
                type="button"
                data-testid="seguimientos-empresa-assign-cancel-button"
                disabled={loading}
                onClick={onCancel}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const assignmentMessage =
    activeMode.message ??
    `${activeMode.nombreVinculado} (${activeMode.cedula}) no tiene empresa asociada. Busca y selecciona la empresa para continuar con el caso.`;

  return (
    <section
      data-testid="seguimientos-empresa-assignment"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Building2 className="h-5 w-5 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-gray-900">
            Asignar empresa al vinculado
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            {assignmentMessage}
          </p>

          <div className="mt-4">
            {error ? (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            ) : null}

            <EmpresaSearchPanel
              onSelect={handleSelect}
              autoFocus
              variant="embedded"
              disabled={loading}
              title="Buscar empresa"
              description="Busca por nombre o NIT en el catalogo activo."
              placeholder="Buscar empresa por nombre o NIT"
              emptyTitle="No se encontraron empresas con ese nombre o NIT."
              emptyDescription="Verifica el dato o contacta al administrador."
              idleText="Selecciona una empresa para continuar con el caso."
              loadingMessage="Buscando empresas..."
              inputTestId="seguimientos-empresa-search-input"
              resultTestId={(empresa) =>
                `seguimientos-empresa-result-${empresa.nit_empresa}`
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
