"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  Search,
  Building2,
  ChevronRight,
  Loader2,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FORM_NAMES: Record<string, string> = {
  presentacion: "Presentación del Programa",
  evaluacion: "Evaluación de Accesibilidad",
  "condiciones-vacante": "Condiciones de la Vacante",
  seleccion: "Selección Incluyente",
  contratacion: "Contratación Incluyente",
  "induccion-organizacional": "Inducción Organizacional",
  "induccion-operativa": "Inducción Operativa",
  sensibilizacion: "Sensibilización",
  seguimientos: "Seguimientos",
};

export default function Section1Form({ slug }: { slug: string }) {
  const router = useRouter();
  const setEmpresa = useEmpresaStore((s) => s.setEmpresa);
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formName = FORM_NAMES[slug] ?? slug;

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const { data, error: sbError } = await supabase
        .from("empresas")
        .select(
          "id, nombre_empresa, nit_empresa, ciudad_empresa, sede_empresa, direccion_empresa, contacto_empresa, telefono_empresa, profesional_asignado"
        )
        .ilike("nombre_empresa", `%${query.trim()}%`)
        .order("nombre_empresa", { ascending: true })
        .limit(20);

      if (sbError) {
        setError("Error al buscar empresas. Intenta de nuevo.");
      } else {
        setResults((data as Empresa[]) ?? []);
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(empresa: Empresa) {
    setEmpresa(empresa);
    router.push(`/formularios/${slug}/seccion-2`);
  }

  const showNoResults =
    !loading && query.trim().length >= 2 && results.length === 0 && !error;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-reca shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => router.push("/hub")}
            className="flex items-center gap-1.5 text-reca-200 hover:text-white text-sm mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al menú
          </button>
          <h1 className="text-white font-bold text-lg leading-tight">
            {formName}
          </h1>
          <p className="text-reca-200 text-sm mt-0.5">
            Paso 1 de 2 — Seleccionar empresa
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-reca w-1/2 transition-all" />
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {/* Título de sección */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-reca-50 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-reca" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                Buscar empresa
              </h2>
              <p className="text-xs text-gray-500">
                Escribe el nombre de la empresa a visitar
              </p>
            </div>
          </div>

          {/* Input de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: Banco de Bogotá, Éxito, Compensar..."
              autoFocus
              className={cn(
                "w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                "placeholder:text-gray-400 transition-all"
              )}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Hint mínimo de caracteres */}
          {query.length > 0 && query.trim().length < 2 && (
            <p className="mt-2 text-xs text-gray-400">
              Escribe al menos 2 caracteres para buscar.
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Lista de resultados */}
          {results.length > 0 && (
            <ul className="mt-4 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              {results.map((emp) => (
                <li key={emp.id}>
                  <button
                    onClick={() => handleSelect(emp)}
                    className="w-full text-left px-4 py-3.5 hover:bg-reca-50 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {emp.nombre_empresa}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {emp.nit_empresa && (
                          <span className="text-xs text-gray-400">
                            NIT: {emp.nit_empresa}
                          </span>
                        )}
                        {emp.ciudad_empresa && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {emp.ciudad_empresa}
                          </span>
                        )}
                        {emp.sede_empresa && (
                          <span className="text-xs text-gray-400">
                            Sede: {emp.sede_empresa}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-reca shrink-0 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Sin resultados */}
          {showNoResults && (
            <div className="mt-4 text-center py-8">
              <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">
                Sin resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Verifica el nombre o contacta al administrador.
              </p>
            </div>
          )}

          {/* Estado inicial */}
          {query.trim().length === 0 && (
            <div className="mt-6 text-center py-4">
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
