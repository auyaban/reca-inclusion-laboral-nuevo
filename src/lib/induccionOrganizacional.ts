import {
  getDefaultAsistentesForMode,
  normalizePersistedAsistentesForMode,
  type Asistente,
} from "@/lib/asistentes";
import {
  createEmptyInduccionLinkedPerson,
  normalizeInduccionLinkedPerson,
  type InduccionLinkedPerson,
} from "@/lib/inducciones";
import { normalizeModalidad, type ModalidadValue } from "@/lib/modalidad";
import type { Empresa } from "@/lib/store/empresaStore";

export const INDUCCION_ORGANIZACIONAL_FORM_ID = "induccion_organizacional";
export const INDUCCION_ORGANIZACIONAL_FORM_NAME = "Induccion Organizacional";
export const INDUCCION_ORGANIZACIONAL_SHEET_NAME =
  "6. INDUCCIÓN ORGANIZACIONAL";

export const INDUCCION_ORGANIZACIONAL_SECTION_3_VISTO_OPTIONS = [
  "Si",
  "No",
  "No aplica",
] as const;

export const INDUCCION_ORGANIZACIONAL_SECTION_3_MEDIO_OPTIONS = [
  "Video",
  "Documentos escritos",
  "Imagenes",
  "Presentaciones",
  "Mixto",
  "Exposicion oral",
  "No aplica",
] as const;

export const INDUCCION_ORGANIZACIONAL_SECTION_4_MEDIO_OPTIONS = [
  "Video",
  "Documentos Escritos, Presentaciones, Imagenes y Evaluaciones escritas",
  "Plataformas",
  "No aplica",
] as const;

export const INDUCCION_ORGANIZACIONAL_SECTION_4_RECOMMENDATIONS = {
  Video:
    "1. Subtitulos precisos y sincronizados con dialogo y sonidos.\n2. Descripciones de audio sobre lo que sucede en video.\n3. Iluminacion adecuada y contraste alto.\n4. Audio claro, entendible y con transcripcion.\n5. Evitar parpadeos, destellos y patrones moviles.\n6. Navegabilidad e interaccion adecuadas para discapacidad cognitiva o movilidad reducida.\n7. Duracion sugerida: difusion maximo 2 minutos; formacion maximo 5 minutos.\n8. Incluir LSC para discapacidad auditiva; interprete en angulo inferior derecho.\n\nRECOMENDACION GENERAL\n- Si el video supera 10 minutos, hacer pausas cada 2-3 minutos para retroalimentacion.\n- Acompanamiento permanente durante el video para resolver preguntas.",
  "Documentos Escritos, Presentaciones, Imagenes y Evaluaciones escritas":
    "1. Usar letra legible (Arial, Calibri, Times New Roman o Tahoma).\n2. Tamano de letra no menor a 12 puntos, ajustado a necesidad.\n3. Contraste adecuado entre fondo y letra.\n4. Interlineado sugerido de 1.5 o 2.\n5. Texto en posicion vertical de izquierda a derecha.\n6. Diseno sencillo, evitando exceso de elementos decorativos.\n7. Imagenes con tamano y resolucion adecuados.\n8. Lenguaje claro y sencillo, evitando jerga tecnica.\n9. Encabezados y subtitulos para organizar informacion.\n10. Uso de listas y tablas para estructura.\n11. Incluir descripcion en imagenes, graficos y tablas.\n12. Estructura estandar con tabla de contenido y navegacion facil.\n13. Formato estandar (PDF o HTML) compatible con lectores de pantalla.\n14. Para imagenes usar formatos estandar (JPEG o PNG) compatibles.",
  Plataformas:
    "1. Estructura de navegacion estandar con tabla de contenido.\n2. Botones y enlaces con tamano adecuado y alto contraste.\n3. Teclas de acceso rapido para navegacion.\n4. Tecnologias de reconocimiento y comandos de voz.\n5. Compatibilidad con herramientas de accesibilidad (asistente de voz, talkback, jaws, magic).\n\nRECOMENDACION GENERAL\n- Si no es posible ajustar accesibilidad en plataforma, asignar par de apoyo para lectura en voz alta y retroalimentacion constante.",
  "No aplica": "No aplica",
} as const;

export const INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS = [
  {
    id: "3_1",
    title: "3.1 Generalidades de la empresa",
    items: [
      {
        id: "historia_empresa",
        label: "Historia de la empresa.",
        row: 21,
      },
      {
        id: "mision_organizacional",
        label: "Explicacion y verificacion de la Mision organizacional.",
        row: 22,
      },
      {
        id: "vision_organizacional",
        label: "Explicacion y verificacion de la Vision organizacional",
        row: 23,
      },
      {
        id: "objetivos_valores_principios",
        label:
          "Explicacion y verificacion de Objetivos, Valores y Principios Organizacionales",
        row: 24,
      },
      {
        id: "recorrido_empresa",
        label: "Recorrido por la empresa-planta",
        row: 25,
      },
    ],
  },
  {
    id: "3_2",
    title: "3.2 Gestion Humana",
    items: [
      {
        id: "tramites_permisos",
        label: "Explicacion tramites para permisos",
        row: 27,
      },
      {
        id: "formas_pago",
        label: "Explicacion de formas de pago",
        row: 28,
      },
      {
        id: "obligaciones_prohibiciones",
        label: "Explicacion de obligaciones y prohibiciones del empleado",
        row: 29,
      },
      {
        id: "normatividad_interna",
        label: "Explicacion de Normatividad interna de la empresa",
        row: 30,
      },
      {
        id: "practicas_inclusivas",
        label:
          "Explicacion de practicas inclusivas y/o una politica de diversidad e inclusion.",
        row: 31,
      },
      { id: "horario_laboral", label: "Horario laboral", row: 32 },
      { id: "organigrama", label: "Organigrama", row: 33 },
      {
        id: "incapacidades_permisos_calamidades",
        label: "Reporte y entrega de incapacidades, permisos, calamidades.",
        row: 34,
      },
      {
        id: "equipos_tecnologicos",
        label: "Entrega equipos tecnologicos",
        row: 35,
      },
      { id: "comites", label: "Explicacion de Comites", row: 36 },
      {
        id: "conductos_regulares_comunicacion",
        label: "Conductos regulares de comunicacion.",
        row: 37,
      },
    ],
  },
  {
    id: "3_3",
    title: "3.3 Sistema de gestion - seguridad y salud en el trabajo (SG-SST)",
    items: [
      {
        id: "sgsst_general",
        label:
          "Explicacion del sistema de gestion seguridad y salud en el trabajo (SG-SST)",
        row: 39,
      },
      {
        id: "peligros_riesgos",
        label:
          "Explicacion de peligros, riesgos,accidentes y enfermedades laborales.",
        row: 40,
      },
      {
        id: "uso_epp",
        label: "Explicacion de uso de elementos de proteccion personal EPP.",
        row: 41,
      },
      {
        id: "politicas_medio_ambiente",
        label:
          "Explicacion de politicas de proteccion, prevencion y control del medio ambiente.",
        row: 42,
      },
      {
        id: "politicas_confidencialidad",
        label: "Explicacion de politicas de confidencialidad",
        row: 43,
      },
      {
        id: "plan_emergencias",
        label:
          "Explicacion de plan de emergencias, rutas de evacuacion y punto de encuentro.",
        row: 44,
      },
      {
        id: "prevencion_consumo",
        label:
          "Explicacion de politicas de prevencion del consumo de alcohol, tabaco y sustancias psicoactivas.",
        row: 45,
      },
      { id: "normas_comite", label: "Explicacion de normas de comite", row: 46 },
      {
        id: "normas_disciplinarias",
        label: "Explicacion de normas y medidas disciplinarias.",
        row: 47,
      },
      {
        id: "entrega_dotacion_epp",
        label: "Entrega de dotacion, elementos de proteccion personal EPP.",
        row: 48,
      },
      {
        id: "brigada_emergencia",
        label: "Explicacion brigada de emergencia",
        row: 49,
      },
      {
        id: "mecanismos_desempeno",
        label: "Mecanismos para medir o evaluar el desempeno",
        row: 50,
      },
      {
        id: "procedimiento_accidente",
        label:
          "Procedimiento que se debe seguir en caso de accidente de trabajo",
        row: 51,
      },
    ],
  },
  {
    id: "3_4",
    title: "3.4 Induccion general a puesto de trabajo",
    items: [
      {
        id: "funciones_especificas",
        label: "Explicacion de funciones especificas.",
        row: 53,
      },
      {
        id: "horario_turnos",
        label: "Explicacion del horario o turnos de trabajo.",
        row: 54,
      },
      { id: "dotacion_uniformes", label: "Entrega dotacion uniformes.", row: 55 },
      {
        id: "presentacion_equipo",
        label: "Presentacion equipo de trabajo",
        row: 56,
      },
      { id: "registro_ingreso", label: "Registro ingreso empresa", row: 57 },
      { id: "entrega_carnet", label: "Entrega del Carnet", row: 58 },
      { id: "recorrido_puesto", label: "Recorrido puesto de trabajo", row: 59 },
    ],
  },
  {
    id: "3_5",
    title: "3.5 Proceso evaluativo de induccion",
    items: [
      { id: "evaluaciones", label: "Evaluaciones", row: 61 },
      { id: "plataformas_elearning", label: "Plataformas e-learning", row: 62 },
    ],
  },
] as const;

export type InduccionOrganizacionalSection3GroupId =
  (typeof INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS)[number]["id"];

export type InduccionOrganizacionalSection3ItemId =
  (typeof INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS)[number]["items"][number]["id"];

export type InduccionOrganizacionalSection3Row = {
  visto: string;
  responsable: string;
  medio_socializacion: string;
  descripcion: string;
};

export type InduccionOrganizacionalSection4Row = {
  medio: string;
  recomendacion: string;
};

export type InduccionOrganizacionalValues = {
  fecha_visita: string;
  modalidad: ModalidadValue;
  nit_empresa: string;
  vinculado: InduccionLinkedPerson;
  section_3: Record<InduccionOrganizacionalSection3ItemId, InduccionOrganizacionalSection3Row>;
  section_4: InduccionOrganizacionalSection4Row[];
  section_5: {
    observaciones: string;
  };
  asistentes: Asistente[];
};

export const INDUCCION_ORGANIZACIONAL_SECTION_4_DEFAULT_ROWS = [
  { medio: "", recomendacion: "" },
  { medio: "", recomendacion: "" },
  { medio: "", recomendacion: "" },
] satisfies InduccionOrganizacionalSection4Row[];

export function getInduccionOrganizacionalSection3ItemIds() {
  return INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS.flatMap((group) =>
    group.items.map((item) => item.id)
  );
}

export function getInduccionOrganizacionalSection3DefaultRow(): InduccionOrganizacionalSection3Row {
  return {
    visto: "",
    responsable: "",
    medio_socializacion: "",
    descripcion: "",
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAllowedValue<TAllowed extends readonly string[]>(
  value: unknown,
  allowedValues: TAllowed
) {
  const text = normalizeText(value);
  return allowedValues.includes(text as TAllowed[number]) ? (text as TAllowed[number]) : "";
}

export function getInduccionOrganizacionalRecommendationForMedium(medio: string) {
  const normalized = normalizeText(medio);
  if (!normalized) {
    return "";
  }

  return (
    INDUCCION_ORGANIZACIONAL_SECTION_4_RECOMMENDATIONS[
      normalized as keyof typeof INDUCCION_ORGANIZACIONAL_SECTION_4_RECOMMENDATIONS
    ] ?? ""
  );
}

export function getDefaultInduccionOrganizacionalValues(
  empresa?: Empresa | null
): InduccionOrganizacionalValues {
  const section3Defaults = Object.fromEntries(
    getInduccionOrganizacionalSection3ItemIds().map((itemId) => [
      itemId,
      getInduccionOrganizacionalSection3DefaultRow(),
    ])
  ) as InduccionOrganizacionalValues["section_3"];

  return {
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    vinculado: createEmptyInduccionLinkedPerson(),
    section_3: section3Defaults,
    section_4: INDUCCION_ORGANIZACIONAL_SECTION_4_DEFAULT_ROWS.map((row) => ({
      ...row,
    })),
    section_5: {
      observaciones: "",
    },
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

function normalizeSection3Row(
  value: unknown
): InduccionOrganizacionalSection3Row {
  const candidate =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    visto: normalizeAllowedValue(
      candidate.visto,
      INDUCCION_ORGANIZACIONAL_SECTION_3_VISTO_OPTIONS
    ),
    responsable: normalizeText(candidate.responsable),
    medio_socializacion: normalizeAllowedValue(
      candidate.medio_socializacion,
      INDUCCION_ORGANIZACIONAL_SECTION_3_MEDIO_OPTIONS
    ),
    descripcion: normalizeText(candidate.descripcion),
  };
}

function normalizeSection4Row(
  value: unknown
): InduccionOrganizacionalSection4Row {
  const candidate =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const medio = normalizeAllowedValue(
    candidate.medio,
    INDUCCION_ORGANIZACIONAL_SECTION_4_MEDIO_OPTIONS
  );

  return {
    medio,
    recomendacion: medio
      ? getInduccionOrganizacionalRecommendationForMedium(medio)
      : "",
  };
}

export function normalizeInduccionOrganizacionalValues(
  values: Partial<InduccionOrganizacionalValues> | Record<string, unknown>,
  empresa?: Empresa | null
): InduccionOrganizacionalValues {
  const defaults = getDefaultInduccionOrganizacionalValues(empresa);
  const source = values as Partial<InduccionOrganizacionalValues>;
  const section3Source =
    source.section_3 && typeof source.section_3 === "object"
      ? (source.section_3 as Record<string, unknown>)
      : {};

  const section4Source = Array.isArray(source.section_4)
    ? source.section_4
    : [];

  const normalizedSection3 = Object.fromEntries(
    getInduccionOrganizacionalSection3ItemIds().map((itemId) => [
      itemId,
      normalizeSection3Row(section3Source[itemId]),
    ])
  ) as InduccionOrganizacionalValues["section_3"];

  const normalizedSection4 = INDUCCION_ORGANIZACIONAL_SECTION_4_DEFAULT_ROWS.map(
    (_, index) => normalizeSection4Row(section4Source[index])
  );

  return {
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita.trim()
        : defaults.fecha_visita,
    modalidad: normalizeModalidad(source.modalidad, defaults.modalidad),
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa.trim()
        : defaults.nit_empresa,
    vinculado: normalizeInduccionLinkedPerson(source.vinculado),
    section_3: normalizedSection3,
    section_4: normalizedSection4,
    section_5: {
      observaciones:
        typeof source.section_5?.observaciones === "string"
          ? source.section_5.observaciones.trim()
          : "",
    },
    asistentes: normalizePersistedAsistentesForMode(source.asistentes, {
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}
