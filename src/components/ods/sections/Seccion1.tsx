"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOdsStore, type ProfesionalSource } from "@/hooks/useOdsStore";

type CatalogoItem = {
  id: number | string;
  nombre: string;
  programa?: string | null;
  source: ProfesionalSource;
};

export function Seccion1() {
  const seccion1 = useOdsStore((s) => s.seccion1);
  const setSeccion1 = useOdsStore((s) => s.setSeccion1);

  const [query, setQuery] = useState("");
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Si el query coincide con el profesional ya seleccionado, no volver
    // a buscar (el value cambió porque el operador eligió un item).
    if (query.trim() === seccion1.nombre_profesional && seccion1.nombre_profesional.length > 0) {
      setShowDropdown(false);
      return;
    }
    if (query.trim().length < 2) {
      setCatalogo([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ods/profesionales?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setCatalogo(data.items ?? []);
          setShowDropdown(true);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, seccion1.nombre_profesional]);

  const handleSelect = (item: CatalogoItem) => {
    setSeccion1({
      nombre_profesional: item.nombre,
      profesionalSource: item.source,
    });
    setQuery(item.nombre);
    setShowDropdown(false);
  };

  const isInterpreter = seccion1.profesionalSource === "interpretes";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm" data-testid="ods-seccion-1">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Seccion 1 — Informacion basica y profesional</h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ods-orden-clausulada">Orden clausulada</Label>
          <select
            id="ods-orden-clausulada"
            data-testid="ods-orden-clausulada"
            value={seccion1.orden_clausulada}
            onChange={(e) => setSeccion1({ orden_clausulada: e.target.value as "si" | "no" })}
            className="block w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="si">Si</option>
            <option value="no">No</option>
          </select>
        </div>

        <div ref={containerRef} className="relative space-y-1.5">
          <Label htmlFor="ods-profesional-input">Profesional / Interprete</Label>
          <Input
            id="ods-profesional-input"
            type="text"
            value={query || seccion1.nombre_profesional}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value !== seccion1.nombre_profesional) {
                setSeccion1({ nombre_profesional: "", profesionalSource: null });
              }
            }}
            onFocus={() => {
              if (catalogo.length > 0) setShowDropdown(true);
            }}
            placeholder="Buscar profesional o interprete..."
          />
          {loading && (
            <p className="mt-1 text-xs text-gray-500">Buscando...</p>
          )}
          {showDropdown && catalogo.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {catalogo.map((item) => (
                <li
                  key={`${item.source}-${item.id}`}
                  onMouseDown={() => handleSelect(item)}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-reca-light"
                >
                  <span>{item.nombre}</span>
                  {item.programa && (
                    <span className="ml-2 text-xs text-gray-500">({item.programa})</span>
                  )}
                  <span className="ml-2 text-xs text-gray-400">
                    [{item.source === "interpretes" ? "Interprete" : "Profesional"}]
                  </span>
                </li>
              ))}
            </ul>
          )}
          {showDropdown && catalogo.length === 0 && query.trim().length >= 2 && !loading && (
            <p className="mt-1 text-xs text-gray-500">Sin resultados</p>
          )}
          {isInterpreter && (
            <p className="mt-1 text-xs text-amber-600">
              Interprete seleccionado — el servicio de interpretacion se activara automaticamente en la Seccion 3.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
