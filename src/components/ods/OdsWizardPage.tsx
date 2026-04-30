"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOdsStore } from "@/hooks/useOdsStore";
import { aggregateSeccion4 } from "@/lib/ods/aggregateSeccion4";
import { Seccion1 } from "@/components/ods/sections/Seccion1";
import { Seccion2 } from "@/components/ods/sections/Seccion2";
import { Seccion3 } from "@/components/ods/sections/Seccion3";
import { Seccion4 } from "@/components/ods/sections/Seccion4";
import { Seccion5 } from "@/components/ods/sections/Seccion5";
import { SummaryCard } from "@/components/ods/SummaryCard";
import { ImportActaModal } from "@/components/ods/ImportActaModal";
import { ImportPreviewDialog } from "@/components/ods/ImportPreviewDialog";
import type { PipelineResult } from "@/lib/ods/import/pipeline";
import { DISCAPACIDADES, GENEROS } from "@/lib/ods/catalogs";
import { calculateService } from "@/lib/ods/serviceCalculation";
import type { UsuarioNuevo } from "@/lib/ods/schemas";
import { formatPayloadError, type FriendlyError } from "@/lib/ods/formatPayloadError";

// Snapshot de los campos del store que el resumen consume. Usado por el
// subscribe selectivo en OdsWizardPage para evitar disparar computeResumen
// cuando cambian campos no relacionados (ej. Seccion 4 oferentes).
function pickResumenInputs(s: ReturnType<typeof useOdsStore.getState>) {
  return {
    valor_base: s.seccion3.valor_base,
    modalidad: s.seccion3.modalidad_servicio,
    interp: s.seccion3.servicio_interpretacion,
    horas: s.seccion3.horas_interprete,
    minutos: s.seccion3.minutos_interprete,
    fecha: s.seccion3.fecha_servicio,
    codigo: s.seccion3.codigo_servicio,
    profesional: s.seccion1.nombre_profesional,
    empresa: s.seccion2.nombre_empresa,
  };
}

// PD-3: mapear modalidad interna (sin tildes) a forma canonica del schema (con tildes)
function mapModalidadToCanonical(internal: string): string {
  const text = (internal || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (text.includes("virtual")) return "Virtual";
  if (text.includes("bogota") && !text.includes("fuera")) return "Bogotá";
  if (text.includes("fuera") || text.includes("otro")) return "Fuera de Bogotá";
  if (text.includes("todas")) return "Todas las modalidades";
  return internal;
}

export default function OdsWizardPage() {
  // PERF-1: selectores especificos en lugar de const store = useOdsStore()
  const computeResumen = useOdsStore((s) => s.computeResumen);
  const reset = useOdsStore((s) => s.reset);
  const setSeccion1 = useOdsStore((s) => s.setSeccion1);
  const setSeccion2 = useOdsStore((s) => s.setSeccion2);
  const setSeccion3 = useOdsStore((s) => s.setSeccion3);
  const setSeccion4Rows = useOdsStore((s) => s.setSeccion4Rows);
  const setSeccion5 = useOdsStore((s) => s.setSeccion5);
  const setUsuariosNuevos = useOdsStore((s) => s.setUsuariosNuevos);
  const seccion1OrdenClausulada = useOdsStore((s) => s.seccion1.orden_clausulada);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<FriendlyError | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewResult, setPreviewResult] = useState<PipelineResult | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const startedAtRef = useRef<string>(new Date().toISOString());
  // BS-3: idempotencia client+DB. session_id se genera al montar y se resetea tras submit exitoso.
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const handlePreview = useCallback((result: PipelineResult) => {
    setPreviewResult(result);
    setShowImportModal(false);
    setShowPreviewDialog(true);
  }, []);

  const handleApply = useCallback(() => {
    if (!previewResult) return;
    const { analysis, companyMatch, participants, suggestions } = previewResult;
    const localWarnings: string[] = [];

    if (companyMatch) {
      setSeccion2({
        nit_empresa: companyMatch.nit_empresa,
        nombre_empresa: companyMatch.nombre_empresa,
        caja_compensacion: companyMatch.caja_compensacion || "",
        asesor_empresa: companyMatch.asesor_empresa || "",
        sede_empresa: companyMatch.sede_empresa || "",
      });
    }

    // Comentarios sugeridos del rules engine (regla A: cargo+vacantes,
    // regla B: numero de seguimiento, regla C: patrón LSC).
    // Solo pre-llenamos si el operador no escribió ya algo.
    if (suggestions.length > 0) {
      const sug = suggestions[0];
      const patch: { observaciones?: string; seguimiento_servicio?: string } = {};
      if (sug.observaciones) patch.observaciones = sug.observaciones;
      if (sug.seguimiento_servicio) patch.seguimiento_servicio = sug.seguimiento_servicio;
      if (Object.keys(patch).length > 0) setSeccion5(patch);
    }

    // PD-3: invocar calculateService con la modalidad real de la sugerencia
    if (suggestions.length > 0 && suggestions[0].codigo_servicio) {
      const s = suggestions[0];
      const modalidadCanonica = mapModalidadToCanonical(s.modalidad_servicio || "");
      const valorBase = s.valor_base || 0;
      let calc;
      try {
        calc = calculateService({
          valor_base: valorBase,
          servicio_interpretacion: false,
          horas_interprete: 0,
          minutos_interprete: 0,
          modalidad_servicio: modalidadCanonica,
        });
      } catch {
        calc = {
          valor_virtual: 0,
          valor_bogota: 0,
          valor_otro: 0,
          todas_modalidades: 0,
          valor_interprete: 0,
          valor_total: 0,
          horas_decimales: 0,
        };
      }
      setSeccion3({
        codigo_servicio: s.codigo_servicio || "",
        referencia_servicio: s.referencia_servicio || "",
        descripcion_servicio: s.descripcion_servicio || "",
        modalidad_servicio: modalidadCanonica,
        valor_base: valorBase,
        valor_virtual: calc.valor_virtual,
        valor_bogota: calc.valor_bogota,
        valor_otro: calc.valor_otro,
        todas_modalidades: calc.todas_modalidades,
        horas_interprete: 0,
        valor_interprete: 0,
        servicio_interpretacion: false,
      });
    }

    if (analysis.nombre_profesional) {
      setSeccion1({
        orden_clausulada: seccion1OrdenClausulada,
        nombre_profesional: String(analysis.nombre_profesional),
      });
    }

    if (analysis.fecha_servicio) {
      setSeccion3({
        fecha_servicio: String(analysis.fecha_servicio),
      });
    }

    // PD-2: no fallback silencioso, dejar vacio + warnings.
    const nuevos = participants
      .filter((p) => !p.exists)
      .map((p) => {
        const discCanonica = (DISCAPACIDADES as readonly string[]).includes(p.discapacidad_usuario);
        const genCanonico = (GENEROS as readonly string[]).includes(p.genero_usuario);
        if (!discCanonica && p.discapacidad_usuario) {
          localWarnings.push(`Discapacidad no canonica para ${p.cedula_usuario}: "${p.discapacidad_usuario}". Selecciona una valida en Seccion 4.`);
        }
        if (!genCanonico && p.genero_usuario) {
          localWarnings.push(`Genero no canonico para ${p.cedula_usuario}: "${p.genero_usuario}". Selecciona uno valido en Seccion 4.`);
        }
        return {
          cedula_usuario: p.cedula_usuario,
          nombre_usuario: p.nombre_usuario,
          discapacidad_usuario: (discCanonica ? p.discapacidad_usuario : "") as UsuarioNuevo["discapacidad_usuario"],
          genero_usuario: (genCanonico ? p.genero_usuario : "") as UsuarioNuevo["genero_usuario"],
        };
      });

    if (nuevos.length > 0) {
      setUsuariosNuevos(nuevos);
    }

    // Llenar Sección 4 con TODOS los participantes detectados (existan o no).
    // Para los que existen en BD, los campos canónicos los completa el lookup
    // de Sección 4 al renderizar; igual los pre-llenamos con lo que vino del
    // acta para que el operador vea las filas inmediatamente.
    if (participants.length > 0) {
      const seccion4Rows = participants.map((p) => {
        const discCanonica = (DISCAPACIDADES as readonly string[]).includes(p.discapacidad_usuario);
        const genCanonico = (GENEROS as readonly string[]).includes(p.genero_usuario);
        return {
          // _id local para `key` estable en React (evita re-mount al borrar filas).
          _id: typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          cedula_usuario: p.cedula_usuario || "",
          nombre_usuario: p.nombre_usuario || "",
          discapacidad_usuario: discCanonica ? p.discapacidad_usuario : "",
          genero_usuario: genCanonico ? p.genero_usuario : "",
          fecha_ingreso: "",
          tipo_contrato: "",
          cargo_servicio: "",
        };
      });
      setSeccion4Rows(seccion4Rows);
    }

    setImportWarnings(localWarnings);
    setShowPreviewDialog(false);
    setPreviewResult(null);
  }, [previewResult, setSeccion1, setSeccion2, setSeccion3, setSeccion4Rows, setSeccion5, setUsuariosNuevos, seccion1OrdenClausulada]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Solo recomputamos resumen cuando cambia uno de los campos que el resumen
    // efectivamente usa (Seccion 3 calculo + identificadores). Antes el
    // subscribe global disparaba en cada keystroke de Seccion 4 (oferentes).
    let prev = pickResumenInputs(useOdsStore.getState());
    const unsubscribe = useOdsStore.subscribe((state) => {
      const next = pickResumenInputs(state);
      if (
        next.valor_base === prev.valor_base &&
        next.modalidad === prev.modalidad &&
        next.interp === prev.interp &&
        next.horas === prev.horas &&
        next.minutos === prev.minutos &&
        next.fecha === prev.fecha &&
        next.codigo === prev.codigo &&
        next.profesional === prev.profesional &&
        next.empresa === prev.empresa
      ) {
        return; // ningún cambio relevante para el resumen
      }
      prev = next;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => computeResumen(), 300);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [computeResumen]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setServerError(null);

    try {
      // PERF-1: leer state via getState() para evitar re-render del padre por dependencia de store
      const state = useOdsStore.getState();
      const aggregated = aggregateSeccion4(state.seccion4.rows);
      const fechaServicio = state.seccion3.fecha_servicio;
      const fechaDate = fechaServicio ? new Date(fechaServicio) : null;

      const payload = {
        ods: {
          orden_clausulada: state.seccion1.orden_clausulada,
          nombre_profesional: state.seccion1.nombre_profesional,
          nit_empresa: state.seccion2.nit_empresa,
          nombre_empresa: state.seccion2.nombre_empresa,
          caja_compensacion: state.seccion2.caja_compensacion || undefined,
          asesor_empresa: state.seccion2.asesor_empresa || undefined,
          sede_empresa: state.seccion2.sede_empresa || undefined,
          fecha_servicio: fechaServicio,
          codigo_servicio: state.seccion3.codigo_servicio,
          referencia_servicio: state.seccion3.referencia_servicio,
          descripcion_servicio: state.seccion3.descripcion_servicio,
          modalidad_servicio: state.seccion3.modalidad_servicio,
          valor_virtual: state.seccion3.valor_virtual,
          valor_bogota: state.seccion3.valor_bogota,
          valor_otro: state.seccion3.valor_otro,
          todas_modalidades: state.seccion3.todas_modalidades,
          // BD ods.horas_interprete es numeric: enviamos el decimal completo
          // (horas + minutos/60), no el entero del input. Así 2h 30m → 2.5,
          // alineado con el cálculo del valor_interprete.
          horas_interprete: (() => {
            const h = state.seccion3.horas_interprete || 0;
            const m = state.seccion3.minutos_interprete || 0;
            const dec = Math.round((h + m / 60) * 100) / 100;
            return dec > 0 ? dec : undefined;
          })(),
          valor_interprete: state.seccion3.valor_interprete,
          valor_total: state.resumen.valor_total,
          nombre_usuario: aggregated.nombre_usuario || undefined,
          cedula_usuario: aggregated.cedula_usuario || undefined,
          discapacidad_usuario: aggregated.discapacidad_usuario || undefined,
          genero_usuario: aggregated.genero_usuario || undefined,
          fecha_ingreso: aggregated.fecha_ingreso || undefined,
          tipo_contrato: aggregated.tipo_contrato || undefined,
          cargo_servicio: aggregated.cargo_servicio || undefined,
          total_personas: aggregated.total_personas,
          observaciones: state.seccion5.observaciones || undefined,
          observacion_agencia: state.seccion5.observacion_agencia || undefined,
          seguimiento_servicio: state.seccion5.seguimiento_servicio || undefined,
          mes_servicio: fechaDate ? fechaDate.getMonth() + 1 : 0,
          ano_servicio: fechaDate ? fechaDate.getFullYear() : 0,
          formato_finalizado_id: undefined,
          session_id: sessionIdRef.current,
          started_at: startedAtRef.current,
          submitted_at: new Date().toISOString(),
        },
        usuarios_nuevos: state.usuarios_nuevos,
        startedAt: startedAtRef.current,
      };

      const res = await fetch("/api/ods/terminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(formatPayloadError(data));
        return;
      }

      setSuccess(true);
      reset();
      startedAtRef.current = new Date().toISOString();
      // BS-3: nuevo session_id para la siguiente ODS
      sessionIdRef.current = crypto.randomUUID();
    } catch {
      setServerError(formatPayloadError({ error: "Error de conexión. Intenta de nuevo." }));
    } finally {
      setSubmitting(false);
      setShowConfirmDialog(false);
    }
  }, [reset]);

  if (success) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-green-800">ODS creada exitosamente</h2>
          <p className="mt-2 text-sm text-green-700">La entrada ha sido guardada correctamente.</p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Crear otra ODS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Crear nueva entrada ODS</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            data-testid="ods-import-acta-button"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Importar acta
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmDialog(true)}
            data-testid="ods-confirm-terminar-button"
            disabled={submitting}
            className="rounded-xl bg-reca px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark disabled:opacity-50"
          >
            {submitting ? "Guardando..." : "Confirmar y terminar"}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">{serverError.title}</p>
          {serverError.bullets.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {serverError.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          {serverError.technical && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-red-600">
                Ver detalle técnico
              </summary>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px]">
                {serverError.technical}
              </pre>
            </details>
          )}
        </div>
      )}

      {importWarnings.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" data-testid="ods-import-warnings">
          <p className="font-medium">Atencion: campos no canonicos detectados en la importacion</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <button type="button" onClick={() => setImportWarnings([])} className="mt-2 text-xs underline">Cerrar</button>
        </div>
      )}

      <Seccion1 />
      <Seccion2 />
      <Seccion3 />
      <Seccion4 />
      <Seccion5 />
      <SummaryCard />

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-medium text-gray-900">Confirmar y terminar</h3>
            <p className="mb-4 text-sm text-gray-600">
              Esta accion guardara la ODS y los usuarios nuevos en la base de datos. No se podra editar despues.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark disabled:opacity-50"
              >
                {submitting ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportActaModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onPreview={handlePreview}
      />

      <ImportPreviewDialog
        open={showPreviewDialog}
        result={previewResult}
        onClose={() => {
          setShowPreviewDialog(false);
          setPreviewResult(null);
        }}
        onApply={handleApply}
      />
    </div>
  );
}
