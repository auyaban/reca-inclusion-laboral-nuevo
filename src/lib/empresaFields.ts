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

  return (
    normalizeEmpresaField(empresa.zona_empresa) ??
    normalizeEmpresaField(empresa.sede_empresa) ??
    ""
  );
}
