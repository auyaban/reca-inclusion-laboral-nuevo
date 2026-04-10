"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EMPRESA_SELECT_FIELDS } from "@/lib/empresa";
import { getFormLabel, getFormTabLabel } from "@/lib/forms";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import { cn } from "@/lib/utils";

export default function Section1Form({ slug }: { slug: string }) {
  const router = useRouter();
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formName = getFormLabel(slug);
  const formTabLabel = getFormTabLabel(slug);

  useEffect(() => {
    document.title = `${formTabLabel} | Nueva acta`;
  }, [formTabLabel]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error: searchError } = await supabase
        .from("empresas")
        .select(EMPRESA_SELECT_FIELDS)
        .ilike("nombre_empresa", `%${query.trim()}%`)
        .order("nombre_empresa", { ascending: true })
        .limit(20);

      if (searchError) {
        setError("Error al buscar empresas. Intenta de nuevo.");
      } else {
        setResults(((data ?? []) as unknown) as Empresa[]);
      }

      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  function handleSelect(empresa: Empresa) {
    setEmpresa(empresa);
    router.push(`/formularios/${slug}/seccion-2?session=${crypto.randomUUID()}`);
  }

  const showNoResults =
    !loading && query.trim().length >= 2 && results.length === 0 && !error;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/hub")}
            className="mb-3 flex items-center gap-1.5 text-sm text-reca-200 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al menu
          </button>
          <h1 className="text-lg font-bold leading-tight text-white">{formName}</h1>
          <p className="mt-0.5 text-sm text-reca-200">Paso 1 de 2 - Seleccionar empresa</p>
        </div>
      </div>

      <div className="h-1 bg-gray-200">
        <div className="h-1 w-1/2 bg-reca transition-all" />
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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
              placeholder="Ej: Banco de Bogota, Exito, Compensar..."
              autoFocus
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
              {results.map((empresa) => (
                <li key={empresa.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(empresa)}
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
                        {empresa.sede_empresa && (
                          <span className="text-xs text-gray-400">
                            Sede: {empresa.sede_empresa}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-reca" />
                  </button>
                </li>
              ))}
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
                Busca entre {1134} empresas registradas en el sistema.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
