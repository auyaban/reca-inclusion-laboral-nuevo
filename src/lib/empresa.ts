import type { Empresa } from "@/lib/store/empresaStore";

// Minimal fields for autocomplete display only
export const EMPRESA_SEARCH_FIELDS = [
  "id",
  "nombre_empresa",
  "nit_empresa",
  "ciudad_empresa",
  "zona_empresa",
  "sede_empresa",
].join(", ");

// Full fields — used when loading an empresa for form use
export const EMPRESA_SELECT_FIELDS = [
  "id",
  "nombre_empresa",
  "nit_empresa",
  "direccion_empresa",
  "ciudad_empresa",
  "sede_empresa",
  "zona_empresa",
  "correo_1",
  "contacto_empresa",
  "telefono_empresa",
  "cargo",
  "profesional_asignado",
  "correo_profesional",
  "asesor",
  "correo_asesor",
  "caja_compensacion",
].join(", ");

function getNullableString(record: Record<string, unknown>, key: keyof Empresa) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

export function parseEmpresaSnapshot(value: unknown): Empresa | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const nombre = getNullableString(record, "nombre_empresa");
  const nit = getNullableString(record, "nit_empresa");

  if (!nombre && !nit) {
    return null;
  }

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `draft-${nit ?? nombre ?? "empresa"}`,
    nombre_empresa: nombre ?? "Empresa sin nombre",
    nit_empresa: nit,
    direccion_empresa: getNullableString(record, "direccion_empresa"),
    ciudad_empresa: getNullableString(record, "ciudad_empresa"),
    sede_empresa: getNullableString(record, "sede_empresa"),
    zona_empresa: getNullableString(record, "zona_empresa"),
    correo_1: getNullableString(record, "correo_1"),
    contacto_empresa: getNullableString(record, "contacto_empresa"),
    telefono_empresa: getNullableString(record, "telefono_empresa"),
    cargo: getNullableString(record, "cargo"),
    profesional_asignado: getNullableString(record, "profesional_asignado"),
    correo_profesional: getNullableString(record, "correo_profesional"),
    asesor: getNullableString(record, "asesor"),
    correo_asesor: getNullableString(record, "correo_asesor"),
    caja_compensacion: getNullableString(record, "caja_compensacion"),
  };
}
