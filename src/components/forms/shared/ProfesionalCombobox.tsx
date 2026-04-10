"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Profesional = {
  nombre_profesional: string;
  cargo_profesional: string | null;
};

type Props = {
  value: string;
  onChange: (nombre: string) => void;
  onCargoChange: (cargo: string) => void;
  profesionales: Profesional[];
  error?: string;
  placeholder?: string;
};

/**
 * Combobox reutilizable para seleccionar un profesional RECA.
 * Al seleccionar autocompleta el cargo correspondiente.
 */
export function ProfesionalCombobox({
  value,
  onChange,
  onCargoChange,
  profesionales,
  error,
  placeholder = "Buscar profesional RECA...",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [filtering, setFiltering] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
    setFiltering(false);
  }, [value]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFiltering(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase("es-CO");
  const filtered = !filtering || !normalizedQuery
    ? profesionales
    : profesionales.filter((p) =>
        p.nombre_profesional.toLocaleLowerCase("es-CO").includes(normalizedQuery)
      );

  function select(p: Profesional) {
    setQuery(p.nombre_profesional);
    onChange(p.nombre_profesional);
    onCargoChange(p.cargo_profesional ?? "");
    setOpen(false);
    setFiltering(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const nextValue = e.target.value;
            setQuery(nextValue);
            onChange(nextValue);
            setFiltering(true);
            setOpen(true);
          }}
          onFocus={() => {
            setFiltering(false);
            setOpen(true);
          }}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-lg border px-3 py-2 pr-8 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
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
          aria-label="Mostrar profesionales"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.nombre_profesional}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                select(p);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-reca-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-800">{p.nombre_profesional}</p>
              {p.cargo_profesional && (
                <p className="text-xs text-gray-500">{p.cargo_profesional}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
