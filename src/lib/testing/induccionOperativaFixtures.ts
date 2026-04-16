import {
  INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_4_BLOCKS,
  INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_5_ROWS,
  getDefaultInduccionOperativaValues,
  type InduccionOperativaValues,
} from "@/lib/induccionOperativa";
import type { Empresa } from "@/lib/store/empresaStore";

export const INDUCCION_OPERATIVA_TEST_EMPRESA: Empresa = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: "Zona Norte",
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@reca.com",
  caja_compensacion: "Compensar",
};

export function buildValidInduccionOperativaValues(
  overrides: Partial<InduccionOperativaValues> = {}
): InduccionOperativaValues {
  const defaults = getDefaultInduccionOperativaValues(
    INDUCCION_OPERATIVA_TEST_EMPRESA
  );

  const section3 = Object.fromEntries(
    Object.keys(INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS).map((itemId) => [
      itemId,
      { ejecucion: "Si", observaciones: "Observacion" },
    ])
  ) as InduccionOperativaValues["section_3"];

  const section4Items = Object.fromEntries(
    Object.keys(INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS).map((itemId) => [
      itemId,
      {
        nivel_apoyo: "0. No requiere apoyo.",
        observaciones: "0. Cumple autonomamente.",
      },
    ])
  ) as InduccionOperativaValues["section_4"]["items"];

  const section4Notes = Object.fromEntries(
    INDUCCION_OPERATIVA_SECTION_4_BLOCKS.map((block) => [block.id, "Nota"])
  ) as InduccionOperativaValues["section_4"]["notes"];

  const section5 = Object.fromEntries(
    INDUCCION_OPERATIVA_SECTION_5_ROWS.map((row) => [
      row.id,
      {
        nivel_apoyo_requerido: "0. No requiere apoyo.",
        observaciones: "Observacion",
      },
    ])
  ) as InduccionOperativaValues["section_5"];

  return {
    ...defaults,
    fecha_visita: "2026-04-15",
    modalidad: "Presencial",
    nit_empresa: "900123456",
    vinculado: {
      numero: "1",
      nombre_oferente: "Ana Perez",
      cedula: "123456",
      telefono_oferente: "3001234567",
      cargo_oferente: "Analista",
    },
    section_3: {
      ...section3,
      ...overrides.section_3,
    },
    section_4: overrides.section_4 ?? {
      items: section4Items,
      notes: section4Notes,
    },
    section_5: {
      ...section5,
      ...overrides.section_5,
    },
    ajustes_requeridos: "Ajustes requeridos",
    fecha_primer_seguimiento: "2026-04-20",
    observaciones_recomendaciones: "Observaciones amplias",
    asistentes: [
      { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
      { nombre: "Laura Gomez", cargo: "Gerente" },
    ],
    ...overrides,
  };
}
