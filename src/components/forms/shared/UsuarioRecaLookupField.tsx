"use client";

import { useEffect, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Loader2, Search } from "lucide-react";
import { useUsuarioRecaDetail } from "@/hooks/useUsuarioRecaDetail";
import { useUsuariosRecaSearch } from "@/hooks/useUsuariosRecaSearch";
import {
  normalizeCedulaUsuario,
  type UsuarioRecaRecord,
} from "@/lib/usuariosReca";
import { cn } from "@/lib/utils";

type UsuarioRecaLookupFieldProps = {
  id: string;
  dataTestIdBase?: string;
  value: string;
  selectedRecordCedula?: string | null;
  error?: string;
  highlighted?: boolean;
  disabled?: boolean;
  hasReplaceTargetData: boolean;
  registration: UseFormRegisterReturn;
  onSuggestionSelect: (cedula: string) => void;
  onLoadRecord: (record: UsuarioRecaRecord) => void | Promise<void>;
};

export function UsuarioRecaLookupField({
  id,
  dataTestIdBase,
  value,
  selectedRecordCedula = null,
  error,
  highlighted = false,
  disabled = false,
  hasReplaceTargetData,
  registration,
  onSuggestionSelect,
  onLoadRecord,
}: UsuarioRecaLookupFieldProps) {
  const [lookupValue, setLookupValue] = useState(value);

  useEffect(() => {
    setLookupValue(value);
  }, [value]);

  const {
    results,
    loading: searchLoading,
    error: searchError,
    normalizedQuery,
    showNoResults,
  } = useUsuariosRecaSearch(lookupValue);
  const {
    loading: detailLoading,
    error: detailError,
    loadByCedula,
    clearError,
  } = useUsuarioRecaDetail();
  const normalizedSelectedCedula = normalizeCedulaUsuario(selectedRecordCedula);
  const visibleResults =
    normalizedQuery.length >= 3 && normalizedQuery === normalizedSelectedCedula
      ? []
      : results;
  const showLookupNoResults =
    showNoResults && normalizedQuery !== normalizedSelectedCedula;

  const canLoad = normalizeCedulaUsuario(lookupValue).length >= 3 && !disabled;
  const loadButtonLabel = hasReplaceTargetData
    ? "Reemplazar datos"
    : "Cargar datos";
  const inputClassName = cn(
    "w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm",
    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
    error
      ? "border-red-400 bg-red-50"
      : highlighted
        ? "border-amber-300 bg-amber-50"
        : "border-gray-200"
  );

  return (
    <div
      data-testid={dataTestIdBase ? `${dataTestIdBase}.lookup` : undefined}
      className="space-y-2 rounded-xl border border-dashed border-reca-200 bg-reca-50/70 p-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <label
            htmlFor={id}
            className="text-xs font-semibold uppercase tracking-wide text-reca"
          >
            Consulta usuarios RECA por cedula
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id={id}
              data-testid={
                dataTestIdBase ? `${dataTestIdBase}.lookup-input` : undefined
              }
              type="text"
              placeholder="Escribe la cedula"
              disabled={disabled}
              {...registration}
              onChange={(event) => {
                setLookupValue(String(event.target.value ?? ""));
                clearError();
                registration.onChange(event);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || !canLoad || detailLoading) {
                  return;
                }

                event.preventDefault();
                void loadByCedula(lookupValue).then(async (record) => {
                  if (record) {
                    await onLoadRecord(record);
                  }
                });
              }}
              className={inputClassName}
            />
            {searchLoading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            ) : null}
          </div>
          {normalizedQuery.length > 0 && normalizedQuery.length < 3 ? (
            <p className="text-xs text-gray-500">
              Escribe al menos 3 digitos para buscar.
            </p>
          ) : null}
          <p className="text-xs text-gray-500">
            Escribe la cedula y luego usa {loadButtonLabel}. Tambien puedes
            presionar Enter para cargar el registro exacto.
          </p>
        </div>

        <button
          type="button"
          data-testid={
            dataTestIdBase ? `${dataTestIdBase}.lookup-load-button` : undefined
          }
          disabled={!canLoad || detailLoading}
          onClick={async () => {
            const record = await loadByCedula(lookupValue);
            if (record) {
              await onLoadRecord(record);
            }
          }}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            !canLoad || detailLoading
              ? "cursor-not-allowed bg-gray-200 text-gray-500"
              : "bg-reca text-white hover:bg-reca-dark"
          )}
        >
          {detailLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Consultando
            </>
          ) : (
            loadButtonLabel
          )}
        </button>
      </div>

      {visibleResults.length > 0 ? (
        <ul
          data-testid={
            dataTestIdBase ? `${dataTestIdBase}.lookup-results` : undefined
          }
          className="overflow-hidden rounded-lg border border-gray-200 bg-white"
        >
          {visibleResults.map((result) => (
            <li
              key={result.cedula_usuario}
              className="border-t border-gray-100 first:border-t-0"
            >
              <button
                type="button"
                data-testid={
                  dataTestIdBase
                    ? `${dataTestIdBase}.lookup-suggestion-${result.cedula_usuario}`
                    : undefined
                }
                disabled={disabled}
                onClick={() => {
                  clearError();
                  setLookupValue(result.cedula_usuario);
                  onSuggestionSelect(result.cedula_usuario);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-reca-50"
              >
                <span className="font-medium text-gray-900">
                  {result.cedula_usuario}
                </span>
                <span className="truncate text-xs text-gray-500">
                  {result.nombre_usuario}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {detailError ? (
        <p
          data-testid={
            dataTestIdBase ? `${dataTestIdBase}.lookup-detail-error` : undefined
          }
          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
        >
          {detailError}
        </p>
      ) : null}

      {searchError ? (
        <p
          data-testid={
            dataTestIdBase ? `${dataTestIdBase}.lookup-search-error` : undefined
          }
          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
        >
          {searchError}
        </p>
      ) : null}

      {showLookupNoResults && !detailError && !searchError ? (
        <p
          data-testid={
            dataTestIdBase ? `${dataTestIdBase}.lookup-no-results` : undefined
          }
          className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600"
        >
          No se encontraron coincidencias para esa cedula.
        </p>
      ) : null}
    </div>
  );
}
