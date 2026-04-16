import {
  getDefaultAsistentesForMode,
  normalizePersistedAsistentesForMode,
  type Asistente,
} from "@/lib/asistentes";
import {
  buildRequestHash,
  hashStringHex,
} from "@/lib/finalization/idempotency";
import { normalizeModalidad, type ModalidadValue } from "@/lib/modalidad";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  createEmptyInduccionLinkedPerson,
  normalizeInduccionLinkedPerson,
  type InduccionLinkedPerson,
} from "@/lib/inducciones";

export type { InduccionLinkedPerson } from "@/lib/inducciones";

export type InduccionOperativaSection3ItemId =
  | "funciones_corresponden_perfil"
  | "explicacion_funciones"
  | "instrucciones_claras"
  | "sistema_medicion"
  | "induccion_maquinas"
  | "presentacion_companeros"
  | "presentacion_jefes"
  | "uso_epp"
  | "conducto_regular"
  | "puesto_trabajo"
  | "otros";

export type InduccionOperativaSection4ItemId =
  | "reconoce_instrucciones"
  | "proceso_atencion"
  | "identifica_funciones"
  | "importancia_calidad"
  | "relacion_companeros"
  | "recibe_sugerencias"
  | "objetivos_grupales"
  | "reconoce_entorno"
  | "ajuste_cambios"
  | "identifica_problema_laboral"
  | "respeto_companeros"
  | "lenguaje_corporal"
  | "reporte_novedades"
  | "organiza_actividades"
  | "cumple_horario"
  | "identifica_horarios"
  | "reporta_finalizacion";

export type InduccionOperativaSection4BlockId =
  | "comprension_instrucciones"
  | "autonomia_tareas"
  | "trabajo_equipo"
  | "adaptacion_flexibilidad"
  | "solucion_problemas"
  | "comunicacion_asertiva"
  | "manejo_tiempo"
  | "iniciativa_proactividad";

export type InduccionOperativaSection5RowId =
  | "condiciones_medicas_salud"
  | "habilidades_basicas_vida_diaria"
  | "habilidades_socioemocionales";

export type InduccionOperativaSection3Item = {
  ejecucion: string;
  observaciones: string;
};

export type InduccionOperativaSection4Item = {
  nivel_apoyo: string;
  observaciones: string;
};

export type InduccionOperativaSection5Row = {
  nivel_apoyo_requerido: string;
  observaciones: string;
};

export type InduccionOperativaSection4 = {
  items: Record<InduccionOperativaSection4ItemId, InduccionOperativaSection4Item>;
  notes: Record<InduccionOperativaSection4BlockId, string>;
};

export type InduccionOperativaValues = {
  fecha_visita: string;
  modalidad: ModalidadValue;
  nit_empresa: string;
  vinculado: InduccionLinkedPerson;
  section_3: Record<InduccionOperativaSection3ItemId, InduccionOperativaSection3Item>;
  section_4: InduccionOperativaSection4;
  section_5: Record<InduccionOperativaSection5RowId, InduccionOperativaSection5Row>;
  ajustes_requeridos: string;
  fecha_primer_seguimiento: string;
  observaciones_recomendaciones: string;
  asistentes: Asistente[];
};

export const INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS = {
  funciones_corresponden_perfil: "Las funciones asignadas corresponden al perfil del cargo",
  explicacion_funciones: "Se explico con detalle cada una de sus funciones",
  instrucciones_claras: "Se brindaron instrucciones claras y precisas",
  sistema_medicion: "Se explico el sistema de medicion de productividad, cumplimiento y calidad",
  induccion_maquinas: "Se realizo induccion en uso de maquinas, instrumentos y equipos",
  presentacion_companeros: "Se presento a sus companeros y equipo de trabajo cercano",
  presentacion_jefes: "Se presento a su jefe y lideres",
  uso_epp: "Se explico recomendaciones y uso de EPP",
  conducto_regular: "Se compartio informacion sobre conducto regular y persona responsable",
  puesto_trabajo: "Se asigno un puesto con requerimientos minimos",
  otros: "Otros",
} as const satisfies Record<InduccionOperativaSection3ItemId, string>;

export const INDUCCION_OPERATIVA_SECTION_4_BLOCKS = [
  {
    id: "comprension_instrucciones",
    title: "Comprension y ejecucion de instrucciones",
    items: [
      "reconoce_instrucciones",
      "proceso_atencion",
    ],
    noteId: "comprension_instrucciones",
  },
  {
    id: "autonomia_tareas",
    title: "Autonomia en desarrollo de tareas",
    items: ["identifica_funciones", "importancia_calidad"],
    noteId: "autonomia_tareas",
  },
  {
    id: "trabajo_equipo",
    title: "Trabajo en equipo",
    items: ["relacion_companeros", "recibe_sugerencias", "objetivos_grupales"],
    noteId: "trabajo_equipo",
  },
  {
    id: "adaptacion_flexibilidad",
    title: "Adaptacion y flexibilidad",
    items: ["reconoce_entorno", "ajuste_cambios"],
    noteId: "adaptacion_flexibilidad",
  },
  {
    id: "solucion_problemas",
    title: "Solucion de problemas",
    items: ["identifica_problema_laboral"],
    noteId: "solucion_problemas",
  },
  {
    id: "comunicacion_asertiva",
    title: "Comunicacion asertiva y efectiva",
    items: ["respeto_companeros", "lenguaje_corporal", "reporte_novedades"],
    noteId: "comunicacion_asertiva",
  },
  {
    id: "manejo_tiempo",
    title: "Manejo del tiempo",
    items: ["organiza_actividades", "cumple_horario", "identifica_horarios"],
    noteId: "manejo_tiempo",
  },
  {
    id: "iniciativa_proactividad",
    title: "Iniciativa y proactividad",
    items: ["reporta_finalizacion"],
    noteId: "iniciativa_proactividad",
  },
] as const;

export const INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS = {
  reconoce_instrucciones: "Reconoce e interpreta instrucciones",
  proceso_atencion: "Proceso de atencion y seguimiento",
  identifica_funciones: "Identifica funciones",
  importancia_calidad: "Importancia de la calidad",
  relacion_companeros: "Relacion con companeros",
  recibe_sugerencias: "Recibe sugerencias",
  objetivos_grupales: "Objetivos grupales",
  reconoce_entorno: "Reconoce el entorno",
  ajuste_cambios: "Ajuste a los cambios",
  identifica_problema_laboral: "Identifica problema laboral",
  respeto_companeros: "Respeto por companeros",
  lenguaje_corporal: "Lenguaje corporal",
  reporte_novedades: "Reporte de novedades",
  organiza_actividades: "Organiza actividades",
  cumple_horario: "Cumple horario",
  identifica_horarios: "Identifica horarios",
  reporta_finalizacion: "Reporta finalizacion",
} as const satisfies Record<InduccionOperativaSection4ItemId, string>;

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
] as const satisfies readonly { id: InduccionOperativaSection5RowId; label: string }[];

export const INDUCCION_OPERATIVA_SECTION_3_GROUPS = [
  {
    id: "generalidades",
    title: "3.1 Generalidades de la empresa",
    itemIds: [
      "funciones_corresponden_perfil",
      "explicacion_funciones",
      "instrucciones_claras",
    ],
  },
  {
    id: "operacion",
    title: "3.2 Operacion y seguimiento del cargo",
    itemIds: [
      "sistema_medicion",
      "induccion_maquinas",
      "presentacion_companeros",
    ],
  },
  {
    id: "sso",
    title: "3.3 Seguridad y salud en el trabajo",
    itemIds: [
      "presentacion_jefes",
      "uso_epp",
      "conducto_regular",
    ],
  },
  {
    id: "puesto_trabajo",
    title: "3.4 Induccion general al puesto de trabajo",
    itemIds: ["puesto_trabajo"],
  },
  {
    id: "evaluacion",
    title: "3.5 Proceso evaluativo de induccion",
    itemIds: ["otros"],
  },
] as const;

function createSection3Defaults() {
  return Object.fromEntries(
    Object.keys(INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS).map((itemId) => [
      itemId,
      { ejecucion: "", observaciones: "" },
    ])
  ) as Record<InduccionOperativaSection3ItemId, InduccionOperativaSection3Item>;
}

function createSection4Defaults() {
  const items = {
    reconoce_instrucciones: { nivel_apoyo: "", observaciones: "" },
    proceso_atencion: { nivel_apoyo: "", observaciones: "" },
    identifica_funciones: { nivel_apoyo: "", observaciones: "" },
    importancia_calidad: { nivel_apoyo: "", observaciones: "" },
    relacion_companeros: { nivel_apoyo: "", observaciones: "" },
    recibe_sugerencias: { nivel_apoyo: "", observaciones: "" },
    objetivos_grupales: { nivel_apoyo: "", observaciones: "" },
    reconoce_entorno: { nivel_apoyo: "", observaciones: "" },
    ajuste_cambios: { nivel_apoyo: "", observaciones: "" },
    identifica_problema_laboral: { nivel_apoyo: "", observaciones: "" },
    respeto_companeros: { nivel_apoyo: "", observaciones: "" },
    lenguaje_corporal: { nivel_apoyo: "", observaciones: "" },
    reporte_novedades: { nivel_apoyo: "", observaciones: "" },
    organiza_actividades: { nivel_apoyo: "", observaciones: "" },
    cumple_horario: { nivel_apoyo: "", observaciones: "" },
    identifica_horarios: { nivel_apoyo: "", observaciones: "" },
    reporta_finalizacion: { nivel_apoyo: "", observaciones: "" },
  } satisfies Record<
    InduccionOperativaSection4ItemId,
    InduccionOperativaSection4Item
  >;

  const notes = {
    comprension_instrucciones: "",
    autonomia_tareas: "",
    trabajo_equipo: "",
    adaptacion_flexibilidad: "",
    solucion_problemas: "",
    comunicacion_asertiva: "",
    manejo_tiempo: "",
    iniciativa_proactividad: "",
  } satisfies Record<InduccionOperativaSection4BlockId, string>;

  return { items, notes };
}

function createSection5Defaults() {
  return {
    condiciones_medicas_salud: { nivel_apoyo_requerido: "", observaciones: "" },
    habilidades_basicas_vida_diaria: {
      nivel_apoyo_requerido: "",
      observaciones: "",
    },
    habilidades_socioemocionales: {
      nivel_apoyo_requerido: "",
      observaciones: "",
    },
  } satisfies Record<InduccionOperativaSection5RowId, InduccionOperativaSection5Row>;
}

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeSection3(
  value: unknown
): InduccionOperativaValues["section_3"] {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const defaults = createSection3Defaults();
  const next = { ...defaults };

  for (const itemId of Object.keys(defaults) as InduccionOperativaSection3ItemId[]) {
    const item = candidate[itemId];
    const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    next[itemId] = {
      ejecucion: normalizeTextValue(source.ejecucion),
      observaciones: normalizeTextValue(source.observaciones),
    };
  }

  return next;
}

function normalizeSection4(
  value: unknown
): InduccionOperativaValues["section_4"] {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const defaults = createSection4Defaults();
  const next = {
    items: { ...defaults.items },
    notes: { ...defaults.notes },
  };

  const itemsCandidate = candidate.items && typeof candidate.items === "object"
    ? (candidate.items as Record<string, unknown>)
    : {};
  const notesCandidate = candidate.notes && typeof candidate.notes === "object"
    ? (candidate.notes as Record<string, unknown>)
    : {};

  for (const itemId of Object.keys(defaults.items) as InduccionOperativaSection4ItemId[]) {
    const item = itemsCandidate[itemId];
    const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    next.items[itemId] = {
      nivel_apoyo: normalizeTextValue(source.nivel_apoyo),
      observaciones: normalizeTextValue(source.observaciones),
    };
  }

  for (const blockId of Object.keys(defaults.notes) as InduccionOperativaSection4BlockId[]) {
    next.notes[blockId] = normalizeTextValue(notesCandidate[blockId]);
  }

  return next;
}

function normalizeSection5(
  value: unknown
): InduccionOperativaValues["section_5"] {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const defaults = createSection5Defaults();
  const next = { ...defaults };

  for (const rowId of Object.keys(defaults) as InduccionOperativaSection5RowId[]) {
    const item = candidate[rowId];
    const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    next[rowId] = {
      nivel_apoyo_requerido: normalizeTextValue(source.nivel_apoyo_requerido),
      observaciones: normalizeTextValue(source.observaciones),
    };
  }

  return next;
}

function createEmptyInduccionOperativaValues(
  empresa?: Empresa | null
): InduccionOperativaValues {
  const baseAsistentes = getDefaultAsistentesForMode({
    mode: "reca_plus_generic_attendees",
    profesionalAsignado: empresa?.profesional_asignado,
  });

  return {
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    vinculado: createEmptyInduccionLinkedPerson(),
    section_3: createSection3Defaults(),
    section_4: createSection4Defaults(),
    section_5: createSection5Defaults(),
    ajustes_requeridos: "",
    fecha_primer_seguimiento: "",
    observaciones_recomendaciones: "",
    asistentes: baseAsistentes,
  };
}

export function getDefaultInduccionOperativaValues(
  empresa?: Empresa | null
): InduccionOperativaValues {
  return createEmptyInduccionOperativaValues(empresa);
}

export function normalizeInduccionOperativaValues(
  values: Partial<InduccionOperativaValues> | Record<string, unknown>,
  empresa?: Empresa | null
): InduccionOperativaValues {
  const defaults = createEmptyInduccionOperativaValues(empresa);
  const source = values as Partial<InduccionOperativaValues>;

  return {
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita
        : defaults.fecha_visita,
    modalidad: normalizeModalidad(source.modalidad, defaults.modalidad),
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa
        : defaults.nit_empresa,
    vinculado: normalizeInduccionLinkedPerson(source.vinculado),
    section_3: normalizeSection3(source.section_3),
    section_4: normalizeSection4(source.section_4),
    section_5: normalizeSection5(source.section_5),
    ajustes_requeridos:
      typeof source.ajustes_requeridos === "string"
        ? source.ajustes_requeridos
        : defaults.ajustes_requeridos,
    fecha_primer_seguimiento:
      typeof source.fecha_primer_seguimiento === "string"
        ? source.fecha_primer_seguimiento
        : defaults.fecha_primer_seguimiento,
    observaciones_recomendaciones:
      typeof source.observaciones_recomendaciones === "string"
        ? source.observaciones_recomendaciones
        : defaults.observaciones_recomendaciones,
    asistentes: normalizePersistedAsistentesForMode(source.asistentes, {
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function buildInduccionOperativaRequestHash(payload: unknown) {
  return buildRequestHash(payload);
}

export function buildInduccionOperativaIdempotencyKey({
  userId,
  identity,
  requestHash,
}: {
  userId: string;
  identity: { draft_id?: string | null; local_draft_session_id: string };
  requestHash: string;
}) {
  const draftId =
    typeof identity.draft_id === "string" ? identity.draft_id.trim() : "";
  const sessionId = identity.local_draft_session_id.trim();
  const identityKey = draftId || sessionId;

  return hashStringHex(
    `induccion-operativa:${userId}:${identityKey}:${requestHash}`
  );
}
