export type InterpreteCatalogItem = {
  id: string;
  nombre: string;
};

export function normalizeInterpreteName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function buildInterpreteNameKey(value: string) {
  return normalizeInterpreteName(value).toLocaleLowerCase("es-CO");
}

export function sortInterpretes<T extends { nombre: string }>(
  items: readonly T[]
) {
  return [...items].sort((left, right) =>
    left.nombre.localeCompare(right.nombre, "es-CO", {
      sensitivity: "base",
    })
  );
}
