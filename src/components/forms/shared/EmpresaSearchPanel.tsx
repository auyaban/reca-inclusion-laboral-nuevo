"use client";

import { useState } from "react";
import {
  Building2,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { useEmpresaSearch } from "@/hooks/useEmpresaSearch";
import { getEmpresaById } from "@/lib/empresa";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import type { Empresa } from "@/lib/store/empresaStore";
import { cn } from "@/lib/utils";

type EmpresaSearchPanelProps = {
  onSelect: (empresa: Empresa) => void;
  autoFocus?: boolean;
  className?: string;
};

export function EmpresaSearchPanel({
  onSelect,
  autoFocus = false,
  className,
}: EmpresaSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const { results, loading, error, showNoResults } = useEmpresaSearch(query);

  const handleSelect = async (empresa: Empresa) => {
    setSelectingId(empresa.id);
    try {
      const full = await getEmpresaById(empresa.id);
      onSelect(full ?? empresa);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white p-6 shadow-sm", className)}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-reca-50">
          <Building2 className="h-5 w-5 text-reca" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Buscar empresa</h2>
          <p className="text-xs text-gray-500">
            Escribe el nombre de la empresa a visitar
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej: Banco de Bogotá, Éxito, Compensar..."
          autoFocus={autoFocus}
          className={cn(
            "w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-sm",
            "placeholder:text-gray-400 transition-all",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400"
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {query.length > 0 && query.trim().length < 2 && (
        <p className="mt-2 text-xs text-gray-400">
          Escribe al menos 2 caracteres para buscar.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
          {results.map((empresa) => {
            const sedeCompensar = getEmpresaSedeCompensarValue(empresa);

            return (
              <li key={empresa.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(empresa)}
                  disabled={selectingId !== null}
                  className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-reca-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {empresa.nombre_empresa}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3">
                      {empresa.nit_empresa && (
                        <span className="text-xs text-gray-400">
                          NIT: {empresa.nit_empresa}
                        </span>
                      )}
                      {empresa.ciudad_empresa && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />
                          {empresa.ciudad_empresa}
                        </span>
                      )}
                      {sedeCompensar && (
                        <span className="text-xs text-gray-400">
                          Zona Compensar: {sedeCompensar}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectingId === empresa.id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-reca" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-reca" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showNoResults && (
        <div className="mt-4 py-8 text-center">
          <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">
            Sin resultados para &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Verifica el nombre o contacta al administrador.
          </p>
        </div>
      )}

      {query.trim().length === 0 && (
        <div className="mt-6 py-4 text-center">
          <p className="text-xs text-gray-400">
            Busca entre 1134 empresas registradas en el sistema.
          </p>
        </div>
      )}
    </div>
  );
}
