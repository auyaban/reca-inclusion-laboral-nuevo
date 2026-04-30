"use client";

import { useEffect, useRef, useState } from "react";
import { useOdsStore } from "@/hooks/useOdsStore";

type EmpresaItem = {
  nit_empresa: string;
  nombre_empresa: string;
  caja_compensacion: string | null;
  asesor_empresa: string | null;
  sede_empresa: string | null;
};

export function Seccion2() {
  const seccion2 = useOdsStore((s) => s.seccion2);
  const setSeccion2 = useOdsStore((s) => s.setSeccion2);

  const [nitQuery, setNitQuery] = useState("");
  const [nombreQuery, setNombreQuery] = useState("");
  const [catalogo, setCatalogo] = useState<EmpresaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchMode, setSearchMode] = useState<"nit" | "nombre">("nit");
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

  const doSearch = (q: string, mode: "nit" | "nombre") => {
    if (q.trim().length < 2) {
      setCatalogo([]);
      setShowDropdown(false);
      return;
    }

    // Si el query coincide con la empresa ya seleccionada, no volver a
    // buscar (el value cambió porque el operador eligió del dropdown).
    if (
      (mode === "nit" && q.trim() === seccion2.nit_empresa && seccion2.nit_empresa.length > 0) ||
      (mode === "nombre" && q.trim() === seccion2.nombre_empresa && seccion2.nombre_empresa.length > 0)
    ) {
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const param = mode === "nit" ? "nit" : "nombre";
        const res = await fetch(`/api/ods/empresas?${param}=${encodeURIComponent(q.trim())}`);
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
  };

  useEffect(() => {
    if (searchMode === "nit") {
      doSearch(nitQuery, "nit");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nitQuery, searchMode, seccion2.nit_empresa]);

  useEffect(() => {
    if (searchMode === "nombre") {
      doSearch(nombreQuery, "nombre");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombreQuery, searchMode, seccion2.nombre_empresa]);

  const handleSelect = (item: EmpresaItem) => {
    setSeccion2({
      nit_empresa: item.nit_empresa,
      nombre_empresa: item.nombre_empresa,
      caja_compensacion: item.caja_compensacion ?? "",
      asesor_empresa: item.asesor_empresa ?? "",
      sede_empresa: item.sede_empresa ?? "",
    });
    setNitQuery(item.nit_empresa);
    setNombreQuery(item.nombre_empresa);
    setShowDropdown(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-testid="ods-seccion-2">
      <h2 className="mb-4 text-lg font-medium text-gray-900">Seccion 2 — Informacion de la empresa</h2>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setSearchMode("nit")}
          className={`rounded-md px-3 py-1 text-sm ${
            searchMode === "nit"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Buscar por NIT
        </button>
        <button
          type="button"
          onClick={() => setSearchMode("nombre")}
          className={`rounded-md px-3 py-1 text-sm ${
            searchMode === "nombre"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Buscar por nombre
        </button>
      </div>

      <div ref={containerRef} className="relative">
        {searchMode === "nit" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">NIT</label>
            <input
              type="text"
              value={nitQuery || seccion2.nit_empresa}
              onChange={(e) => {
                setNitQuery(e.target.value);
                if (e.target.value !== seccion2.nit_empresa) {
                  setSeccion2({ nit_empresa: "", nombre_empresa: "", caja_compensacion: "", asesor_empresa: "", sede_empresa: "" });
                }
              }}
              onFocus={() => { if (catalogo.length > 0) setShowDropdown(true); }}
              placeholder="Ingrese el NIT de la empresa..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de la empresa</label>
            <input
              type="text"
              value={nombreQuery || seccion2.nombre_empresa}
              onChange={(e) => {
                setNombreQuery(e.target.value);
                if (e.target.value !== seccion2.nombre_empresa) {
                  setSeccion2({ nit_empresa: "", nombre_empresa: "", caja_compensacion: "", asesor_empresa: "", sede_empresa: "" });
                }
              }}
              onFocus={() => { if (catalogo.length > 0) setShowDropdown(true); }}
              placeholder="Ingrese el nombre de la empresa..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {loading && <p className="mt-1 text-xs text-gray-500">Buscando...</p>}

        {showDropdown && catalogo.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {catalogo.map((item) => (
              <li
                key={item.nit_empresa}
                onMouseDown={() => handleSelect(item)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50"
              >
                <span className="font-medium">{item.nombre_empresa}</span>
                <span className="ml-2 text-xs text-gray-500">NIT: {item.nit_empresa}</span>
              </li>
            ))}
          </ul>
        )}

        {showDropdown && catalogo.length === 0 && (searchMode === "nit" ? nitQuery : nombreQuery).trim().length >= 2 && !loading && (
          <p className="mt-1 text-xs text-gray-500">Sin resultados. La empresa debe existir en la base de datos.</p>
        )}
      </div>

      {seccion2.nombre_empresa && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-500">Caja de compensacion</label>
            <p className="mt-1 text-sm text-gray-900">{seccion2.caja_compensacion || "—"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Asesor</label>
            <p className="mt-1 text-sm text-gray-900">{seccion2.asesor_empresa || "—"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Sede</label>
            <p className="mt-1 text-sm text-gray-900">{seccion2.sede_empresa || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
