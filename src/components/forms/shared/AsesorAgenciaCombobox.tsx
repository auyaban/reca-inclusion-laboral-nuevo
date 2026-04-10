"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAsesoresCatalog, type Asesor } from "@/hooks/useAsesoresCatalog";
import { cn } from "@/lib/utils";
import { normalizePersonName } from "@/lib/asistentes";

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
};

export function AsesorAgenciaCombobox({
  value,
  onChange,
  error,
  placeholder = "Nombre del asesor agencia...",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [filtering, setFiltering] = useState(false);
  const { asesores, error: catalogError } = useAsesoresCatalog();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
    setFiltering(false);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setFiltering(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (catalogError) {
      return [];
    }

    const normalizedQuery = query.trim().toLocaleLowerCase("es-CO");
    if (!filtering || !normalizedQuery) {
      return asesores;
    }

    return asesores.filter((asesor) =>
      asesor.nombre.toLocaleLowerCase("es-CO").includes(normalizedQuery)
    );
  }, [asesores, catalogError, filtering, query]);

  function commitValue(nextValue: string) {
    const normalized = normalizePersonName(nextValue);
    setQuery(normalized);
    setFiltering(false);
    onChange(normalized);
  }

  function selectAsesor(asesor: Asesor) {
    setQuery(asesor.nombre);
    onChange(asesor.nombre);
    setOpen(false);
    setFiltering(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            onChange(nextValue);
            setFiltering(true);
            setOpen(true);
          }}
          onFocus={() => {
            setFiltering(false);
            setOpen(true);
          }}
          onBlur={() => commitValue(query)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-lg border px-3 py-2 pr-8 text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
            error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
          )}
        />
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            setFiltering(false);
            setOpen((current) => !current);
          }}
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Mostrar asesores"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.map((asesor) => (
            <button
              key={asesor.nombre}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                selectAsesor(asesor);
              }}
              className="w-full px-3 py-2.5 text-left transition-colors hover:bg-amber-50"
            >
              <p className="text-sm font-medium text-gray-800">{asesor.nombre}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
