"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOdsStore } from "@/hooks/useOdsStore";
import { normalizeOdsModalidadServicio } from "@/lib/ods/modalidadServicio";
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
        const items: TarifaItem[] = data.items ?? [];
        setTarifas(items);
        // Auto-fill cuando el código escrito coincide exactamente con una tarifa.
        // Si hay 1 sola tarifa devuelta (el endpoint filtra por `codigo_servicio.eq`),
        // la rellenamos sin que el operador tenga que abrir la lista.
        const typed = (seccion3.codigo_servicio || "").trim();
        const exact = items.find((t) => t.codigo_servicio === typed);
        if (exact) {
          setSeccion3({
            codigo_servicio: exact.codigo_servicio,
            referencia_servicio: exact.referencia_servicio,
            descripcion_servicio: exact.descripcion_servicio,
            modalidad_servicio: normalizeOdsModalidadServicio(exact.modalidad_servicio),
            valor_base: exact.valor_base,
          });
          setShowTarifasList(false);
        } else if (items.length === 1 && typed.length > 0) {
          // El endpoint hace .eq por código exacto, así que un solo resultado
          // significa coincidencia perfecta incluso si el usuario escribió ceros iniciales.
          const only = items[0];
          setSeccion3({
            codigo_servicio: only.codigo_servicio,
            referencia_servicio: only.referencia_servicio,
            descripcion_servicio: only.descripcion_servicio,
            modalidad_servicio: normalizeOdsModalidadServicio(only.modalidad_servicio),
            valor_base: only.valor_base,
          });
          setShowTarifasList(false);
        }
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
      modalidad_servicio: normalizeOdsModalidadServicio(tarifa.modalidad_servicio),
      valor_base: tarifa.valor_base,
    });
    setShowTarifasList(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm" data-testid="ods-seccion-3">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Sección 3 — Información del servicio</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="ods-fecha-servicio">Fecha del servicio</Label>
          <Input
            id="ods-fecha-servicio"
            type="date"
            value={seccion3.fecha_servicio}
            onChange={(e) => setSeccion3({ fecha_servicio: e.target.value })}
          />
        </div>

        <div ref={containerRef} className="relative space-y-1.5">
          <Label htmlFor="ods-codigo-servicio">Código de servicio</Label>
          <div className="flex gap-2">
            <Input
              id="ods-codigo-servicio"
              type="text"
              value={seccion3.codigo_servicio}
              onChange={(e) => setSeccion3({ codigo_servicio: e.target.value })}
              onBlur={loadTarifas}
              placeholder="Buscar código..."
            />
            <button
              type="button"
              onClick={() => { loadTarifas(); setShowTarifasList(!showTarifasList); }}
              className="rounded-lg border border-gray-300 px-3 text-sm hover:bg-gray-50"
              title="Lista de códigos"
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
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-reca-light"
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

        <div className="space-y-1.5">
          <Label className="text-gray-500">Referencia</Label>
          <p className="text-sm text-gray-900">{seccion3.referencia_servicio || "—"}</p>
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label className="text-gray-500">Descripcion</Label>
          <p className="text-sm text-gray-900">{seccion3.descripcion_servicio || "—"}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ods-modalidad">Modalidad</Label>
          <select
            id="ods-modalidad"
            value={seccion3.modalidad_servicio}
            onChange={(e) => setSeccion3({ modalidad_servicio: e.target.value })}
            disabled={seccion3.servicio_interpretacion}
            className={`block w-full rounded-lg border bg-transparent px-2.5 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              seccion3.servicio_interpretacion
                ? "bg-input/50 border-input cursor-not-allowed opacity-60"
                : "border-input focus-visible:border-ring"
            }`}
          >
            <option value="">Seleccionar...</option>
            <option value="Virtual">Virtual</option>
            <option value="Bogotá">Bogotá</option>
            <option value="Fuera de Bogotá">Fuera de Bogotá</option>
            <option value="Todas las modalidades">Todas las modalidades</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-500">Valor base</Label>
          <p className="text-sm text-gray-900">
            {seccion3.valor_base > 0 ? `$${seccion3.valor_base.toLocaleString("es-CO")}` : "—"}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id="servicio_interpretacion"
            checked={seccion3.servicio_interpretacion}
            onCheckedChange={(checked) =>
              setSeccion3({ servicio_interpretacion: checked === true })
            }
            disabled={isInterpreter}
          />
          <Label htmlFor="servicio_interpretacion">Servicio de interpretacion</Label>
          {isInterpreter && (
            <span className="text-xs text-amber-600">(forzado por interprete)</span>
          )}
        </div>

        {seccion3.servicio_interpretacion && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="ods-horas-interprete">Horas interprete</Label>
              <Input
                id="ods-horas-interprete"
                type="number"
                min="0"
                value={seccion3.horas_interprete}
                onChange={(e) => setSeccion3({ horas_interprete: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ods-minutos-interprete">Minutos interprete</Label>
              <Input
                id="ods-minutos-interprete"
                type="number"
                min="0"
                max="59"
                value={seccion3.minutos_interprete}
                onChange={(e) => setSeccion3({ minutos_interprete: parseInt(e.target.value) || 0 })}
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
