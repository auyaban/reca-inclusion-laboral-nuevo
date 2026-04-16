"use client";

import { useCallback, useState } from "react";
import {
  normalizeCedulaUsuario,
  type UsuarioRecaRecord,
} from "@/lib/usuariosReca";

export function useUsuarioRecaDetail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadByCedula = useCallback(async (cedula: string) => {
    const normalizedCedula = normalizeCedulaUsuario(cedula);
    if (!normalizedCedula) {
      setError("Ingresa una cédula válida para consultar.");
      return null as UsuarioRecaRecord | null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/usuarios-reca/${encodeURIComponent(normalizedCedula)}`
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ?? "No fue posible cargar los datos de usuarios RECA."
        );
      }

      return payload as UsuarioRecaRecord;
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No fue posible cargar los datos de usuarios RECA."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    loadByCedula,
    clearError: () => setError(null),
  };
}
