import {
  ASESOR_AGENCIA_CARGO,
  normalizeAsistenteLike,
  normalizePersonName,
} from "@/lib/asistentes";
import {
  getDefaultFailedVisitAuditFields,
  normalizeFailedVisitAuditValue,
} from "@/lib/failedVisitContract";
import { normalizeModalidad } from "@/lib/modalidad";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  CONDICIONES_VACANTE_BASE_DISCAPACIDADES_ROWS,
  CONDICIONES_VACANTE_CHECKBOX_FIELDS,
  CONDICIONES_VACANTE_COMPETENCIAS_LENGTH,
  CONDICIONES_VACANTE_DEFAULT_NIVEL_CARGO,
  CONDICIONES_VACANTE_EXPERIENCIA_MESES_OPTIONS,
  CONDICIONES_VACANTE_GENERO_OPTIONS,
  CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  CONDICIONES_VACANTE_HORARIOS_ASIGNADOS_OPTIONS,
  CONDICIONES_VACANTE_NIVEL_CARGO_OPTIONS,
  CONDICIONES_VACANTE_OPTION_FIELDS,
  CONDICIONES_VACANTE_REQUIERE_CERTIFICADO_OPTIONS,
  CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  CONDICIONES_VACANTE_TEXT_FIELDS,
  CONDICIONES_VACANTE_TIEMPO_ALMUERZO_OPTIONS,
  CONDICIONES_VACANTE_TIEMPO_OPTIONS,
  CONDICIONES_VACANTE_TIPO_CONTRATO_OPTIONS,
  CONDICIONES_VACANTE_BREAK_DESCANSO_OPTIONS,
  CONDICIONES_VACANTE_FRECUENCIA_OPTIONS,
  type CondicionesVacanteDiscapacidadRow,
  type CondicionesVacanteValues,
} from "@/lib/validations/condicionesVacante";

export type CondicionesVacanteCatalogs = {
  disabilityDescriptions?: Record<string, string>;
  disabilityOptions?: string[];
};

/**
 * Texto institucional fijo que siempre debe aparecer en el campo
 * "Herramientas, equipos e implementos a utilizar". El campo se renderiza como
 * read-only en la UI y se reescribe a esta constante en cada normalizacion para
 * que llegue intacto a la finalizacion (Sheet + payload), sin importar lo que
 * traiga un draft viejo o lo que intente meter el usuario.
 */
export const CONDICIONES_VACANTE_HERRAMIENTAS_EQUIPOS_TEXT =
  "Las asignadas para el cumplimiento de funciones propias del cargo";

// Texto institucional sembrado en "Observaciones / recomendaciones" al abrir un
// formulario nuevo. Es el mismo bloque que el preset "Proceso vacante" venia
// insertando bajo demanda; profesionales reportan que casi siempre lo querian
// asi, por lo que ahora arranca pre-poblado y permanece editable (pueden borrar
// o ajustar el ultimo renglon de discapacidades compatibles segun el caso).
export const CONDICIONES_VACANTE_OBSERVACIONES_RECOMENDACIONES_TEXT = `- La empresa deberá realizar el proceso de retroalimentación de los candidatos entrevistados a la Agencia Compensar siempre en con copia a RECA, indicando quiénes continúan o no en el proceso; en caso de requerir más hojas de vida, deberá informarlo oportunamente vía correo electrónico.
- Se brindará acompañamiento desde RECA durante las etapas de selección, contratación, inducción organizacional y operativa, así como en los seguimientos correspondientes.
- La empresa deberá dar el visto bueno al perfil levantado en conjunto con el asesor de la Agencia y RECA. Una vez reciba el correo de RECA, deberá otorgar la aprobación para que la Agencia publique la vacante y realice el envío de candidatos dentro de los tiempos establecidos en la reunión con el asesor.
- La empresa recibirá, por parte de la Agencia Compensar, la remisión de los candidatos preseleccionados para dar inicio a los procesos de selección correspondientes.
- Es importante resaltar que no se remitirá el certificado de discapacidad de los candidatos por parte de la Agencia.

El presente perfil describe los tipos de discapacidad que, tras el análisis de las funciones del cargo, el entorno de trabajo, los factores de riesgo y las demandas propias del rol, se consideran compatibles para la vinculación laboral de personas con discapacidad, bajo un enfoque de inclusión social y laboral.

El cargo es compatible con personas con discapacidad hipoacusia, auditiva, intelectual y baja visión.`;

const CONDICIONES_VACANTE_MOJIBAKE_ALIASES: Record<string, string> = {
  "SÃ­": "Sí",
  "En TrÃ¡mite": "En Trámite",
  "TÃ©rmino Fijo.": "Término Fijo.",
  "TÃ©rmino Indefinido.": "Término Indefinido.",
  "PrestaciÃ³n de Servicios.": "Prestación de Servicios.",
  "TÃ©rmino Indefinido con ClÃ¡usula presuntiva.":
    "Término Indefinido con Cláusula presuntiva.",
  "EspecializaciÃ³n": "Especialización",
  "TÃ©cnico Profesional": "Técnico Profesional",
  "TecnÃ³logo": "Tecnólogo",
  "Un aÃ±o.": "Un año.",
  "AÃ±o y medio.": "Año y medio.",
  "Las prÃ¡cticas son vÃ¡lidas como experiencia laboral.":
    "Las prácticas son válidas como experiencia laboral.",
};

export const CONDICIONES_VACANTE_COMPETENCIAS_BY_NIVEL: Record<
  typeof CONDICIONES_VACANTE_NIVEL_CARGO_OPTIONS[number],
  readonly string[]
> = {
  "Administrativo.": [
    "Organización.",
    "Trabajo en equipo.",
    "Proactividad.",
    "Flexibilidad.",
    "Comunicación asertiva.",
    "Resiliencia.",
    "Resolución de problemas.",
    "Gestión del tiempo.",
  ],
  "Operativo.": [
    "Responsabilidad.",
    "Trabajo en equipo.",
    "Flexibilidad.",
    "Comunicación asertiva.",
    "Resolución de problemas.",
    "Proactividad.",
    "Liderazgo.",
    "Honestidad e integridad.",
  ],
  "Servicios.": [
    "Servicio al cliente.",
    "Paciencia.",
    "Comunicación efectiva.",
    "Empatía.",
    "Resolución de problemas.",
    "Responsabilidad.",
    "Trabajo en equipo.",
    "Proactividad.",
  ],
};

export function normalizeCondicionesVacanteCatalogKey(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const patched = CONDICIONES_VACANTE_MOJIBAKE_ALIASES[value.trim()] ?? value.trim();
  if (!patched) {
    return "";
  }

  return patched
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLocaleLowerCase("es-CO")
    .trim();
}

function createOptionNormalizer<const TOptions extends readonly string[]>(
  options: TOptions
) {
  const optionMap = new Map<string, TOptions[number]>();

  options.forEach((option) => {
    optionMap.set(normalizeCondicionesVacanteCatalogKey(option), option);
  });

  return (
    value: unknown,
    fallback: TOptions[number] | ""
  ): TOptions[number] | "" => {
    if (typeof value !== "string") {
      return fallback;
    }

    const patched = CONDICIONES_VACANTE_MOJIBAKE_ALIASES[value.trim()] ?? value.trim();
    if (!patched) {
      return fallback;
    }

    return optionMap.get(normalizeCondicionesVacanteCatalogKey(patched)) ?? fallback;
  };
}

const GENERO_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_GENERO_OPTIONS
);
const NIVEL_CARGO_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_NIVEL_CARGO_OPTIONS
);
const TIPO_CONTRATO_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_TIPO_CONTRATO_OPTIONS
);
const REQUIERE_CERTIFICADO_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_REQUIERE_CERTIFICADO_OPTIONS
);
const HORARIOS_ASIGNADOS_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_HORARIOS_ASIGNADOS_OPTIONS
);
const TIEMPO_ALMUERZO_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_TIEMPO_ALMUERZO_OPTIONS
);
const BREAK_DESCANSO_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_BREAK_DESCANSO_OPTIONS
);
const EXPERIENCIA_MESES_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_EXPERIENCIA_MESES_OPTIONS
);
const HABILIDAD_LEVEL_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS
);
const TIEMPO_NORMALIZER = createOptionNormalizer(CONDICIONES_VACANTE_TIEMPO_OPTIONS);
const FRECUENCIA_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_FRECUENCIA_OPTIONS
);
const RIESGO_LEVEL_NORMALIZER = createOptionNormalizer(
  CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS
);

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeCompanyNitValue(
  value: unknown,
  empresa?: Empresa | null,
  fallback = ""
) {
  const companyNit = empresa?.nit_empresa?.trim();
  if (companyNit) {
    return companyNit;
  }

  const restoredNit = normalizeTextValue(value, fallback).trim();
  return restoredNit || fallback;
}

function normalizeBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLocaleLowerCase("es-CO");
  return ["true", "1", "si", "sí", "x", "checked"].includes(normalized);
}

function buildDisabilityDescriptionLookup(catalogs?: CondicionesVacanteCatalogs) {
  const lookup = new Map<string, string>();

  Object.entries(catalogs?.disabilityDescriptions ?? {}).forEach(
    ([disability, description]) => {
      const normalizedDisability = disability.trim();
      const normalizedDescription = description.trim();
      if (!normalizedDisability || !normalizedDescription) {
        return;
      }

      lookup.set(
        normalizeCondicionesVacanteCatalogKey(normalizedDisability),
        normalizedDescription
      );
    }
  );

  return lookup;
}

function createEmptyDiscapacidadRow(): CondicionesVacanteDiscapacidadRow {
  return {
    discapacidad: "",
    descripcion: "",
  };
}

function normalizeDiscapacidadRow(
  row: unknown,
  descriptionLookup: Map<string, string>
): CondicionesVacanteDiscapacidadRow {
  if (!row || typeof row !== "object") {
    return createEmptyDiscapacidadRow();
  }

  const candidate = row as Record<string, unknown>;
  const discapacidad = normalizeTextValue(candidate.discapacidad).trim();
  if (!discapacidad) {
    return createEmptyDiscapacidadRow();
  }

  const persistedDescription = normalizeTextValue(candidate.descripcion).trim();
  const derivedDescription = discapacidad
    ? descriptionLookup.get(normalizeCondicionesVacanteCatalogKey(discapacidad)) ?? ""
    : "";

  return {
    discapacidad,
    descripcion: derivedDescription || persistedDescription,
  };
}

function normalizeDiscapacidades(
  rows: unknown,
  catalogs?: CondicionesVacanteCatalogs
) {
  const descriptionLookup = buildDisabilityDescriptionLookup(catalogs);
  const normalizedRows = Array.isArray(rows)
    ? rows
        .filter((row) => Boolean(row) && typeof row === "object")
        .map((row) => normalizeDiscapacidadRow(row, descriptionLookup))
    : [];

  if (normalizedRows.length === 0) {
    return Array.from(
      { length: CONDICIONES_VACANTE_BASE_DISCAPACIDADES_ROWS },
      () => createEmptyDiscapacidadRow()
    );
  }

  while (normalizedRows.length < CONDICIONES_VACANTE_BASE_DISCAPACIDADES_ROWS) {
    normalizedRows.push(createEmptyDiscapacidadRow());
  }

  return normalizedRows;
}

function createDefaultCondicionesVacanteAsistentes(
  empresa?: Empresa | null
): CondicionesVacanteValues["asistentes"] {
  return [
    { nombre: empresa?.profesional_asignado ?? "", cargo: "" },
    { nombre: "", cargo: "" },
    { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
  ];
}

function normalizeAdvisorRow(
  row: CondicionesVacanteValues["asistentes"][number]
) {
  return {
    nombre: row.nombre ? normalizePersonName(row.nombre) : "",
    cargo: row.cargo || ASESOR_AGENCIA_CARGO,
  };
}

function normalizeCondicionesVacanteAsistentes(
  asistentes: unknown,
  empresa?: Empresa | null
) {
  const defaults = createDefaultCondicionesVacanteAsistentes(empresa);

  if (!Array.isArray(asistentes)) {
    return defaults;
  }

  const normalizedRows = asistentes
    .filter((row) => Boolean(row) && typeof row === "object")
    .map((row) => normalizeAsistenteLike(row as Record<string, unknown>));

  if (normalizedRows.length === 0) {
    return defaults;
  }

  const [firstRow = defaults[0], ...restRows] = normalizedRows;
  const stabilizedFirstRow = {
    nombre: firstRow.nombre || defaults[0].nombre,
    cargo: firstRow.cargo,
  };

  if (restRows.length === 0) {
    return [stabilizedFirstRow, defaults[1], defaults[2]];
  }

  if (restRows.length === 1) {
    return [stabilizedFirstRow, defaults[1], normalizeAdvisorRow(restRows[0])];
  }

  const middleRows = restRows.slice(0, -1);
  const lastRow = restRows[restRows.length - 1] ?? defaults[2];

  return [
    stabilizedFirstRow,
    ...middleRows,
    normalizeAdvisorRow(lastRow),
  ];
}

export function deriveCondicionesVacanteCompetencias(
  nivelCargo: CondicionesVacanteValues["nivel_cargo"]
): CondicionesVacanteValues["competencias"] {
  const normalizedNivel =
    NIVEL_CARGO_NORMALIZER(nivelCargo, CONDICIONES_VACANTE_DEFAULT_NIVEL_CARGO) ||
    CONDICIONES_VACANTE_DEFAULT_NIVEL_CARGO;

  return CONDICIONES_VACANTE_COMPETENCIAS_BY_NIVEL[
    normalizedNivel as keyof typeof CONDICIONES_VACANTE_COMPETENCIAS_BY_NIVEL
  ].slice(0, CONDICIONES_VACANTE_COMPETENCIAS_LENGTH);
}

function getDefaultOptionFieldValues() {
  return {
    modalidad: "",
    nivel_cargo: CONDICIONES_VACANTE_DEFAULT_NIVEL_CARGO,
    genero: "",
    tipo_contrato: "",
    requiere_certificado: "",
    horarios_asignados: "",
    tiempo_almuerzo: "",
    break_descanso: "",
    experiencia_meses: "",
    lectura: "",
    comprension_lectora: "",
    escritura: "",
    comunicacion_verbal: "",
    razonamiento_logico: "",
    conteo_reporte: "",
    clasificacion_objetos: "",
    velocidad_ejecucion: "",
    concentracion: "",
    memoria: "",
    ubicacion_espacial: "",
    atencion: "",
    agarre: "",
    precision: "",
    digitacion: "",
    agilidad_manual: "",
    coordinacion_ojo_mano: "",
    esfuerzo_fisico: "",
    equilibrio_corporal: "",
    lanzar_objetos: "",
    seguimiento_instrucciones: "",
    resolucion_conflictos: "",
    autonomia_tareas: "",
    trabajo_equipo: "",
    adaptabilidad: "",
    flexibilidad: "",
    comunicacion_asertiva: "",
    manejo_tiempo: "",
    liderazgo: "",
    escucha_activa: "",
    proactividad: "",
    sentado_tiempo: "",
    sentado_frecuencia: "",
    semisentado_tiempo: "",
    semisentado_frecuencia: "",
    de_pie_tiempo: "",
    de_pie_frecuencia: "",
    agachado_tiempo: "",
    agachado_frecuencia: "",
    uso_extremidades_superiores_tiempo: "",
    uso_extremidades_superiores_frecuencia: "",
    ruido: "",
    iluminacion: "",
    temperaturas_externas: "",
    vibraciones: "",
    presion_atmosferica: "",
    radiaciones: "",
    polvos_organicos_inorganicos: "",
    fibras: "",
    liquidos: "",
    gases_vapores: "",
    humos_metalicos: "",
    humos_no_metalicos: "",
    material_particulado: "",
    electrico: "",
    locativo: "",
    accidentes_transito: "",
    publicos: "",
    mecanico: "",
    gestion_organizacional: "",
    caracteristicas_organizacion: "",
    caracteristicas_grupo_social: "",
    condiciones_tarea: "",
    interfase_persona_tarea: "",
    jornada_trabajo: "",
    postura_trabajo: "",
    puesto_trabajo: "",
    movimientos_repetitivos: "",
    manipulacion_cargas: "",
    herramientas_equipos_riesgo: "",
    organizacion_trabajo: "",
  } as const satisfies Pick<
    CondicionesVacanteValues,
    keyof typeof CONDICIONES_VACANTE_OPTION_FIELDS
  >;
}

function normalizeOptionFieldValues(
  source: Partial<CondicionesVacanteValues>
) {
  const defaults = getDefaultOptionFieldValues();

  return {
    modalidad: normalizeModalidad(source.modalidad, defaults.modalidad),
    nivel_cargo: NIVEL_CARGO_NORMALIZER(
      source.nivel_cargo,
      defaults.nivel_cargo
    ),
    genero: GENERO_NORMALIZER(source.genero, defaults.genero),
    tipo_contrato: TIPO_CONTRATO_NORMALIZER(
      source.tipo_contrato,
      defaults.tipo_contrato
    ),
    requiere_certificado: REQUIERE_CERTIFICADO_NORMALIZER(
      source.requiere_certificado,
      defaults.requiere_certificado
    ),
    horarios_asignados: HORARIOS_ASIGNADOS_NORMALIZER(
      source.horarios_asignados,
      defaults.horarios_asignados
    ),
    tiempo_almuerzo: TIEMPO_ALMUERZO_NORMALIZER(
      source.tiempo_almuerzo,
      defaults.tiempo_almuerzo
    ),
    break_descanso: BREAK_DESCANSO_NORMALIZER(
      source.break_descanso,
      defaults.break_descanso
    ),
    experiencia_meses: EXPERIENCIA_MESES_NORMALIZER(
      source.experiencia_meses,
      defaults.experiencia_meses
    ),
    lectura: HABILIDAD_LEVEL_NORMALIZER(source.lectura, defaults.lectura),
    comprension_lectora: HABILIDAD_LEVEL_NORMALIZER(
      source.comprension_lectora,
      defaults.comprension_lectora
    ),
    escritura: HABILIDAD_LEVEL_NORMALIZER(source.escritura, defaults.escritura),
    comunicacion_verbal: HABILIDAD_LEVEL_NORMALIZER(
      source.comunicacion_verbal,
      defaults.comunicacion_verbal
    ),
    razonamiento_logico: HABILIDAD_LEVEL_NORMALIZER(
      source.razonamiento_logico,
      defaults.razonamiento_logico
    ),
    conteo_reporte: HABILIDAD_LEVEL_NORMALIZER(
      source.conteo_reporte,
      defaults.conteo_reporte
    ),
    clasificacion_objetos: HABILIDAD_LEVEL_NORMALIZER(
      source.clasificacion_objetos,
      defaults.clasificacion_objetos
    ),
    velocidad_ejecucion: HABILIDAD_LEVEL_NORMALIZER(
      source.velocidad_ejecucion,
      defaults.velocidad_ejecucion
    ),
    concentracion: HABILIDAD_LEVEL_NORMALIZER(
      source.concentracion,
      defaults.concentracion
    ),
    memoria: HABILIDAD_LEVEL_NORMALIZER(source.memoria, defaults.memoria),
    ubicacion_espacial: HABILIDAD_LEVEL_NORMALIZER(
      source.ubicacion_espacial,
      defaults.ubicacion_espacial
    ),
    atencion: HABILIDAD_LEVEL_NORMALIZER(source.atencion, defaults.atencion),
    agarre: HABILIDAD_LEVEL_NORMALIZER(source.agarre, defaults.agarre),
    precision: HABILIDAD_LEVEL_NORMALIZER(source.precision, defaults.precision),
    digitacion: HABILIDAD_LEVEL_NORMALIZER(
      source.digitacion,
      defaults.digitacion
    ),
    agilidad_manual: HABILIDAD_LEVEL_NORMALIZER(
      source.agilidad_manual,
      defaults.agilidad_manual
    ),
    coordinacion_ojo_mano: HABILIDAD_LEVEL_NORMALIZER(
      source.coordinacion_ojo_mano,
      defaults.coordinacion_ojo_mano
    ),
    esfuerzo_fisico: HABILIDAD_LEVEL_NORMALIZER(
      source.esfuerzo_fisico,
      defaults.esfuerzo_fisico
    ),
    equilibrio_corporal: HABILIDAD_LEVEL_NORMALIZER(
      source.equilibrio_corporal,
      defaults.equilibrio_corporal
    ),
    lanzar_objetos: HABILIDAD_LEVEL_NORMALIZER(
      source.lanzar_objetos,
      defaults.lanzar_objetos
    ),
    seguimiento_instrucciones: HABILIDAD_LEVEL_NORMALIZER(
      source.seguimiento_instrucciones,
      defaults.seguimiento_instrucciones
    ),
    resolucion_conflictos: HABILIDAD_LEVEL_NORMALIZER(
      source.resolucion_conflictos,
      defaults.resolucion_conflictos
    ),
    autonomia_tareas: HABILIDAD_LEVEL_NORMALIZER(
      source.autonomia_tareas,
      defaults.autonomia_tareas
    ),
    trabajo_equipo: HABILIDAD_LEVEL_NORMALIZER(
      source.trabajo_equipo,
      defaults.trabajo_equipo
    ),
    adaptabilidad: HABILIDAD_LEVEL_NORMALIZER(
      source.adaptabilidad,
      defaults.adaptabilidad
    ),
    flexibilidad: HABILIDAD_LEVEL_NORMALIZER(
      source.flexibilidad,
      defaults.flexibilidad
    ),
    comunicacion_asertiva: HABILIDAD_LEVEL_NORMALIZER(
      source.comunicacion_asertiva,
      defaults.comunicacion_asertiva
    ),
    manejo_tiempo: HABILIDAD_LEVEL_NORMALIZER(
      source.manejo_tiempo,
      defaults.manejo_tiempo
    ),
    liderazgo: HABILIDAD_LEVEL_NORMALIZER(
      source.liderazgo,
      defaults.liderazgo
    ),
    escucha_activa: HABILIDAD_LEVEL_NORMALIZER(
      source.escucha_activa,
      defaults.escucha_activa
    ),
    proactividad: HABILIDAD_LEVEL_NORMALIZER(
      source.proactividad,
      defaults.proactividad
    ),
    sentado_tiempo: TIEMPO_NORMALIZER(
      source.sentado_tiempo,
      defaults.sentado_tiempo
    ),
    sentado_frecuencia: FRECUENCIA_NORMALIZER(
      source.sentado_frecuencia,
      defaults.sentado_frecuencia
    ),
    semisentado_tiempo: TIEMPO_NORMALIZER(
      source.semisentado_tiempo,
      defaults.semisentado_tiempo
    ),
    semisentado_frecuencia: FRECUENCIA_NORMALIZER(
      source.semisentado_frecuencia,
      defaults.semisentado_frecuencia
    ),
    de_pie_tiempo: TIEMPO_NORMALIZER(
      source.de_pie_tiempo,
      defaults.de_pie_tiempo
    ),
    de_pie_frecuencia: FRECUENCIA_NORMALIZER(
      source.de_pie_frecuencia,
      defaults.de_pie_frecuencia
    ),
    agachado_tiempo: TIEMPO_NORMALIZER(
      source.agachado_tiempo,
      defaults.agachado_tiempo
    ),
    agachado_frecuencia: FRECUENCIA_NORMALIZER(
      source.agachado_frecuencia,
      defaults.agachado_frecuencia
    ),
    uso_extremidades_superiores_tiempo: TIEMPO_NORMALIZER(
      source.uso_extremidades_superiores_tiempo,
      defaults.uso_extremidades_superiores_tiempo
    ),
    uso_extremidades_superiores_frecuencia: FRECUENCIA_NORMALIZER(
      source.uso_extremidades_superiores_frecuencia,
      defaults.uso_extremidades_superiores_frecuencia
    ),
    ruido: RIESGO_LEVEL_NORMALIZER(source.ruido, defaults.ruido),
    iluminacion: RIESGO_LEVEL_NORMALIZER(
      source.iluminacion,
      defaults.iluminacion
    ),
    temperaturas_externas: RIESGO_LEVEL_NORMALIZER(
      source.temperaturas_externas,
      defaults.temperaturas_externas
    ),
    vibraciones: RIESGO_LEVEL_NORMALIZER(
      source.vibraciones,
      defaults.vibraciones
    ),
    presion_atmosferica: RIESGO_LEVEL_NORMALIZER(
      source.presion_atmosferica,
      defaults.presion_atmosferica
    ),
    radiaciones: RIESGO_LEVEL_NORMALIZER(
      source.radiaciones,
      defaults.radiaciones
    ),
    polvos_organicos_inorganicos: RIESGO_LEVEL_NORMALIZER(
      source.polvos_organicos_inorganicos,
      defaults.polvos_organicos_inorganicos
    ),
    fibras: RIESGO_LEVEL_NORMALIZER(source.fibras, defaults.fibras),
    liquidos: RIESGO_LEVEL_NORMALIZER(source.liquidos, defaults.liquidos),
    gases_vapores: RIESGO_LEVEL_NORMALIZER(
      source.gases_vapores,
      defaults.gases_vapores
    ),
    humos_metalicos: RIESGO_LEVEL_NORMALIZER(
      source.humos_metalicos,
      defaults.humos_metalicos
    ),
    humos_no_metalicos: RIESGO_LEVEL_NORMALIZER(
      source.humos_no_metalicos,
      defaults.humos_no_metalicos
    ),
    material_particulado: RIESGO_LEVEL_NORMALIZER(
      source.material_particulado,
      defaults.material_particulado
    ),
    electrico: RIESGO_LEVEL_NORMALIZER(source.electrico, defaults.electrico),
    locativo: RIESGO_LEVEL_NORMALIZER(source.locativo, defaults.locativo),
    accidentes_transito: RIESGO_LEVEL_NORMALIZER(
      source.accidentes_transito,
      defaults.accidentes_transito
    ),
    publicos: RIESGO_LEVEL_NORMALIZER(source.publicos, defaults.publicos),
    mecanico: RIESGO_LEVEL_NORMALIZER(source.mecanico, defaults.mecanico),
    gestion_organizacional: RIESGO_LEVEL_NORMALIZER(
      source.gestion_organizacional,
      defaults.gestion_organizacional
    ),
    caracteristicas_organizacion: RIESGO_LEVEL_NORMALIZER(
      source.caracteristicas_organizacion,
      defaults.caracteristicas_organizacion
    ),
    caracteristicas_grupo_social: RIESGO_LEVEL_NORMALIZER(
      source.caracteristicas_grupo_social,
      defaults.caracteristicas_grupo_social
    ),
    condiciones_tarea: RIESGO_LEVEL_NORMALIZER(
      source.condiciones_tarea,
      defaults.condiciones_tarea
    ),
    interfase_persona_tarea: RIESGO_LEVEL_NORMALIZER(
      source.interfase_persona_tarea,
      defaults.interfase_persona_tarea
    ),
    jornada_trabajo: RIESGO_LEVEL_NORMALIZER(
      source.jornada_trabajo,
      defaults.jornada_trabajo
    ),
    postura_trabajo: RIESGO_LEVEL_NORMALIZER(
      source.postura_trabajo,
      defaults.postura_trabajo
    ),
    puesto_trabajo: RIESGO_LEVEL_NORMALIZER(
      source.puesto_trabajo,
      defaults.puesto_trabajo
    ),
    movimientos_repetitivos: RIESGO_LEVEL_NORMALIZER(
      source.movimientos_repetitivos,
      defaults.movimientos_repetitivos
    ),
    manipulacion_cargas: RIESGO_LEVEL_NORMALIZER(
      source.manipulacion_cargas,
      defaults.manipulacion_cargas
    ),
    herramientas_equipos_riesgo: RIESGO_LEVEL_NORMALIZER(
      source.herramientas_equipos_riesgo,
      defaults.herramientas_equipos_riesgo
    ),
    organizacion_trabajo: RIESGO_LEVEL_NORMALIZER(
      source.organizacion_trabajo,
      defaults.organizacion_trabajo
    ),
  } satisfies Pick<
    CondicionesVacanteValues,
    keyof typeof CONDICIONES_VACANTE_OPTION_FIELDS
  >;
}

export function getDefaultCondicionesVacanteValues(
  empresa?: Empresa | null,
  catalogs?: CondicionesVacanteCatalogs
): CondicionesVacanteValues {
  const nivelCargo = CONDICIONES_VACANTE_DEFAULT_NIVEL_CARGO;
  const checkboxFields = Object.fromEntries(
    CONDICIONES_VACANTE_CHECKBOX_FIELDS.map((fieldId) => [fieldId, false])
  ) as Pick<
    CondicionesVacanteValues,
    (typeof CONDICIONES_VACANTE_CHECKBOX_FIELDS)[number]
  >;

  return {
    ...getDefaultFailedVisitAuditFields(),
    fecha_visita: "",
    nit_empresa: normalizeCompanyNitValue(undefined, empresa),
    nombre_vacante: "",
    numero_vacantes: "",
    edad: "",
    modalidad_trabajo: "",
    lugar_trabajo: "",
    salario_asignado: "",
    firma_contrato: "",
    aplicacion_pruebas: "",
    beneficios_adicionales: "",
    cargo_flexible_genero: "",
    beneficios_mujeres: "",
    requiere_certificado_observaciones: "",
    especificaciones_formacion: "",
    conocimientos_basicos: "",
    hora_ingreso: "",
    hora_salida: "",
    dias_laborables: "",
    dias_flexibles: "",
    observaciones: "",
    funciones_tareas: "",
    herramientas_equipos: CONDICIONES_VACANTE_HERRAMIENTAS_EQUIPOS_TEXT,
    observaciones_cognitivas: "",
    observaciones_motricidad_fina: "",
    observaciones_motricidad_gruesa: "",
    observaciones_transversales: "",
    observaciones_peligros: "",
    observaciones_recomendaciones:
      CONDICIONES_VACANTE_OBSERVACIONES_RECOMENDACIONES_TEXT,
    ...getDefaultOptionFieldValues(),
    nivel_cargo: nivelCargo,
    ...checkboxFields,
    competencias: deriveCondicionesVacanteCompetencias(nivelCargo),
    discapacidades: normalizeDiscapacidades(undefined, catalogs),
    asistentes: createDefaultCondicionesVacanteAsistentes(empresa),
  } satisfies CondicionesVacanteValues;
}

export function normalizeCondicionesVacanteValues(
  values: Partial<CondicionesVacanteValues> | Record<string, unknown>,
  empresa?: Empresa | null,
  catalogs?: CondicionesVacanteCatalogs
): CondicionesVacanteValues {
  const defaults = getDefaultCondicionesVacanteValues(empresa, catalogs);
  const source = values as Partial<CondicionesVacanteValues>;
  const optionFields = normalizeOptionFieldValues(source);

  const textFields = Object.fromEntries(
    CONDICIONES_VACANTE_TEXT_FIELDS.map((fieldId) => [
      fieldId,
      fieldId === "nit_empresa"
        ? normalizeCompanyNitValue(source[fieldId], empresa, defaults[fieldId])
        : normalizeTextValue(source[fieldId], defaults[fieldId]),
    ])
  ) as Pick<
    CondicionesVacanteValues,
    (typeof CONDICIONES_VACANTE_TEXT_FIELDS)[number]
  >;

  const checkboxFields = Object.fromEntries(
    CONDICIONES_VACANTE_CHECKBOX_FIELDS.map((fieldId) => [
      fieldId,
      normalizeBooleanValue(source[fieldId]),
    ])
  ) as Pick<
    CondicionesVacanteValues,
    (typeof CONDICIONES_VACANTE_CHECKBOX_FIELDS)[number]
  >;

  // El campo de herramientas siempre debe quedar con al menos el texto
  // institucional. Si el usuario lo dejó vacío, se rellena con la constante;
  // si agregó contenido propio, se respeta tal cual lo escribió.
  const herramientasEquiposValue = textFields.herramientas_equipos.trim()
    ? textFields.herramientas_equipos
    : CONDICIONES_VACANTE_HERRAMIENTAS_EQUIPOS_TEXT;

  return {
    ...defaults,
    failed_visit_applied_at: normalizeFailedVisitAuditValue(
      source.failed_visit_applied_at
    ),
    ...textFields,
    ...optionFields,
    ...checkboxFields,
    herramientas_equipos: herramientasEquiposValue,
    competencias: deriveCondicionesVacanteCompetencias(optionFields.nivel_cargo),
    discapacidades: normalizeDiscapacidades(source.discapacidades, catalogs),
    asistentes: normalizeCondicionesVacanteAsistentes(source.asistentes, empresa),
  };
}
