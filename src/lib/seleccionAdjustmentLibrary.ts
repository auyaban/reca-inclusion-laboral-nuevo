export type SeleccionAdjustmentCategoryId =
  | "base_process"
  | "respectful_treatment"
  | "interview_accessibility"
  | "document_accessibility"
  | "selection_tests"
  | "family_context";

export type SeleccionDisabilityProfile =
  | "visual"
  | "auditiva"
  | "autismo"
  | "intelectual"
  | "fisica"
  | "psicosocial"
  | "multiple";

export type SeleccionAdjustmentStatementId =
  | "agency_support"
  | "avoid_stigma"
  | "avoid_origin_question"
  | "notify_process_close"
  | "evaluate_by_role_profile"
  | "respectful_eye_contact"
  | "accessible_interview_space"
  | "alternative_communication"
  | "extra_processing_time"
  | "flexible_interview_format"
  | "clear_direct_questions"
  | "clear_constructive_feedback"
  | "accessible_documents_visual"
  | "structured_interview_path"
  | "comprehension_check_questions"
  | "simple_resume_formats"
  | "tailored_contact_channel"
  | "avoid_visual_graphic_tests"
  | "professional_sign_interpreter"
  | "avoid_interpreted_psychometric_tests"
  | "family_boundaries"
  | "minimize_psychometric_tests";

export type SeleccionRecommendationHelperId =
  | "preparacion_proceso"
  | "trato_respetuoso"
  | "accesibilidad_entrevista"
  | "accesibilidad_documentos"
  | "pruebas_seleccion"
  | "familia_contexto";

export type SeleccionAdjustmentStatement = {
  id: SeleccionAdjustmentStatementId;
  title: string;
  body: string;
  summary: string;
  categoryId: SeleccionAdjustmentCategoryId;
  priority: number;
  isUniversal?: boolean;
  appliesTo?: readonly SeleccionDisabilityProfile[];
  excludes?: readonly SeleccionDisabilityProfile[];
};

export type SeleccionRecommendationHelper = {
  id: SeleccionRecommendationHelperId;
  label: string;
  description: string;
  categoryId: SeleccionAdjustmentCategoryId;
  statementIds: readonly SeleccionAdjustmentStatementId[];
};

export const SELECCION_ADJUSTMENT_CATEGORIES = [
  {
    id: "base_process",
    label: "Base del proceso",
    description:
      "Preparacion del proceso, canales de contacto y organizacion general.",
  },
  {
    id: "respectful_treatment",
    label: "Trato respetuoso",
    description:
      "Lenguaje, enfoque y cierre del proceso desde un trato digno y claro.",
  },
  {
    id: "interview_accessibility",
    label: "Comunicacion y entrevista",
    description:
      "Accesibilidad del espacio, del formato y de la interaccion durante la entrevista.",
  },
  {
    id: "document_accessibility",
    label: "Documentos accesibles",
    description:
      "Ajustes para formatos, lectura y entrega de documentos del proceso.",
  },
  {
    id: "selection_tests",
    label: "Pruebas y evaluacion",
    description:
      "Recomendaciones sobre pruebas psicotecnicas, entrevistas y estrategias de evaluacion.",
  },
  {
    id: "family_context",
    label: "Familia y contexto",
    description:
      "Casos en los que el entorno familiar o social requiere delimitaciones claras.",
  },
] as const satisfies readonly {
  id: SeleccionAdjustmentCategoryId;
  label: string;
  description: string;
}[];

const ALL_SELECTION_PROFILES = [
  "visual",
  "auditiva",
  "autismo",
  "intelectual",
  "fisica",
  "psicosocial",
  "multiple",
] as const satisfies readonly SeleccionDisabilityProfile[];

export const SELECCION_ADJUSTMENT_STATEMENTS: readonly SeleccionAdjustmentStatement[] =
  [
  {
    id: "agency_support",
    title: "Apoyo de la agencia de empleo",
    body:
      "Contactar a la agencia de empleo para el apoyo de adaptacion y organizacion de las pruebas psicotecnicas de la empresa.",
    summary:
      "Activa apoyo externo para adaptar pruebas y ordenar el proceso antes de entrevistar.",
    categoryId: "base_process",
    priority: 10,
    appliesTo: ALL_SELECTION_PROFILES,
  },
  {
    id: "avoid_stigma",
    title: "Evitar estigmas y sesgos",
    body:
      "Evitar el contacto con las Persona conductas, palabras, frases, sentimientos, preconcepciones y estigmas que impiden u obstaculizan el acceso en igualdad de condiciones de las personas con y/o en situacion de discapacidad a los espacios, objetos, servicios y en general a las posibilidades que ofrece la sociedad.",
    summary:
      "Evita expresiones, sesgos y conductas que pongan la discapacidad por encima de la persona.",
    categoryId: "respectful_treatment",
    priority: 20,
    isUniversal: true,
  },
  {
    id: "avoid_origin_question",
    title: "No preguntar por el origen de la discapacidad",
    body:
      "Evitar en el proceso de entrevista preguntar sobre como fue la adquisicion de la Discapacidad.",
    summary:
      "Evita preguntas sobre la adquisicion de la discapacidad que no aportan al perfil del cargo.",
    categoryId: "respectful_treatment",
    priority: 30,
    isUniversal: true,
  },
  {
    id: "notify_process_close",
    title: "Cerrar el proceso con respeto por el tiempo",
    body:
      "Informe a candidatos que no fueron seleccionados sobre la finalizacion del proceso, basandose en sus habilidades residuales individuales, y de esta manera ellos no tienen que esperar y se es respetuoso con su tiempo.",
    summary:
      "Informa el cierre del proceso a quienes no fueron seleccionados para no dejarlos esperando.",
    categoryId: "respectful_treatment",
    priority: 40,
    isUniversal: true,
  },
  {
    id: "evaluate_by_role_profile",
    title: "Evaluar por perfil del cargo",
    body:
      "La evaluacion de desempeno debe ajustarse de acuerdo al perfil del cargo y no enfocarse en la discapacidad  de la persona.",
    summary:
      "La evaluacion debe centrarse en el cargo y no en la discapacidad.",
    categoryId: "respectful_treatment",
    priority: 50,
    isUniversal: true,
  },
  {
    id: "respectful_eye_contact",
    title: "Mantener contacto visual respetuoso",
    body:
      "Mantenga un contacto visual a los ojos de la persona evitando enfocar su discapacidad.",
    summary:
      "Mantiene una interaccion centrada en la persona y no en su condicion.",
    categoryId: "respectful_treatment",
    priority: 60,
    appliesTo: ALL_SELECTION_PROFILES,
    excludes: ["visual"],
  },
  {
    id: "accessible_interview_space",
    title: "Garantizar accesibilidad fisica del lugar",
    body:
      "Asegurese  de que el lugar de la entrevista sea accesible para personas con discapacidad fisica. Esto incluye la disponibilidad de rampas, ascensores o espacios adecuados para sillas de ruedas, si es necesario.",
    summary:
      "Valida rampas, ascensores o circulacion suficiente para movilidad asistida.",
    categoryId: "interview_accessibility",
    priority: 70,
    appliesTo: ["fisica", "multiple"],
  },
  {
    id: "alternative_communication",
    title: "Ofrecer alternativas de comunicacion",
    body:
      "Si el candidato tiene dificultades de comunicacion, ofrece alternativas como permitir el uso de comunicacion por texto, proporcionar un interprete de Lengua de senas si es necesario, o permitir que el candidato responda por escrito.",
    summary:
      "Permite texto, escritura u otras formas de comunicacion si hablar no es el mejor canal.",
    categoryId: "interview_accessibility",
    priority: 80,
    appliesTo: ["auditiva", "autismo", "intelectual", "multiple"],
  },
  {
    id: "extra_processing_time",
    title: "Ofrecer tiempo adicional",
    body:
      "Considera la posibilidad de ofrecer tiempo adicional para completar la entrevista si la discapacidad del candidato afecta su velocidad de procesamiento o comunicacion.",
    summary:
      "Da tiempo adicional cuando la velocidad de procesamiento o comunicacion lo requiera.",
    categoryId: "interview_accessibility",
    priority: 90,
    isUniversal: true,
  },
  {
    id: "flexible_interview_format",
    title: "Flexibilizar el formato de entrevista",
    body:
      "Se flexible en cuanto al formato de la entrevista. Algunas personas pueden necesitar entrevistas en un formato diferente, como entrevistas virtuales, o entrevistas en un entorno menos estimulante para aquellos con sensibilidad sensorial.",
    summary:
      "Ajusta el formato, el canal o el entorno de entrevista si el contexto sensorial lo exige.",
    categoryId: "interview_accessibility",
    priority: 100,
    isUniversal: true,
  },
  {
    id: "clear_direct_questions",
    title: "Usar preguntas claras y directas",
    body:
      "Formula preguntas claras y directas, y se paciente al esperar la respuesta del candidato, evita jergas o frases complicadas que puedan ser dificiles de entender.",
    summary:
      "Reduce jergas y espera la respuesta con paciencia.",
    categoryId: "interview_accessibility",
    priority: 110,
    isUniversal: true,
  },
  {
    id: "clear_constructive_feedback",
    title: "Dar feedback claro y constructivo",
    body:
      "Al proporcionar feedback al candidato, se claro, conciso y constructivo. Destaca sus fortalezas y ofrece sugerencias para mejorar, si es necesario, de una manera que sea util y respetuosa.",
    summary:
      "Comunica resultados y retroalimentacion de forma concreta, util y respetuosa.",
    categoryId: "interview_accessibility",
    priority: 120,
    isUniversal: true,
  },
  {
    id: "accessible_documents_visual",
    title: "Adaptar documentos y apoyos tiflotecnologicos",
    body:
      "Aumentar el tamano de letra, utilizar colores de fondo en el texto, emplear fuentes de facil lectura como lo son Arial o Verdana, adicionalmente proporcionar esos documentos de manera virtual para la utilizacion herramientas tiflotecnologicas.",
    summary:
      "Ajusta tamano de letra, contraste, fuentes y entrega versiones digitales accesibles.",
    categoryId: "document_accessibility",
    priority: 130,
    appliesTo: ["visual", "multiple"],
  },
  {
    id: "structured_interview_path",
    title: "Anticipar el paso a paso",
    body:
      "Realizar una organizacion de la entrevista, de forma que puedan anticipar a los oferentes el paso a paso de lo que se realizara en el proceso y asi logren realizar una organizacion del tiempo y la constancia que necesita en la misma.",
    summary:
      "Explica el paso a paso para que la persona pueda organizar su tiempo y su respuesta.",
    categoryId: "base_process",
    priority: 140,
    isUniversal: true,
  },
  {
    id: "comprehension_check_questions",
    title: "Verificar comprension durante la entrevista",
    body:
      "Realiza preguntas orientadoras que permitan identificar que la informacion esta siendo recibida correctamente por el oferente en el proceso de seleccion.",
    summary:
      "Incluye preguntas de verificacion para asegurar que la informacion se comprendio.",
    categoryId: "interview_accessibility",
    priority: 150,
    appliesTo: ["auditiva", "autismo", "intelectual", "multiple"],
  },
  {
    id: "simple_resume_formats",
    title: "Usar formatos de hoja de vida sencillos",
    body:
      "Promover la aplicacion de formatos para la hoja de vida con disenos sencillos, faciles de diligenciar y a traves de medios accesibles; estos pueden ser virtuales o fisicos.",
    summary:
      "Promueve formatos de hoja de vida simples, legibles y accesibles.",
    categoryId: "base_process",
    priority: 160,
    isUniversal: true,
  },
  {
    id: "tailored_contact_channel",
    title: "Definir el mejor canal de contacto",
    body:
      "Para mantener un contacto directo con los oferentes que han sido preseleccionados, se recomienda evaluar alternativas hasta identificar el mejor canal de comunicacion: contacto telefonico, mensajes de texto, mensajes por chat, correo electronico y en algunos casos a traves de familiares que hayan sido referenciados en la hoja de vida. Los mensajes deben ser precisos y concretos, incluyendo solamente la informacion basica; con frases simples.",
    summary:
      "Ajusta el canal de contacto y usa mensajes breves, concretos y simples.",
    categoryId: "base_process",
    priority: 170,
    isUniversal: true,
  },
  {
    id: "avoid_visual_graphic_tests",
    title: "Evitar pruebas visuales o graficas",
    body:
      "La aplicacion de pruebas de tipo visual y grafico como, por ejemplo: Test de percepcion tematica, Wartegg, Tecnica de dibujo proyectivo HTP por sus siglas en ingles (Casa, Arbol, Persona), Test de la figura Humana no son recomendables para aplicarse en personas con alguna discapacidad visual.",
    summary:
      "Evita pruebas visuales o graficas cuando el proceso involucra discapacidad visual.",
    categoryId: "selection_tests",
    priority: 180,
    appliesTo: ["visual", "multiple"],
  },
  {
    id: "professional_sign_interpreter",
    title: "Contar con interprete profesional de lengua de senas",
    body:
      "Para el caso de procesos de seleccion en el que participen candidatos usuarios de lengua de senas, es clave contar con un servicio de interpretacion profesional y no apoyarse en amigos o familiares de los candidatos que tengan conocimiento.",
    summary:
      "Usa interpretacion profesional y evita apoyarte en familiares o conocidos.",
    categoryId: "interview_accessibility",
    priority: 190,
    appliesTo: ["auditiva", "multiple"],
  },
  {
    id: "avoid_interpreted_psychometric_tests",
    title: "Reemplazar psicotecnicas traducidas a lengua de senas",
    body:
      "No se recomienda hacer interpretacion en lengua de senas de las pruebas psicotecnicas dado que se puede sesgar la informacion que se espera recoger y por ende los resultados. Es preferible reemplazar en este caso, tales tipos de pruebas por el desarrollo de entrevistas por competencias.",
    summary:
      "No traduzcas pruebas psicotecnicas a lengua de senas; cambia la estrategia de evaluacion.",
    categoryId: "selection_tests",
    priority: 200,
    appliesTo: ["auditiva", "multiple"],
  },
  {
    id: "family_boundaries",
    title: "Delimitar la participacion familiar",
    body:
      "En el caso de personas con discapacidad con familias sobreprotectoras, se deben establecer limites claros con estas, restringiendo la participacion de estas durante el proceso de seleccion.",
    summary:
      "Define limites cuando la familia interfiere o sobreprotege el proceso.",
    categoryId: "family_context",
    priority: 210,
    appliesTo: ["autismo", "intelectual", "psicosocial", "multiple"],
  },
  {
    id: "minimize_psychometric_tests",
    title: "Minimizar el uso de pruebas psicotecnicas",
    body:
      "Se recomienda minimizar el uso de pruebas psicotecnicas y reemplazarlas por otras estrategias de seleccion que permitan alcanzar los mismos objetivos. Solo en caso de que lo anterior no sea posible, se sugiere priorizar la aplicacion de pruebas graficas-proyectivas que buscan identificar rasgos de personalidad.",
    summary:
      "Reduce el peso de pruebas psicotecnicas cuando haya alternativas equivalentes de seleccion.",
    categoryId: "selection_tests",
    priority: 220,
    appliesTo: ["autismo", "intelectual", "psicosocial", "multiple"],
  },
  ];

export const SELECCION_RECOMMENDATION_HELPERS = [
  {
    id: "preparacion_proceso",
    label: "Preparacion del proceso",
    description:
      "Incluye apoyo de agencia, orden del proceso, hojas de vida accesibles y canales de contacto.",
    categoryId: "base_process",
    statementIds: [
      "agency_support",
      "structured_interview_path",
      "simple_resume_formats",
      "tailored_contact_channel",
    ],
  },
  {
    id: "trato_respetuoso",
    label: "Trato respetuoso",
    description:
      "Resume sesgos a evitar, preguntas que no deben hacerse y cierre respetuoso del proceso.",
    categoryId: "respectful_treatment",
    statementIds: [
      "avoid_stigma",
      "avoid_origin_question",
      "notify_process_close",
      "evaluate_by_role_profile",
      "respectful_eye_contact",
    ],
  },
  {
    id: "accesibilidad_entrevista",
    label: "Accesibilidad entrevista",
    description:
      "Agrupa espacio accesible, formatos alternativos, tiempos, comunicacion y claridad de entrevista.",
    categoryId: "interview_accessibility",
    statementIds: [
      "accessible_interview_space",
      "alternative_communication",
      "extra_processing_time",
      "flexible_interview_format",
      "clear_direct_questions",
      "clear_constructive_feedback",
      "comprehension_check_questions",
    ],
  },
  {
    id: "accesibilidad_documentos",
    label: "Accesibilidad documentos",
    description:
      "Trae recomendaciones para documentos legibles y compatibles con apoyos visuales.",
    categoryId: "document_accessibility",
    statementIds: ["accessible_documents_visual"],
  },
  {
    id: "pruebas_seleccion",
    label: "Pruebas de seleccion",
    description:
      "Resume restricciones sobre pruebas, uso de interpretes y estrategias alternativas de evaluacion.",
    categoryId: "selection_tests",
    statementIds: [
      "avoid_visual_graphic_tests",
      "professional_sign_interpreter",
      "avoid_interpreted_psychometric_tests",
      "minimize_psychometric_tests",
    ],
  },
  {
    id: "familia_contexto",
    label: "Familia y contexto",
    description:
      "Agrupa recomendaciones sobre limites de participacion familiar cuando el contexto lo exige.",
    categoryId: "family_context",
    statementIds: ["family_boundaries"],
  },
] as const satisfies readonly SeleccionRecommendationHelper[];

type CategoryGroup<TItem extends { categoryId: SeleccionAdjustmentCategoryId }> = {
  category: (typeof SELECCION_ADJUSTMENT_CATEGORIES)[number];
  items: TItem[];
};

const STATEMENTS_BY_ID = new Map(
  SELECCION_ADJUSTMENT_STATEMENTS.map((statement) => [statement.id, statement])
);

const HELPERS_BY_ID = new Map(
  SELECCION_RECOMMENDATION_HELPERS.map((helper) => [helper.id, helper])
);

export function getSeleccionAdjustmentCategory(
  categoryId: SeleccionAdjustmentCategoryId
) {
  return (
    SELECCION_ADJUSTMENT_CATEGORIES.find((category) => category.id === categoryId) ??
    SELECCION_ADJUSTMENT_CATEGORIES[0]
  );
}

export function getSeleccionAdjustmentHelper(
  helperId: SeleccionRecommendationHelperId
) {
  return HELPERS_BY_ID.get(helperId) ?? null;
}

export function getSeleccionAdjustmentStatement(
  statementId: SeleccionAdjustmentStatementId
) {
  return STATEMENTS_BY_ID.get(statementId) ?? null;
}

function normalizeRecommendationBlock(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

export function appendSeleccionRecommendationBlocks(
  currentValue: string,
  blocks: readonly string[]
) {
  const existingValue = normalizeRecommendationBlock(currentValue);
  const uniqueBlocks = blocks
    .map((block) => normalizeRecommendationBlock(block))
    .filter(Boolean);

  if (uniqueBlocks.length === 0) {
    return currentValue;
  }

  const mergedBlocks = [...(existingValue ? [existingValue] : [])];

  uniqueBlocks.forEach((block) => {
    const alreadyExists = mergedBlocks.some((entry) => entry.includes(block));
    if (!alreadyExists) {
      mergedBlocks.push(block);
    }
  });

  return mergedBlocks.join("\n\n");
}

export function appendSeleccionAdjustmentStatements(
  currentValue: string,
  statementIds: readonly SeleccionAdjustmentStatementId[]
) {
  const blocks = statementIds
    .map((statementId) => getSeleccionAdjustmentStatement(statementId)?.body ?? "")
    .filter(Boolean);

  return appendSeleccionRecommendationBlocks(currentValue, blocks);
}

function normalizeDisabilityText(disability: string) {
  return disability
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getSeleccionDisabilityProfilesForValue(
  disability: string
): SeleccionDisabilityProfile[] {
  const normalized = normalizeDisabilityText(disability);

  if (!normalized || normalized === "no aplica") {
    return [] as SeleccionDisabilityProfile[];
  }

  if (normalized.includes("visual")) {
    return ["visual"];
  }

  if (normalized.includes("auditiva")) {
    return ["auditiva"];
  }

  if (normalized === "autismo" || normalized.includes("autis")) {
    return ["autismo"];
  }

  if (normalized.includes("intelectual")) {
    return ["intelectual"];
  }

  if (normalized.includes("fisica")) {
    return ["fisica"];
  }

  if (normalized.includes("psicosocial")) {
    return ["psicosocial"];
  }

  if (normalized.includes("multiple")) {
    return ["multiple"];
  }

  return [] as SeleccionDisabilityProfile[];
}

export function getSeleccionDisabilityProfilesFromRows(
  rows: readonly { discapacidad?: string | null }[]
): SeleccionDisabilityProfile[] {
  const nextProfiles = new Set<SeleccionDisabilityProfile>();

  rows.forEach((row) => {
    if (!row.discapacidad) {
      return;
    }

    getSeleccionDisabilityProfilesForValue(row.discapacidad).forEach((profile) => {
      nextProfiles.add(profile);
    });
  });

  return [...nextProfiles];
}

export function getUniversalSeleccionAdjustmentStatements() {
  return SELECCION_ADJUSTMENT_STATEMENTS.filter(
    (statement) => statement.isUniversal
  );
}

export function getSuggestedSeleccionAdjustmentStatementsByProfiles(
  profiles: readonly SeleccionDisabilityProfile[]
) {
  if (profiles.length === 0) {
    return [] as SeleccionAdjustmentStatement[];
  }

  const profileSet = new Set(profiles);

  return SELECCION_ADJUSTMENT_STATEMENTS.filter((statement) => {
    if (statement.isUniversal || !statement.appliesTo?.length) {
      return false;
    }

    if (
      statement.excludes?.some((excludedProfile) => profileSet.has(excludedProfile))
    ) {
      return false;
    }

    return statement.appliesTo.some((profile) => profileSet.has(profile));
  });
}

export function groupSeleccionHelpersByCategory() {
  return SELECCION_ADJUSTMENT_CATEGORIES.map((category) => ({
    category,
    items: SELECCION_RECOMMENDATION_HELPERS.filter(
      (helper) => helper.categoryId === category.id
    ),
  })).filter((group) => group.items.length > 0);
}

export function groupSeleccionStatementsByCategory(
  statements: readonly SeleccionAdjustmentStatement[]
) {
  return SELECCION_ADJUSTMENT_CATEGORIES.map((category) => ({
    category,
    items: statements.filter((statement) => statement.categoryId === category.id),
  })).filter((group) => group.items.length > 0) as CategoryGroup<SeleccionAdjustmentStatement>[];
}

export function getSeleccionRecommendationHelperPreview(
  helper: SeleccionRecommendationHelper
) {
  return helper.statementIds
    .map((statementId) => getSeleccionAdjustmentStatement(statementId)?.title ?? "")
    .filter(Boolean)
    .join(" | ");
}

export function getSeleccionDisabilityProfileLabel(
  profile: SeleccionDisabilityProfile
) {
  switch (profile) {
    case "visual":
      return "Visual";
    case "auditiva":
      return "Auditiva";
    case "autismo":
      return "TEA";
    case "intelectual":
      return "Intelectual";
    case "fisica":
      return "Fisica";
    case "psicosocial":
      return "Psicosocial";
    case "multiple":
      return "Multiple";
    default:
      return profile;
  }
}

export function getSeleccionAdjustmentStatements() {
  return [...SELECCION_ADJUSTMENT_STATEMENTS];
}

export function getSeleccionAdjustmentHelpers() {
  return [...SELECCION_RECOMMENDATION_HELPERS];
}

export function getSeleccionAdjustmentStatementsByIds(
  statementIds: readonly string[]
) {
  return statementIds
    .map((statementId) =>
      getSeleccionAdjustmentStatement(
        statementId as SeleccionAdjustmentStatementId
      )
    )
    .filter(Boolean) as SeleccionAdjustmentStatement[];
}

export function getSeleccionAdjustmentStatementsByHelperId(
  helperId: SeleccionRecommendationHelperId
) {
  const helper = getSeleccionAdjustmentHelper(helperId);
  if (!helper) {
    return [] as SeleccionAdjustmentStatement[];
  }

  return getSeleccionAdjustmentStatementsByIds(helper.statementIds);
}

export function buildSeleccionAdjustmentBlock(
  statementIds: readonly SeleccionAdjustmentStatementId[]
) {
  return getSeleccionAdjustmentStatementsByIds(statementIds)
    .map((statement) => statement.body.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function buildSeleccionAdjustmentHelperBlock(
  helperId: SeleccionRecommendationHelperId
) {
  const helper = getSeleccionAdjustmentHelper(helperId);
  if (!helper) {
    return "";
  }

  return buildSeleccionAdjustmentBlock(helper.statementIds);
}

export function appendSeleccionAdjustmentHelper(
  currentValue: string,
  helperId: SeleccionRecommendationHelperId
) {
  const helper = getSeleccionAdjustmentHelper(helperId);
  if (!helper) {
    return currentValue;
  }

  return appendSeleccionAdjustmentStatements(currentValue, helper.statementIds);
}
