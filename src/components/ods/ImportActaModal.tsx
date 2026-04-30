"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { PipelineResult } from "@/lib/ods/import/pipeline";

type ImportActaModalProps = {
  open: boolean;
  onClose: () => void;
  onPreview: (result: PipelineResult) => void;
};

type DecisionLogEntry = {
  level: number;
  levelName: string;
  success: boolean;
  durationMs?: number;
  details?: string;
  error?: string;
};

export function ImportActaModal({ open, onClose, onPreview }: ImportActaModalProps) {
  const [activeTab, setActiveTab] = useState<"id" | "file">("id");
  const [actaIdOrUrl, setActaIdOrUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<DecisionLogEntry[]>([]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorDetails([]);

    try {
      const formData = new FormData();
      if (activeTab === "id") {
        if (!actaIdOrUrl.trim()) {
          setError("Ingrese un ACTA ID o URL");
          return;
        }
        formData.append("actaIdOrUrl", actaIdOrUrl.trim());
      } else {
        if (!file) {
          setError("Seleccione un archivo PDF o Excel");
          return;
        }
        formData.append("file", file);
      }

      const res = await fetch("/api/ods/importar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error desconocido");
        if (Array.isArray(data.decisionLog)) setErrorDetails(data.decisionLog);
        return;
      }

      if (!data.success) {
        setError(data.error || "No se pudo extraer informacion del acta");
        if (Array.isArray(data.decisionLog)) setErrorDetails(data.decisionLog);
        return;
      }

      onPreview(data);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, actaIdOrUrl, file, onPreview]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setActaIdOrUrl("");
    setFile(null);
    setError(null);
    setLoading(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="import-acta-modal">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Importar acta</h2>
          <button
            type="button"
            onClick={handleClose}
            data-testid="import-acta-modal-close"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1" data-testid="import-acta-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("id")}
            data-testid="import-acta-tab-id"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "id"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Tengo el ID o URL del acta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            data-testid="import-acta-tab-file"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "file"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Subir archivo PDF/Excel
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "id" ? (
          <div className="space-y-3">
            <Label htmlFor="acta-id">ACTA ID o URL</Label>
            <Input
              id="acta-id"
              data-testid="import-acta-id-input"
              placeholder="Ej: ABC12XYZ o https://..."
              value={actaIdOrUrl}
              onChange={(e) => setActaIdOrUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Ingrese el codigo de 8 caracteres del acta o la URL completa del registro finalizado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="file-upload">Archivo PDF o Excel</Label>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.xlsx,.xlsm"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="space-y-1">
                    <Badge variant="default">{file.name}</Badge>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Arrastra un archivo o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-400">PDF, XLSX, XLSM</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            {errorDetails.length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-medium">
                  Ver detalle por nivel ({errorDetails.length} pasos)
                </summary>
                <ul className="mt-2 space-y-1 font-mono text-[11px]">
                  {errorDetails.map((d, i) => (
                    <li key={i}>
                      <span className="font-semibold">
                        Nivel {d.level} {d.levelName}
                      </span>
                      <span className={d.success ? "text-green-700" : "text-red-700"}>
                        {" "}
                        {d.success ? "✓" : "✗"}
                      </span>
                      {typeof d.durationMs === "number" && (
                        <span className="text-gray-500"> ({d.durationMs}ms)</span>
                      )}
                      {d.error && (
                        <div className="ml-4 text-red-600">error: {d.error}</div>
                      )}
                      {d.details && (
                        <div className="ml-4 text-gray-700">{d.details}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} data-testid="import-acta-submit" disabled={loading}>
            {loading ? "Procesando..." : "Importar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
