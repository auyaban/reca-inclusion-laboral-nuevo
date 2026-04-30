"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOdsStore } from "@/hooks/useOdsStore";
import { calculateService } from "@/lib/ods/serviceCalculation";

type TarifaItem = {
  codigo_servicio: string;
  referencia_servicio: string;
  descripcion_servicio: string;
  modalidad_servicio: string | null;
  valor_base: number;
};

export function Seccion3() {
  const seccion3 = useOdsStore((s) => s.seccion3);
  const setSeccion3 = useOdsStore((s) => s.setSeccion3);
  const profesionalSource = useOdsStore((s) => s.seccion1.profesionalSource);

  const [tarifas, setTarifas] = useState<TarifaItem[]>([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);
  const [showTarifasList, setShowTarifasList] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isInterpreter = profesionalSource === "interpretes";

  useEffect(() => {
    if (isInterpreter && !seccion3.servicio_interpretacion) {
      setSeccion3({ servicio_interpretacion: true });
    }
  }, [isInterpreter, seccion3.servicio_interpretacion, setSeccion3]);

  const doCalculation = useCallback(() => {
    if (!seccion3.valor_base || !seccion3.modalidad_servicio) return;

    // Skip calc cuando interpretación está activa pero aún no hay horas/minutos:
    // evita el error noisy "Debe ingresar horas o minutos..." en cada keystroke.
    // El cálculo correrá solo cuando el operador llene horas o minutos > 0.
    if (
      seccion3.servicio_interpretacion &&
      seccion3.horas_interprete === 0 &&
      seccion3.minutos_interprete === 0
    ) {
      setCalculationError(null);
      return;
    }

    setCalculationError(null);
    setCalculating(true);
    try {
      const result = calculateService({
        valor_base: seccion3.valor_base,
        servicio_interpretacion: seccion3.servicio_interpretacion,
        horas_interprete: seccion3.horas_interprete,
        minutos_interprete: seccion3.minutos_interprete,
        modalidad_servicio: seccion3.modalidad_servicio,
      });
      setSeccion3({
        valor_virtual: result.valor_virtual,
        valor_bogota: result.valor_bogota,
        valor_otro: result.valor_otro,
        todas_modalidades: result.todas_modalidades,
        valor_interprete: result.valor_interprete,
      });
    } catch (err) {
      // FP-2: capturar el error y mostrarlo al operador (antes era silencio)
      setCalculationError(err instanceof Error ? err.message : "Error al calcular");
    }
    setCalculating(false);
  }, [seccion3.valor_base, seccion3.servicio_interpretacion, seccion3.horas_interprete, seccion3.minutos_interprete, seccion3.modalidad_servicio, setSeccion3]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doCalculation(), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [doCalculation]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTarifasList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadTarifas = async () => {
    setLoadingTarifas(true);
    try {
      const params = new URLSearchParams();
      if (seccion3.codigo_servicio) params.set("codigo", seccion3.codigo_servicio);
      if (seccion3.fecha_servicio) params.set("fecha", seccion3.fecha_servicio);
      const res = await fetch(`/api/ods/tarifas?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTarifas(data.items ?? []);
      }
    } catch {
      // ignore
    }
    setLoadingTarifas(false);
  };

  const handleSelectTarifa = (tarifa: TarifaItem) => {
    setSeccion3({
      codigo_servicio: tarifa.codigo_servicio,
      referencia_servicio: tarifa.referencia_servicio,
      descripcion_servicio: tarifa.descripcion_servicio,
      modalidad_servicio: tarifa.modalidad_servicio ?? "",
      valor_base: tarifa.valor_base,
    });
    setShowTarifasList(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-testid="ods-seccion-3">
      <h2 className="mb-4 text-lg font-medium text-gray-900">Seccion 3 — Informacion del servicio</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha del servicio</label>
          <input
            type="date"
            value={seccion3.fecha_servicio}
            onChange={(e) => setSeccion3({ fecha_servicio: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div ref={containerRef} className="relative">
          <label className="block text-sm font-medium text-gray-700">Codigo de servicio</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={seccion3.codigo_servicio}
              onChange={(e) => setSeccion3({ codigo_servicio: e.target.value })}
              onBlur={loadTarifas}
              placeholder="Buscar codigo..."
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => { loadTarifas(); setShowTarifasList(!showTarifasList); }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              title="Lista de codigos"
            >
              ...
            </button>
          </div>
          {showTarifasList && tarifas.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {tarifas.map((t) => (
                <li
                  key={t.codigo_servicio}
                  onMouseDown={() => handleSelectTarifa(t)}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50"
                >
                  <span className="font-medium">{t.codigo_servicio}</span>
                  <span className="ml-2 text-gray-600">{t.referencia_servicio}</span>
                  {t.modalidad_servicio && (
                    <span className="ml-2 text-xs text-gray-400">({t.modalidad_servicio})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {loadingTarifas && <p className="mt-1 text-xs text-gray-500">Cargando tarifas...</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500">Referencia</label>
          <p className="mt-1 text-sm text-gray-900">{seccion3.referencia_servicio || "—"}</p>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-500">Descripcion</label>
          <p className="mt-1 text-sm text-gray-900">{seccion3.descripcion_servicio || "—"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Modalidad</label>
          <select
            value={seccion3.modalidad_servicio}
            onChange={(e) => setSeccion3({ modalidad_servicio: e.target.value })}
            disabled={seccion3.servicio_interpretacion}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              seccion3.servicio_interpretacion
                ? "bg-gray-50 border-gray-200"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          >
            <option value="">Seleccionar...</option>
            <option value="Virtual">Virtual</option>
            <option value="Bogotá">Bogotá</option>
            <option value="Fuera de Bogotá">Fuera de Bogotá</option>
            <option value="Todas">Todas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500">Valor base</label>
          <p className="mt-1 text-sm text-gray-900">
            {seccion3.valor_base > 0 ? `$${seccion3.valor_base.toLocaleString("es-CO")}` : "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="servicio_interpretacion"
            checked={seccion3.servicio_interpretacion}
            onChange={(e) => setSeccion3({ servicio_interpretacion: e.target.checked })}
            disabled={isInterpreter}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="servicio_interpretacion" className="text-sm font-medium text-gray-700">
            Servicio de interpretacion
          </label>
          {isInterpreter && (
            <span className="text-xs text-amber-600">(forzado por interprete)</span>
          )}
        </div>

        {seccion3.servicio_interpretacion && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Horas interprete</label>
              <input
                type="number"
                min="0"
                value={seccion3.horas_interprete}
                onChange={(e) => setSeccion3({ horas_interprete: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Minutos interprete</label>
              <input
                type="number"
                min="0"
                max="59"
                value={seccion3.minutos_interprete}
                onChange={(e) => setSeccion3({ minutos_interprete: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>

      {calculating && (
        <p className="mt-2 text-xs text-gray-500">Calculando...</p>
      )}
      {calculationError && (
        <p className="mt-2 text-xs text-red-600" data-testid="ods-seccion-3-calc-error">
          {calculationError}
        </p>
      )}
    </div>
  );
}
