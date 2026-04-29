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

export default function OdsWizardPage() {
  const computeResumen = useOdsStore((s) => s.computeResumen);
  const reset = useOdsStore((s) => s.reset);
  const setSeccion1 = useOdsStore((s) => s.setSeccion1);
  const setSeccion2 = useOdsStore((s) => s.setSeccion2);
  const setSeccion3 = useOdsStore((s) => s.setSeccion3);
  const setUsuariosNuevos = useOdsStore((s) => s.setUsuariosNuevos);
  const store = useOdsStore();

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewResult, setPreviewResult] = useState<PipelineResult | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const handlePreview = useCallback((result: PipelineResult) => {
    setPreviewResult(result);
    setShowImportModal(false);
    setShowPreviewDialog(true);
  }, []);

  const handleApply = useCallback(() => {
    if (!previewResult) return;

    const { analysis, companyMatch, participants, suggestions } = previewResult;

    if (companyMatch) {
      setSeccion2({
        nit_empresa: companyMatch.nit_empresa,
        nombre_empresa: companyMatch.nombre_empresa,
        caja_compensacion: companyMatch.caja_compensacion || "",
        asesor_empresa: companyMatch.asesor_empresa || "",
        sede_empresa: companyMatch.sede_empresa || "",
      });
    }

    if (suggestions.length > 0 && suggestions[0].codigo_servicio) {
      const s = suggestions[0];
      setSeccion3({
        codigo_servicio: s.codigo_servicio || "",
        referencia_servicio: s.referencia_servicio || "",
        descripcion_servicio: s.descripcion_servicio || "",
        modalidad_servicio: s.modalidad_servicio || "",
        valor_virtual: 0,
        valor_bogota: 0,
        valor_otro: 0,
        todas_modalidades: s.valor_base || 0,
        horas_interprete: undefined,
        valor_interprete: 0,
        servicio_interpretacion: false,
      });
    }

    if (analysis.nombre_profesional) {
      setSeccion1({
        orden_clausulada: store.seccion1.orden_clausulada,
        nombre_profesional: String(analysis.nombre_profesional),
      });
    }

    if (analysis.fecha_servicio) {
      setSeccion3({
        ...store.seccion3,
        fecha_servicio: String(analysis.fecha_servicio),
      });
    }

    const nuevos = participants
      .filter((p) => !p.exists)
      .map((p) => ({
        cedula_usuario: p.cedula_usuario,
        nombre_usuario: p.nombre_usuario,
        discapacidad_usuario: (DISCAPACIDADES as readonly string[]).includes(p.discapacidad_usuario)
          ? (p.discapacidad_usuario as typeof DISCAPACIDADES[number])
          : "Visual",
        genero_usuario: (GENEROS as readonly string[]).includes(p.genero_usuario)
          ? (p.genero_usuario as typeof GENEROS[number])
          : "Hombre",
      }));

    if (nuevos.length > 0) {
      setUsuariosNuevos(nuevos);
    }

    setShowPreviewDialog(false);
    setPreviewResult(null);
  }, [previewResult, setSeccion1, setSeccion2, setSeccion3, setUsuariosNuevos, store.seccion1, store.seccion3]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useOdsStore.subscribe(() => {
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
      const aggregated = aggregateSeccion4(store.seccion4.rows);
      const fechaServicio = store.seccion3.fecha_servicio;
      const fechaDate = fechaServicio ? new Date(fechaServicio) : null;

      const payload = {
        ods: {
          orden_clausulada: store.seccion1.orden_clausulada,
          nombre_profesional: store.seccion1.nombre_profesional,
          nit_empresa: store.seccion2.nit_empresa,
          nombre_empresa: store.seccion2.nombre_empresa,
          caja_compensacion: store.seccion2.caja_compensacion || undefined,
          asesor_empresa: store.seccion2.asesor_empresa || undefined,
          sede_empresa: store.seccion2.sede_empresa || undefined,
          fecha_servicio: fechaServicio,
          codigo_servicio: store.seccion3.codigo_servicio,
          referencia_servicio: store.seccion3.referencia_servicio,
          descripcion_servicio: store.seccion3.descripcion_servicio,
          modalidad_servicio: store.seccion3.modalidad_servicio,
          valor_virtual: store.seccion3.valor_virtual,
          valor_bogota: store.seccion3.valor_bogota,
          valor_otro: store.seccion3.valor_otro,
          todas_modalidades: store.seccion3.todas_modalidades,
          horas_interprete: store.seccion3.horas_interprete || undefined,
          valor_interprete: store.seccion3.valor_interprete,
          valor_total: store.resumen.valor_total,
          nombre_usuario: aggregated.nombre_usuario || undefined,
          cedula_usuario: aggregated.cedula_usuario || undefined,
          discapacidad_usuario: aggregated.discapacidad_usuario || undefined,
          genero_usuario: aggregated.genero_usuario || undefined,
          fecha_ingreso: aggregated.fecha_ingreso || undefined,
          tipo_contrato: aggregated.tipo_contrato || undefined,
          cargo_servicio: aggregated.cargo_servicio || undefined,
          total_personas: aggregated.total_personas,
          observaciones: store.seccion5.observaciones || undefined,
          observacion_agencia: store.seccion5.observacion_agencia || undefined,
          seguimiento_servicio: store.seccion5.seguimiento_servicio || undefined,
          mes_servicio: fechaDate ? fechaDate.getMonth() + 1 : 0,
          ano_servicio: fechaDate ? fechaDate.getFullYear() : 0,
          formato_finalizado_id: undefined,
          session_id: undefined,
          started_at: startedAtRef.current,
          submitted_at: new Date().toISOString(),
        },
        usuarios_nuevos: store.usuarios_nuevos,
        startedAt: startedAtRef.current,
      };

      const res = await fetch("/api/ods/terminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Error desconocido.");
        return;
      }

      setSuccess(true);
      reset();
      startedAtRef.current = new Date().toISOString();
    } catch {
      setServerError("Error de conexion. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
      setShowConfirmDialog(false);
    }
  }, [store, reset]);

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
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Importar acta
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmDialog(true)}
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Guardando..." : "Confirmar y terminar"}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
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
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
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
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
