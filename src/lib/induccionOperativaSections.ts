import { getMeaningfulAsistentes } from "@/lib/asistentes";
import type {
  InduccionOperativaSection3ItemId,
  InduccionOperativaSection4BlockId,
  InduccionOperativaSection4ItemId,
  InduccionOperativaSection5RowId,
  InduccionOperativaValues,
} from "@/lib/induccionOperativa";

export const INDUCCION_OPERATIVA_SECTION_LABELS = {
  company: "Empresa",
  vinculado: "Vinculado",
  development: "Desarrollo del proceso",
  socioemotional: "Habilidades socioemocionales",
  support: "Nivel de apoyo requerido",
  adjustments: "Ajustes razonables requeridos",
  followup: "Primer seguimiento",
  observations: "Observaciones / recomendaciones",
  attendees: "Asistentes",
} as const;

export type InduccionOperativaSectionId =
  keyof typeof INDUCCION_OPERATIVA_SECTION_LABELS;

export const INITIAL_INDUCCION_OPERATIVA_COLLAPSED_SECTIONS = {
  company: false,
  vinculado: false,
  development: false,
  socioemotional: false,
  support: false,
  adjustments: false,
  followup: false,
  observations: false,
  attendees: false,
} satisfies Record<InduccionOperativaSectionId, boolean>;

export const INDUCCION_OPERATIVA_COMPAT_STEP_BY_SECTION: Record<
  InduccionOperativaSectionId,
  number
> = {
  company: 0,
  vinculado: 1,
  development: 2,
  socioemotional: 3,
  support: 4,
  adjustments: 5,
  followup: 6,
  observations: 7,
  attendees: 8,
};

export const INDUCCION_OPERATIVA_SECTION_3_ROWS: Array<{
  sectionId: string;
  title: string;
  itemIds: readonly InduccionOperativaSection3ItemId[];
}> = [
  {
    sectionId: "development-generalities",
    title: "3.1 Generalidades de la empresa",
    itemIds: [
      "funciones_corresponden_perfil",
      "explicacion_funciones",
      "instrucciones_claras",
    ],
  },
  {
    sectionId: "development-operation",
    title: "3.2 Operacion y seguimiento del cargo",
    itemIds: [
      "sistema_medicion",
      "induccion_maquinas",
      "presentacion_companeros",
    ],
  },
  {
    sectionId: "development-sso",
    title: "3.3 Seguridad y salud en el trabajo",
    itemIds: ["presentacion_jefes", "uso_epp", "conducto_regular"],
  },
  {
    sectionId: "development-workstation",
    title: "3.4 Induccion general al puesto de trabajo",
    itemIds: ["puesto_trabajo"],
  },
  {
    sectionId: "development-evaluation",
    title: "3.5 Proceso evaluativo de induccion",
    itemIds: ["otros"],
  },
] as const;

export const INDUCCION_OPERATIVA_SECTION_4_BLOCKS = [
  {
    id: "comprension_instrucciones",
    title: "Comprension y ejecucion de instrucciones",
    itemIds: [
      "reconoce_instrucciones",
      "proceso_atencion",
    ] as const satisfies readonly InduccionOperativaSection4ItemId[],
  },
  {
    id: "autonomia_tareas",
    title: "Autonomia en desarrollo de tareas",
    itemIds: ["identifica_funciones", "importancia_calidad"] as const satisfies readonly InduccionOperativaSection4ItemId[],
  },
  {
    id: "trabajo_equipo",
    title: "Trabajo en equipo",
    itemIds: [
      "relacion_companeros",
      "recibe_sugerencias",
      "objetivos_grupales",
    ] as const satisfies readonly InduccionOperativaSection4ItemId[],
  },
  {
    id: "adaptacion_flexibilidad",
    title: "Adaptacion y flexibilidad",
    itemIds: ["reconoce_entorno", "ajuste_cambios"] as const satisfies readonly InduccionOperativaSection4ItemId[],
  },
  {
    id: "solucion_problemas",
    title: "Solucion de problemas",
    itemIds: ["identifica_problema_laboral"] as const satisfies readonly InduccionOperativaSection4ItemId[],
  },
  {
    id: "comunicacion_asertiva",
    title: "Comunicacion asertiva y efectiva",
    itemIds: [
      "respeto_companeros",
      "lenguaje_corporal",
      "reporte_novedades",
    ] as const satisfies readonly InduccionOperativaSection4ItemId[],
  },
  {
    id: "manejo_tiempo",
    title: "Manejo del tiempo",
    itemIds: [
      "organiza_actividades",
      "cumple_horario",
      "identifica_horarios",
    ] as const satisfies readonly InduccionOperativaSection4ItemId[],
  },
  {
    id: "iniciativa_proactividad",
    title: "Iniciativa y proactividad",
    itemIds: ["reporta_finalizacion"] as const satisfies readonly InduccionOperativaSection4ItemId[],
  },
] as const;

export const INDUCCION_OPERATIVA_SECTION_4_ITEM_TO_BLOCK = Object.fromEntries(
  INDUCCION_OPERATIVA_SECTION_4_BLOCKS.flatMap((block) =>
    block.itemIds.map((itemId) => [itemId, block.id])
  )
) as Record<InduccionOperativaSection4ItemId, InduccionOperativaSection4BlockId>;

export const INDUCCION_OPERATIVA_SECTION_5_ROWS = [
  {
    id: "condiciones_medicas_salud",
    label: "Condiciones medicas y de salud",
  },
  {
    id: "habilidades_basicas_vida_diaria",
    label: "Habilidades basicas de la vida diaria",
  },
  {
    id: "habilidades_socioemocionales",
    label: "Habilidades socioemocionales",
  },
] as const satisfies readonly {
  id: InduccionOperativaSection5RowId;
  label: string;
}[];

export function getInduccionOperativaCompatStepForSection(
  sectionId: InduccionOperativaSectionId
) {
  return INDUCCION_OPERATIVA_COMPAT_STEP_BY_SECTION[sectionId];
}

export function getInduccionOperativaSectionIdForStep(step: number) {
  const entry = (Object.entries(
    INDUCCION_OPERATIVA_COMPAT_STEP_BY_SECTION
  ) as Array<[InduccionOperativaSectionId, number]>).find(([, value]) => value === step);
  return entry?.[0] ?? "company";
}

export function isInduccionOperativaCompanySectionComplete(values: {
  fecha_visita?: string;
  modalidad?: string;
  nit_empresa?: string;
}) {
  return Boolean(
    values.fecha_visita?.trim() &&
      values.modalidad?.trim() &&
      values.nit_empresa?.trim()
  );
}

export function isInduccionOperativaVinculadoSectionComplete(
  values:
    | InduccionOperativaValues["vinculado"]
    | {
        vinculado?: {
          nombre_oferente?: string;
          cedula?: string;
          cargo_oferente?: string;
        };
      }
) {
  const vinculado =
    "vinculado" in values
      ? values.vinculado
      : (values as InduccionOperativaValues["vinculado"]);
  return Boolean(
    vinculado?.nombre_oferente?.trim() &&
      vinculado?.cedula?.trim() &&
      vinculado?.cargo_oferente?.trim()
  );
}

export function isInduccionOperativaDevelopmentSectionComplete(
  values:
    | InduccionOperativaValues["section_3"]
    | {
        section_3: Record<
          InduccionOperativaSection3ItemId,
          { ejecucion?: string; observaciones?: string }
        >;
      }
) {
  const section3 = "section_3" in values ? values.section_3 : values;
  return Object.values(section3).every((item) => Boolean(item.ejecucion?.trim()));
}

export function isInduccionOperativaSocioemotionalSectionComplete(
  values:
    | InduccionOperativaValues["section_4"]
    | {
        section_4: {
          items: Record<
            InduccionOperativaSection4ItemId,
            { nivel_apoyo?: string; observaciones?: string }
          >;
          notes: Record<InduccionOperativaSection4BlockId, string>;
        };
      }
) {
  const section4 = "section_4" in values ? values.section_4 : values;
  return Object.values(section4.items).every((item) =>
    Boolean(item.nivel_apoyo?.trim())
  );
}

export function isInduccionOperativaSection4Complete(
  values:
    | InduccionOperativaValues["section_4"]
    | {
        section_4: {
          items: Record<
            InduccionOperativaSection4ItemId,
            { nivel_apoyo?: string; observaciones?: string }
          >;
          notes: Record<InduccionOperativaSection4BlockId, string>;
        };
      }
) {
  return isInduccionOperativaSocioemotionalSectionComplete(values);
}

export function isInduccionOperativaSupportSectionComplete(
  values:
    | InduccionOperativaValues["section_5"]
    | {
        section_5: Record<
          InduccionOperativaSection5RowId,
          { nivel_apoyo_requerido?: string; observaciones?: string }
        >;
      }
) {
  const section5 = "section_5" in values ? values.section_5 : values;
  return Object.values(section5).every((item) =>
    Boolean(item.nivel_apoyo_requerido?.trim())
  );
}

export function isInduccionOperativaSection5Complete(
  values:
    | InduccionOperativaValues["section_5"]
    | {
        section_5: Record<
          InduccionOperativaSection5RowId,
          { nivel_apoyo_requerido?: string; observaciones?: string }
        >;
      }
) {
  return isInduccionOperativaSupportSectionComplete(values);
}

export function isInduccionOperativaAdjustmentsSectionComplete(values: {
  ajustes_requeridos?: string;
}) {
  return Boolean(values.ajustes_requeridos?.trim());
}

export function isInduccionOperativaFollowupSectionComplete(values: {
  fecha_primer_seguimiento?: string;
  failed_visit_applied_at?: string | null;
}) {
  if (values.failed_visit_applied_at) {
    return true;
  }

  return Boolean(values.fecha_primer_seguimiento?.trim());
}

export function isInduccionOperativaObservationsSectionComplete(values: {
  observaciones_recomendaciones?: string;
  required?: boolean;
}) {
  if (values.required !== true) {
    return true;
  }

  return Boolean(values.observaciones_recomendaciones?.trim());
}

export function isInduccionOperativaAttendeesSectionComplete(
  values:
    | InduccionOperativaValues["asistentes"]
    | {
        asistentes: Array<{ nombre?: string; cargo?: string }>;
      }
) {
  const asistentes = Array.isArray(values) ? values : values.asistentes;
  return getMeaningfulAsistentes(asistentes).length > 0;
}
