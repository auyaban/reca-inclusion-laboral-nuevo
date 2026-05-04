"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOdsStore, type OdsPersonaRow } from "@/hooks/useOdsStore";
import { DISCAPACIDADES, GENEROS, TIPOS_CONTRATO } from "@/lib/ods/catalogs";
import { isCanonicalDiscapacidad, isCanonicalGenero } from "@/lib/ods/seccion4CatalogValidation";
import { isSeccion4RowEmpty } from "@/lib/ods/seccion4Staging";
import { usuarioNuevoSchema } from "@/lib/ods/schemas";

type UsuarioLookup = {
  cedula_usuario: string;
  nombre_usuario: string;
  discapacidad_usuario: string;
  genero_usuario: string;
} | null;

function emptyRow(): OdsPersonaRow {
  return {
    _id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cedula_usuario: "",
    nombre_usuario: "",
    discapacidad_usuario: "",
    genero_usuario: "",
    fecha_ingreso: "",
    tipo_contrato: "",
    cargo_servicio: "",
    usuario_reca_exists: null,
    usuario_reca_original: null,
  };
}

const CATALOG_WARNING = "Valor no canónico en usuarios_reca; corrige para continuar.";

export function Seccion4() {
  const rows = useOdsStore((s) => s.seccion4.rows);
  const setRows = useOdsStore((s) => s.setSeccion4Rows);
  const addUsuarioNuevo = useOdsStore((s) => s.addUsuarioNuevo);

  const [cedulaErrors, setCedulaErrors] = useState<Set<number>>(new Set());
  const [rowErrors, setRowErrors] = useState<Set<number>>(new Set());
  const [lookupResults, setLookupResults] = useState<Record<number, UsuarioLookup>>({});
  const [showCreateModal, setShowCreateModal] = useState<number | null>(null);
  const [createUsuarioErrors, setCreateUsuarioErrors] = useState<string[]>([]);
  const debounceRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const updateRow = useCallback((index: number, field: string, value: string) => {
    // Lee fresh state del store en lugar del closure de `rows` para evitar
    // que llamadas rapidas (varias por keystroke en distintos inputs)
    // sobrescriban edits con un snapshot stale.
    const currentRows = useOdsStore.getState().seccion4.rows;
    setRows(currentRows.map((row, i) => {
      if (i !== index) return row;
      return {
        ...row,
        [field]: value,
        usuario_reca_exists: field === "cedula_usuario" ? null : row.usuario_reca_exists,
        usuario_reca_original: field === "cedula_usuario" ? null : row.usuario_reca_original,
      };
    }));
  }, [setRows]);

  const addRow = useCallback(() => {
    const currentRows = useOdsStore.getState().seccion4.rows;
    setRows([...currentRows, emptyRow()]);
  }, [setRows]);

  const removeRow = useCallback((index: number) => {
    const currentRows = useOdsStore.getState().seccion4.rows;
    setRows(currentRows.filter((_, i) => i !== index));
    setRowErrors((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    setCedulaErrors((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, [setRows]);

  const lookupCedula = useCallback((index: number, cedula: string) => {
    const digits = cedula.replace(/\D/g, "");
    if (digits.length < 2) {
      setLookupResults((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    if (debounceRefs.current.has(index)) {
      clearTimeout(debounceRefs.current.get(index)!);
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ods/usuarios?cedula=${encodeURIComponent(digits)}`);
        if (res.ok) {
          const data = await res.json();
          const found = data.found ? data.item : null;
          setLookupResults((prev) => ({ ...prev, [index]: found }));
          // Auto-fill cuando hay coincidencia; antes solo se llenaba via onBlur.
          // Ya no requiere blur: si la cédula coincidió, llenamos los campos directos.
          const currentRows = useOdsStore.getState().seccion4.rows;
          setRows(
            currentRows.map((row, i) => {
              if (i !== index) return row;
              if (!found) return { ...row, usuario_reca_exists: false, usuario_reca_original: null };
              const discapacidadCanonica = isCanonicalDiscapacidad(found.discapacidad_usuario);
              const generoCanonico = isCanonicalGenero(found.genero_usuario);
              return {
                ...row,
                nombre_usuario: found.nombre_usuario || row.nombre_usuario,
                discapacidad_usuario: discapacidadCanonica ? found.discapacidad_usuario : "",
                genero_usuario: generoCanonico ? found.genero_usuario : "",
                usuario_reca_exists: true,
                usuario_reca_original: {
                  cedula_usuario: found.cedula_usuario,
                  discapacidad_usuario: found.discapacidad_usuario ?? null,
                  genero_usuario: found.genero_usuario ?? null,
                },
              };
            })
          );
        }
      } catch {
        // ignore
      }
    }, 300);
    debounceRefs.current.set(index, timer);
  }, [setRows]);

  useEffect(() => {
    return () => {
      debounceRefs.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    const cedulas = rows.map((r) => r.cedula_usuario.trim().replace(/\D/g, ""));
    const errors = new Set<number>();
    cedulas.forEach((ced, i) => {
      if (ced.length > 0 && cedulas.indexOf(ced) !== i) {
        errors.add(i);
      }
    });
    setCedulaErrors(errors);
  }, [rows]);

  const handleLookupResult = (index: number) => {
    const result = lookupResults[index];
    if (result) {
      updateRow(index, "nombre_usuario", result.nombre_usuario);
      updateRow(index, "discapacidad_usuario", isCanonicalDiscapacidad(result.discapacidad_usuario) ? result.discapacidad_usuario : "");
      updateRow(index, "genero_usuario", isCanonicalGenero(result.genero_usuario) ? result.genero_usuario : "");
    }
  };

  const handleCreateUsuario = (index: number) => {
    const row = rows[index];
    // FP-1: validar con Zod antes de agregar al staging
    const candidate = {
      cedula_usuario: row.cedula_usuario.trim().replace(/\D/g, ""),
      nombre_usuario: row.nombre_usuario.trim(),
      discapacidad_usuario: row.discapacidad_usuario,
      genero_usuario: row.genero_usuario,
      fecha_ingreso: row.fecha_ingreso || undefined,
      tipo_contrato: row.tipo_contrato || undefined,
      cargo_servicio: row.cargo_servicio || undefined,
    };
    const parsed = usuarioNuevoSchema.safeParse(candidate);
    if (!parsed.success) {
      setCreateUsuarioErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    setCreateUsuarioErrors([]);
    addUsuarioNuevo(parsed.data);
    setShowCreateModal(null);
  };

  const isRowValidForCreate = (row: typeof rows[number]): boolean => {
    return usuarioNuevoSchema.safeParse({
      cedula_usuario: row.cedula_usuario.trim().replace(/\D/g, ""),
      nombre_usuario: row.nombre_usuario.trim(),
      discapacidad_usuario: row.discapacidad_usuario,
      genero_usuario: row.genero_usuario,
      fecha_ingreso: row.fecha_ingreso || undefined,
      tipo_contrato: row.tipo_contrato || undefined,
      cargo_servicio: row.cargo_servicio || undefined,
    }).success;
  };

  const isRowEmpty = isSeccion4RowEmpty;

  const isRowValid = (row: typeof rows[number]) =>
    row.cedula_usuario.trim().length > 0 && row.nombre_usuario.trim().length > 0 && row.discapacidad_usuario && row.genero_usuario;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Seccion 4 — Oferentes</h2>
        <button
          type="button"
          onClick={addRow}
          className="rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
        >
          + Agregar fila
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-gray-500">Agrega al menos un oferente.</p>
      )}

      {rows.map((row, index) => {
        const hasCedulaError = cedulaErrors.has(index);
        const isEmpty = isRowEmpty(row);
        const isValid = isRowValid(row);
        const hasError = hasCedulaError || (!isEmpty && !isValid);
        const lookupResult = lookupResults[index];
        const originalDiscapacidad = row.usuario_reca_original?.discapacidad_usuario ?? null;
        const originalGenero = row.usuario_reca_original?.genero_usuario ?? null;
        const discapacidadFromDbIsCanonical = isCanonicalDiscapacidad(originalDiscapacidad);
        const generoFromDbIsCanonical = isCanonicalGenero(originalGenero);
        const discapacidadNeedsCorrection = Boolean(lookupResult) && !discapacidadFromDbIsCanonical;
        const generoNeedsCorrection = Boolean(lookupResult) && !generoFromDbIsCanonical;

        // Key estable: usa _id local si existe, sino fallback a index. Evita
        // re-mount completo de filas sobrevivientes al borrar/reordenar.
        const stableKey = row._id ?? `row-${index}`;
        return (
          <div
            key={stableKey}
            className={`mb-4 rounded-md border p-3 ${hasError ? "border-red-200 bg-red-50" : "border-gray-200"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Fila {index + 1}</span>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Eliminar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">Cedula *</label>
                <input
                  type="text"
                  value={row.cedula_usuario}
                  onChange={(e) => {
                    updateRow(index, "cedula_usuario", e.target.value);
                    lookupCedula(index, e.target.value);
                  }}
                  onBlur={() => handleLookupResult(index)}
                  className={`mt-1 block w-full rounded-md border px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                    hasCedulaError ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-reca focus:ring-reca/30"
                  }`}
                  placeholder="Solo digitos"
                />
                {hasCedulaError && (
                  <p className="mt-1 text-xs text-red-600">Cedula duplicada en esta seccion.</p>
                )}
                {lookupResult && (
                  <p className="mt-1 text-xs text-green-600">Usuario encontrado: {lookupResult.nombre_usuario}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500">Nombre *</label>
                <input
                  type="text"
                  value={row.nombre_usuario}
                  onChange={(e) => updateRow(index, "nombre_usuario", e.target.value)}
                  readOnly={!!lookupResult}
                  className={`mt-1 block w-full rounded-md border px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                    lookupResult ? "bg-gray-50 border-gray-200" : "border-gray-300 focus:border-reca focus:ring-reca/30"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500">Discapacidad *</label>
                <select
                  value={row.discapacidad_usuario}
                  onChange={(e) => updateRow(index, "discapacidad_usuario", e.target.value)}
                  disabled={Boolean(lookupResult) && discapacidadFromDbIsCanonical}
                  title={discapacidadNeedsCorrection ? CATALOG_WARNING : ""}
                  className={`mt-1 block w-full rounded-md border px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                    discapacidadNeedsCorrection
                      ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500/30"
                      : lookupResult
                        ? "bg-gray-50 border-gray-200"
                        : "border-gray-300 focus:border-reca focus:ring-reca/30"
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  {DISCAPACIDADES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {discapacidadNeedsCorrection && (
                  <p className="mt-1 text-xs text-amber-700">{CATALOG_WARNING}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500">Genero *</label>
                <select
                  value={row.genero_usuario}
                  onChange={(e) => updateRow(index, "genero_usuario", e.target.value)}
                  disabled={Boolean(lookupResult) && generoFromDbIsCanonical}
                  title={generoNeedsCorrection ? CATALOG_WARNING : ""}
                  className={`mt-1 block w-full rounded-md border px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                    generoNeedsCorrection
                      ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500/30"
                      : lookupResult
                        ? "bg-gray-50 border-gray-200"
                        : "border-gray-300 focus:border-reca focus:ring-reca/30"
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  {GENEROS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {generoNeedsCorrection && (
                  <p className="mt-1 text-xs text-amber-700">{CATALOG_WARNING}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500">Fecha ingreso</label>
                <input
                  type="date"
                  value={row.fecha_ingreso}
                  onChange={(e) => updateRow(index, "fecha_ingreso", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-reca focus:outline-none focus:ring-1 focus:ring-reca/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500">Tipo contrato</label>
                <select
                  value={row.tipo_contrato}
                  onChange={(e) => updateRow(index, "tipo_contrato", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-reca focus:outline-none focus:ring-1 focus:ring-reca/30"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_CONTRATO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500">Cargo</label>
                <input
                  type="text"
                  value={row.cargo_servicio}
                  onChange={(e) => updateRow(index, "cargo_servicio", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-reca focus:outline-none focus:ring-1 focus:ring-reca/30"
                />
              </div>
            </div>

            {!isEmpty && !isValid && !hasCedulaError && (
              <p className="mt-2 text-xs text-yellow-700">Completa los campos obligatorios (*).</p>
            )}

            {!isEmpty && !lookupResult && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(index)}
                  disabled={!isRowValidForCreate(row)}
                  className="text-xs text-reca hover:text-reca-dark disabled:text-gray-400 disabled:cursor-not-allowed"
                  title={!isRowValidForCreate(row) ? "Completa los campos obligatorios para crear usuario" : ""}
                >
                  Crear Usuario en staging
                </button>
              </div>
            )}
          </div>
        );
      })}

      {showCreateModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Crear Usuario en Staging</h3>
            {createUsuarioErrors.length > 0 && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2">
                <ul className="text-xs text-red-700">
                  {createUsuarioErrors.map((e, i) => <li key={i}>- {e}</li>)}
                </ul>
              </div>
            )}
            <p className="mb-4 text-sm text-gray-600">
              El usuario se guardara en staging y se insertara en la BD al confirmar la ODS.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowCreateModal(null); setCreateUsuarioErrors([]); }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleCreateUsuario(showCreateModal)}
                className="rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
