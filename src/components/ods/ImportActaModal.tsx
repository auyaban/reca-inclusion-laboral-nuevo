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

export function ImportActaModal({ open, onClose, onPreview }: ImportActaModalProps) {
  const [activeTab, setActiveTab] = useState<"id" | "file">("id");
  const [actaIdOrUrl, setActaIdOrUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);

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
        return;
      }

      if (!data.success) {
        setError(data.error || "No se pudo extraer informacion del acta");
        return;
      }

      onPreview(data);
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Importar acta</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("id")}
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
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Procesando..." : "Importar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
