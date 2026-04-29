"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ImportarResult } from "@/lib/ods/schemas";
import type { PipelineResult } from "@/lib/ods/import/pipeline";
import { confidenceToBadgeVariant, confidenceToLabel } from "@/lib/ods/import/confidenceBreakdown";

type ImportPreviewDialogProps = {
  open: boolean;
  result: PipelineResult | null;
  onClose: () => void;
  onApply: () => void;
};

export function ImportPreviewDialog({ open, result, onClose, onApply }: ImportPreviewDialogProps) {
  const [expandedLog, setExpandedLog] = useState(false);

  if (!open || !result) return null;

  const { participants, suggestions, confidenceBreakdown, decisionLog, warnings, companyMatch } = result;

  const existingCount = participants.filter((p) => p.exists).length;
  const newCount = participants.filter((p) => !p.exists).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Vista previa de importacion</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Metric cards */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-gray-50 p-3 text-center">
            <p className="text-2xl font-semibold text-gray-900">{participants.length}</p>
            <p className="text-xs text-gray-500">Oferentes detectados</p>
          </div>
          <div className="rounded-lg border bg-green-50 p-3 text-center">
            <p className="text-2xl font-semibold text-green-700">{existingCount}</p>
            <p className="text-xs text-gray-500">Usuarios existentes</p>
          </div>
          <div className="rounded-lg border bg-amber-50 p-3 text-center">
            <p className="text-2xl font-semibold text-amber-700">{newCount}</p>
            <p className="text-xs text-gray-500">Usuarios por crear</p>
          </div>
        </div>

        {/* Empresa */}
        {companyMatch && (
          <div className="mb-4 rounded-lg border p-3">
            <h3 className="mb-1 text-sm font-medium text-gray-700">Empresa detectada</h3>
            <p className="text-sm text-gray-900">{companyMatch.nombre_empresa}</p>
            <p className="text-xs text-gray-500">NIT: {companyMatch.nit_empresa}</p>
            <Badge variant={companyMatch.matchType === "nit_exact" ? "default" : "secondary"} className="mt-1">
              {companyMatch.matchType === "nit_exact" ? "NIT exacto" : companyMatch.matchType === "nit_fuzzy" ? "NIT fuzzy" : "Nombre fuzzy"}
            </Badge>
          </div>
        )}

        {/* Servicio sugerido */}
        {suggestions.length > 0 && (
          <div className="mb-4 rounded-lg border p-3">
            <h3 className="mb-1 text-sm font-medium text-gray-700">Servicio sugerido</h3>
            {suggestions[0].codigo_servicio && (
              <p className="text-sm text-gray-900">Codigo: {suggestions[0].codigo_servicio}</p>
            )}
            {suggestions[0].modalidad_servicio && (
              <p className="text-sm text-gray-900">Modalidad: {suggestions[0].modalidad_servicio}</p>
            )}
            {suggestions[0].valor_base != null && (
              <p className="text-sm text-gray-900">Valor base: ${suggestions[0].valor_base.toLocaleString("es-CO")}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Badge variant={confidenceToBadgeVariant(suggestions[0].confidence) as "default" | "secondary" | "destructive"}>
                Confianza: {confidenceToLabel(suggestions[0].confidence)}
              </Badge>
            </div>
          </div>
        )}

        {/* Sub-confidences (B4) */}
        {confidenceBreakdown && confidenceBreakdown.subConfidences.length > 0 && (
          <div className="mb-4 rounded-lg border p-3">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Desglose de confianza</h3>
            <div className="flex flex-wrap gap-2">
              {confidenceBreakdown.subConfidences.map((sc, i) => (
                <Badge
                  key={i}
                  variant={confidenceToBadgeVariant(sc.confidence) as "default" | "secondary" | "destructive"}
                  title={sc.detail}
                >
                  {sc.label}: {confidenceToLabel(sc.confidence)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top-3 tarifas (B1) */}
        {suggestions.length > 1 && (
          <div className="mb-4 rounded-lg border p-3">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Top-3 sugerencias</h3>
            <div className="space-y-1">
              {suggestions.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-500">#{s.rank}</span>
                  <span>{s.codigo_servicio || "Sin codigo"}</span>
                  <Badge variant={confidenceToBadgeVariant(s.confidence) as "default" | "secondary" | "destructive"} className="text-xs">
                    {confidenceToLabel(s.confidence)}
                  </Badge>
                  <span className="text-xs text-gray-400">Score: {s.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participantes */}
        {participants.length > 0 && (
          <div className="mb-4 rounded-lg border p-3">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Participantes</h3>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {participants.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{p.nombre_usuario || p.cedula_usuario}</span>
                  <Badge variant={p.exists ? "default" : "secondary"}>
                    {p.exists ? "Existente" : "Por crear"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <h3 className="mb-1 text-sm font-medium text-amber-800">Warnings ({warnings.length})</h3>
            <ul className="list-inside space-y-1 text-xs text-amber-700">
              {warnings.slice(0, 6).map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Decision log expandible (C1) */}
        {decisionLog.length > 0 && (
          <div className="mb-4 rounded-lg border p-3">
            <button
              type="button"
              onClick={() => setExpandedLog(!expandedLog)}
              className="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Decision log ({decisionLog.length} niveles)
              <span className="text-xs text-gray-400">{expandedLog ? "▼" : "▶"}</span>
            </button>
            {expandedLog && (
              <div className="mt-2 space-y-1">
                {decisionLog.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Badge variant={entry.success ? "default" : "destructive"} className="text-xs">
                      Nivel {entry.level}: {entry.levelName}
                    </Badge>
                    <span className={entry.success ? "text-green-600" : "text-red-600"}>
                      {entry.success ? "OK" : "Fallo"}
                    </span>
                    <span className="text-gray-400">{entry.durationMs}ms</span>
                    {entry.details && <span className="text-gray-500">{entry.details}</span>}
                    {entry.error && <span className="text-red-500">{entry.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onApply}>
            Aplicar al formulario
          </Button>
        </div>
      </div>
    </div>
  );
}
