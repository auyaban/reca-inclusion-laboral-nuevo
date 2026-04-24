"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { BROWSER_AUTOFILL_SEARCH_GUARD_PROPS } from "@/lib/browserAutofill";
import {
  buildInterpreteNameKey,
  normalizeInterpreteName,
} from "@/lib/interpretesCatalog";
import { cn } from "@/lib/utils";
import type { InterpreteCatalogItem } from "@/hooks/useInterpretesCatalog";

type Props = {
  value: string;
  onChange: (nombre: string) => void;
  onBlur?: (value: string) => void;
  interpretes: InterpreteCatalogItem[];
  onCreate?: (nombre: string) => Promise<InterpreteCatalogItem>;
  creatingName?: string | null;
  error?: string;
  highlighted?: boolean;
  placeholder?: string;
  inputId?: string;
  inputName?: string;
};

export function InterpreteCombobox({
  value,
  onChange,
  onBlur,
  interpretes,
  onCreate,
  creatingName,
  error,
  highlighted = false,
  placeholder = "Buscar interprete...",
  inputId,
  inputName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [filtering, setFiltering] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
    setFiltering(false);
  }, [value]);

  useEffect(() => {
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setFiltering(false);
      }
    }

    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase("es-CO");
  const filtered = useMemo(() => {
    if (!filtering || !normalizedQuery) {
      return interpretes;
    }

    return interpretes.filter((interprete) =>
      interprete.nombre.toLocaleLowerCase("es-CO").includes(normalizedQuery)
    );
  }, [filtering, interpretes, normalizedQuery]);

  const exactMatch =
    interpretes.find(
      (interprete) => buildInterpreteNameKey(interprete.nombre) === buildInterpreteNameKey(query)
    ) ?? null;
  const normalizedFreeText = normalizeInterpreteName(query);
  const canCreate = Boolean(
    onCreate && normalizedFreeText && !exactMatch
  );
  const isCreating =
    Boolean(creatingName) &&
    buildInterpreteNameKey(creatingName ?? "") === buildInterpreteNameKey(query);
  const showPanel =
    open &&
    (filtered.length > 0 ||
      canCreate ||
      interpretes.length === 0 ||
      normalizedQuery.length > 0);

  function select(interprete: InterpreteCatalogItem) {
    setCreateError(null);
    setQuery(interprete.nombre);
    onChange(interprete.nombre);
    setOpen(false);
    setFiltering(false);
  }

  async function handleCreate() {
    if (!onCreate) {
      return;
    }

    try {
      const created = await onCreate(normalizedFreeText);
      select(created);
    } catch (cause) {
      setCreateError(
        cause instanceof Error
          ? cause.message
          : "No se pudo crear el interprete."
      );
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          id={inputId}
          name={inputName}
          type="text"
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setCreateError(null);
            setQuery(nextValue);
            onChange(nextValue);
            setFiltering(true);
            setOpen(true);
          }}
          onFocus={() => {
            setFiltering(false);
            setOpen(true);
          }}
          onBlur={() => {
            const nextValue = exactMatch?.nombre ?? normalizedFreeText;
            if (exactMatch) {
              onChange(exactMatch.nombre);
            } else if (nextValue !== query) {
              setQuery(nextValue);
              onChange(nextValue);
            }
            setOpen(false);
            setFiltering(false);
            onBlur?.(nextValue);
          }}
          placeholder={placeholder}
          {...BROWSER_AUTOFILL_SEARCH_GUARD_PROPS}
          className={cn(
            "w-full rounded-lg border px-3 py-2 pr-8 text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
            error
              ? "border-red-400 bg-red-50"
              : highlighted
                ? "border-amber-300 bg-amber-50"
                : "border-gray-200 bg-white"
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
          aria-label="Mostrar interpretes"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {createError ? (
        <p className="mt-1 text-xs text-red-600">{createError}</p>
      ) : null}

      {showPanel ? (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.map((interprete) => (
            <button
              key={interprete.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                select(interprete);
              }}
              className="w-full px-3 py-2.5 text-left transition-colors hover:bg-reca-50"
            >
              <p className="text-sm font-medium text-gray-800">
                {interprete.nombre}
              </p>
            </button>
          ))}

          {filtered.length === 0 ? (
            <div className="border-t border-gray-100 px-3 py-3 text-xs text-gray-500">
              {normalizedQuery.length > 0
                ? "No hay coincidencias en el catalogo. Puedes dejar el nombre escrito o crearlo ahora."
                : "El catalogo de interpretes no tiene registros todavia. Puedes escribir un nombre libre o crear el primero desde este panel."}
            </div>
          ) : null}

          {canCreate ? (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                void handleCreate();
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-sm font-semibold text-reca transition-colors hover:bg-reca-50"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreating
                ? "Guardando interprete..."
                : `Crear "${normalizedFreeText}"`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
