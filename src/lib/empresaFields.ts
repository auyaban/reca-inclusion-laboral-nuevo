export type EmpresaSedeSnapshot = {
  sede_empresa?: string | null;
  zona_empresa?: string | null;
};

function normalizeEmpresaField(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getEmpresaSedeCompensarValue(
  empresa: EmpresaSedeSnapshot | null | undefined
) {
  if (!empresa) {
    return "";
  }

  // "Sede Compensar" siempre se lee de `empresas.zona_empresa`.
  // No hacer fallback a `sede_empresa`: esa columna contiene "Principal"
  // en ~926 filas y filtraba ese valor a la UI y al payload de finalizacion
  // cuando `zona_empresa` quedaba vacio.
  return normalizeEmpresaField(empresa.zona_empresa) ?? "";
}
