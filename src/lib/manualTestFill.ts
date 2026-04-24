import type { Empresa } from "@/lib/store/empresaStore";
import { getDefaultCondicionesVacanteValues } from "@/lib/condicionesVacante";
import {
  createEmptyContratacionVinculadoRow,
  getDefaultContratacionValues,
} from "@/lib/contratacion";
import {
  calculateEvaluacionAccessibilitySummary,
  createEmptyEvaluacionValues,
  deriveEvaluacionSection4Description,
  deriveEvaluacionSection5ItemValue,
} from "@/lib/evaluacion";
import {
  EVALUACION_QUESTION_DESCRIPTORS,
  EVALUACION_SECTION_5_ITEMS,
} from "@/lib/evaluacionSections";
import {
  getDefaultInduccionOperativaValues,
  INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_4_BLOCKS,
  INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_5_ROWS,
  type InduccionOperativaValues,
} from "@/lib/induccionOperativa";
import {
  getDefaultInduccionOrganizacionalValues,
  getInduccionOrganizacionalRecommendationForMedium,
  getInduccionOrganizacionalSection3ItemIds,
  type InduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";
import { getDefaultPresentacionValues } from "@/lib/presentacion";
import { createEmptySeleccionOferenteRow, getDefaultSeleccionValues } from "@/lib/seleccion";
import { getDefaultSensibilizacionValues } from "@/lib/sensibilizacion";
import {
  createEmptyInterpreteLscInterpreteRow,
  createEmptyInterpreteLscOferenteRow,
  getDefaultInterpreteLscValues,
} from "@/lib/interpreteLsc";
import {
  CONTRATACION_CAUSALES_OPTIONS,
  CONTRATACION_CERTIFICADO_DISCAPACIDAD_OPTIONS,
  CONTRATACION_CLAUSULAS_OPTIONS,
  CONTRATACION_COMPRENDE_CONTRATO_OPTIONS,
  CONTRATACION_CONDICIONES_SALARIALES_OPTIONS,
  CONTRATACION_CONDUCTO_REGULAR_OPTIONS,
  CONTRATACION_DESCARGOS_OPTIONS,
  CONTRATACION_DISCAPACIDAD_OPTIONS,
  CONTRATACION_FORMA_PAGO_OPTIONS,
  CONTRATACION_FRECUENCIA_PAGO_OPTIONS,
  CONTRATACION_GENERO_OPTIONS,
  CONTRATACION_GRUPO_ETNICO_CUAL_OPTIONS,
  CONTRATACION_GRUPO_ETNICO_OPTIONS,
  CONTRATACION_JORNADA_OPTIONS,
  CONTRATACION_LECTURA_CONTRATO_OPTIONS,
  CONTRATACION_LGTBIQ_OPTIONS,
  CONTRATACION_NIVEL_APOYO_OPTIONS,
  CONTRATACION_PERMISOS_OPTIONS,
  CONTRATACION_PRESTACIONES_OPTIONS,
  CONTRATACION_RUTAS_OPTIONS,
  CONTRATACION_TIPO_CONTRATO_FIRMADO_OPTIONS,
  CONTRATACION_TIPO_CONTRATO_OBSERVACION_OPTIONS,
  CONTRATACION_TIPO_CONTRATO_OPTIONS,
  CONTRATACION_TRAMITES_OPTIONS,
  type ContratacionValues,
  type ContratacionVinculadoFieldId,
} from "@/lib/validations/contratacion";
import {
  SELECCION_OFERENTE_FIELDS,
  type SeleccionOferenteFieldId,
  type SeleccionValues,
} from "@/lib/validations/seleccion";
import {
  type PresentacionValues,
  MOTIVACION_OPTIONS,
} from "@/lib/validations/presentacion";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";
import type { SensibilizacionValues } from "@/lib/validations/sensibilizacion";
import {
  CONDICIONES_VACANTE_CHECKBOX_FIELDS,
  CONDICIONES_VACANTE_OPTION_FIELDS,
  CONDICIONES_VACANTE_TEXT_FIELDS,
  type CondicionesVacanteValues,
} from "@/lib/validations/condicionesVacante";

const MANUAL_TEST_FILL_TIME_ZONE = "America/Bogota";

const MANUAL_TEST_FILL_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANUAL_TEST_FILL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getManualTestFillDate(now = new Date()) {
  const overrideDate =
    process.env.MANUAL_TEST_FILL_DATE?.trim() ||
    process.env.NEXT_PUBLIC_MANUAL_TEST_FILL_DATE?.trim();

  return overrideDate || MANUAL_TEST_FILL_DATE_FORMATTER.format(now);
}

const CONTRATACION_SELECT_FIELD_OPTIONS: Partial<
  Record<Exclude<ContratacionVinculadoFieldId, "numero">, readonly string[]>
> = {
  discapacidad: CONTRATACION_DISCAPACIDAD_OPTIONS,
  genero: CONTRATACION_GENERO_OPTIONS,
  lgtbiq: CONTRATACION_LGTBIQ_OPTIONS,
  grupo_etnico: CONTRATACION_GRUPO_ETNICO_OPTIONS,
  grupo_etnico_cual: CONTRATACION_GRUPO_ETNICO_CUAL_OPTIONS,
  certificado_discapacidad: CONTRATACION_CERTIFICADO_DISCAPACIDAD_OPTIONS,
  tipo_contrato: CONTRATACION_TIPO_CONTRATO_FIRMADO_OPTIONS,
  contrato_lee_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  contrato_lee_observacion: CONTRATACION_LECTURA_CONTRATO_OPTIONS,
  contrato_comprendido_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  contrato_comprendido_observacion: CONTRATACION_COMPRENDE_CONTRATO_OPTIONS,
  contrato_tipo_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  contrato_tipo_observacion: CONTRATACION_TIPO_CONTRATO_OBSERVACION_OPTIONS,
  contrato_tipo_contrato: CONTRATACION_TIPO_CONTRATO_OPTIONS,
  contrato_jornada: CONTRATACION_JORNADA_OPTIONS,
  contrato_clausulas: CONTRATACION_CLAUSULAS_OPTIONS,
  condiciones_salariales_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  condiciones_salariales_observacion:
    CONTRATACION_CONDICIONES_SALARIALES_OPTIONS,
  condiciones_salariales_frecuencia_pago: CONTRATACION_FRECUENCIA_PAGO_OPTIONS,
  condiciones_salariales_forma_pago: CONTRATACION_FORMA_PAGO_OPTIONS,
  prestaciones_cesantias_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_cesantias_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_auxilio_transporte_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_auxilio_transporte_observacion:
    CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_prima_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_prima_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_seguridad_social_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_seguridad_social_observacion:
    CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_vacaciones_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_vacaciones_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_auxilios_beneficios_nivel_apoyo:
    CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_auxilios_beneficios_observacion:
    CONTRATACION_PRESTACIONES_OPTIONS,
  conducto_regular_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  conducto_regular_observacion: CONTRATACION_CONDUCTO_REGULAR_OPTIONS,
  descargos_observacion: CONTRATACION_DESCARGOS_OPTIONS,
  tramites_observacion: CONTRATACION_TRAMITES_OPTIONS,
  permisos_observacion: CONTRATACION_PERMISOS_OPTIONS,
  causales_fin_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  causales_fin_observacion: CONTRATACION_CAUSALES_OPTIONS,
  rutas_atencion_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  rutas_atencion_observacion: CONTRATACION_RUTAS_OPTIONS,
};

function getRowCount(rows: unknown[] | undefined) {
  return Math.max(1, Array.isArray(rows) ? rows.length : 1);
}

function getFirstOption(options: readonly string[] | undefined) {
  return options?.find((option) => option.trim()) ?? "";
}

function buildTestAttendees(
  empresa: Pick<Empresa, "profesional_asignado" | "contacto_empresa" | "cargo"> | null
) {
  return [
    {
      nombre: empresa?.profesional_asignado?.trim() || "Profesional RECA",
      cargo: "Profesional RECA",
    },
    {
      nombre: empresa?.contacto_empresa?.trim() || "Contacto Empresa",
      cargo: empresa?.cargo?.trim() || "Contacto",
    },
  ];
}

function buildPresentacionTestAttendees(
  empresa: Pick<Empresa, "profesional_asignado" | "contacto_empresa"> | null
) {
  return [
    {
      nombre: empresa?.profesional_asignado?.trim() || "Profesional RECA",
      cargo: "Profesional RECA",
    },
    {
      nombre: empresa?.contacto_empresa?.trim() || "Asesor Agencia",
      cargo: "Asesor Agencia",
    },
  ];
}

function getManualCondicionesVacanteTextValue(
  fieldId: (typeof CONDICIONES_VACANTE_TEXT_FIELDS)[number],
  empresa: Empresa | null
) {
  switch (fieldId) {
    case "fecha_visita":
      return getManualTestFillDate();
    case "nit_empresa":
      return empresa?.nit_empresa ?? "";
    case "nombre_vacante":
      return "Auxiliar de apoyo inclusivo";
    case "numero_vacantes":
      return "2";
    case "edad":
      return "18 a 45 anos";
    case "modalidad_trabajo":
      return "Presencial";
    case "lugar_trabajo":
      return "Bogota";
    case "salario_asignado":
      return "1423500";
    case "firma_contrato":
      return "Sede principal";
    case "aplicacion_pruebas":
      return "Entrevista y validacion de funciones";
    case "beneficios_adicionales":
      return "Ruta y alimentacion";
    case "cargo_flexible_genero":
      return "Sin restriccion";
    case "beneficios_mujeres":
      return "Aplican politicas internas de bienestar";
    case "requiere_certificado_observaciones":
      return "Puede presentarse durante el proceso";
    case "especificaciones_formacion":
      return "Bachiller culminado";
    case "conocimientos_basicos":
      return "Manejo basico de herramientas ofimaticas";
    case "hora_ingreso":
      return "08:00";
    case "hora_salida":
      return "17:00";
    case "dias_laborables":
      return "Lunes a viernes";
    case "dias_flexibles":
      return "No aplica";
    case "observaciones":
      return "Vacante de prueba diligenciada para QA.";
    case "funciones_tareas":
      return "Apoyo operativo, registro de informacion y seguimiento basico.";
    case "herramientas_equipos":
      return "Computador, telefono y material de oficina.";
    case "observaciones_cognitivas":
      return "Las demandas cognitivas son moderadas.";
    case "observaciones_motricidad_fina":
      return "Se requiere digitacion y precision basica.";
    case "observaciones_motricidad_gruesa":
      return "No hay exigencias fisicas altas.";
    case "observaciones_transversales":
      return "Se prioriza comunicacion y trabajo en equipo.";
    case "observaciones_peligros":
      return "No se identifican peligros criticos.";
    case "observaciones_recomendaciones":
      return "Se recomienda induccion gradual y ajustes razonables basicos.";
    default:
      return "Dato de prueba";
  }
}

function getManualCondicionesVacanteOptionValue(
  fieldId: keyof typeof CONDICIONES_VACANTE_OPTION_FIELDS
) {
  const options = CONDICIONES_VACANTE_OPTION_FIELDS[fieldId];
  return getFirstOption(options);
}

function buildSeleccionTestRow(index: number) {
  const row = createEmptySeleccionOferenteRow();

  for (const field of SELECCION_OFERENTE_FIELDS) {
    const fieldId = field.id as SeleccionOferenteFieldId;

    if (fieldId === "numero") {
      row[fieldId] = String(index + 1);
      continue;
    }

    if (field.kind === "lista") {
      row[fieldId] = getFirstOption(field.options);
      continue;
    }

    switch (fieldId) {
      case "nombre_oferente":
        row[fieldId] = `Oferente Test ${index + 1}`;
        break;
      case "cedula":
        row[fieldId] = String(100000000 + index);
        break;
      case "certificado_porcentaje":
        row[fieldId] = "45%";
        break;
      case "telefono_oferente":
      case "telefono_emergencia":
        row[fieldId] = `30000000${String(index).padStart(2, "0")}`;
        break;
      case "nombre_contacto_emergencia":
        row[fieldId] = `Contacto Test ${index + 1}`;
        break;
      case "parentesco":
        row[fieldId] = "Hermano";
        break;
      case "fecha_nacimiento":
        row[fieldId] = "1990-01-01";
        break;
      case "edad":
        row[fieldId] = "35";
        break;
      case "lugar_firma_contrato":
        row[fieldId] = "Bogota";
        break;
      case "fecha_firma_contrato":
        row[fieldId] = getManualTestFillDate();
        break;
      default:
        row[fieldId] = fieldId.endsWith("_nota") ? "Sin novedad" : "Dato de prueba";
        break;
    }
  }

  return row;
}

function buildContratacionTestRow(index: number) {
  const row = createEmptyContratacionVinculadoRow();

  (
    Object.keys(row) as readonly ContratacionVinculadoFieldId[]
  ).forEach((fieldId) => {
    if (fieldId === "numero") {
      row[fieldId] = String(index + 1);
      return;
    }

    const selectOptions = CONTRATACION_SELECT_FIELD_OPTIONS[fieldId];
    if (selectOptions) {
      row[fieldId] = getFirstOption(selectOptions);
      return;
    }

    switch (fieldId) {
      case "nombre_oferente":
        row[fieldId] = `Vinculado Test ${index + 1}`;
        break;
      case "cedula":
        row[fieldId] = String(200000000 + index);
        break;
      case "certificado_porcentaje":
        row[fieldId] = "45%";
        break;
      case "telefono_oferente":
      case "telefono_emergencia":
        row[fieldId] = `31000000${String(index).padStart(2, "0")}`;
        break;
      case "correo_oferente":
        row[fieldId] = `vinculado${index + 1}@test.com`;
        break;
      case "fecha_nacimiento":
        row[fieldId] = "1992-01-01";
        break;
      case "edad":
        row[fieldId] = "33";
        break;
      case "cargo_oferente":
        row[fieldId] = "Auxiliar";
        break;
      case "contacto_emergencia":
        row[fieldId] = `Contacto Test ${index + 1}`;
        break;
      case "parentesco":
        row[fieldId] = "Hermano";
        break;
      case "lugar_firma_contrato":
        row[fieldId] = "Bogota";
        break;
      case "fecha_firma_contrato":
      case "fecha_fin":
        row[fieldId] = getManualTestFillDate();
        break;
      default:
        row[fieldId] = fieldId.endsWith("_nota") ? "Sin novedad" : "Dato de prueba";
        break;
    }
  });

  return row;
}

export function isManualTestFillEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
  );
}

export function buildSeleccionManualTestValues(
  empresa: Empresa | null,
  currentValues?: SeleccionValues
) {
  const defaults = getDefaultSeleccionValues(empresa);
  const rowCount = getRowCount(currentValues?.oferentes);

  return {
    ...defaults,
    fecha_visita: getManualTestFillDate(),
    modalidad: "Presencial" as const,
    nit_empresa: empresa?.nit_empresa ?? defaults.nit_empresa,
    desarrollo_actividad:
      "Actividad de prueba diligenciada para validacion manual del formulario.",
    ajustes_recomendaciones:
      "Ajustes de prueba diligenciados automaticamente para validar el flujo.",
    nota: "Nota de prueba.",
    oferentes: Array.from({ length: rowCount }, (_, index) =>
      buildSeleccionTestRow(index)
    ),
    asistentes: buildTestAttendees(empresa),
  } satisfies SeleccionValues;
}

export function buildPresentacionManualTestValues(empresa: Empresa | null) {
  const defaults = getDefaultPresentacionValues(empresa);

  return {
    ...defaults,
    fecha_visita: getManualTestFillDate(),
    modalidad: "Presencial" as const,
    nit_empresa: empresa?.nit_empresa ?? defaults.nit_empresa,
    motivacion: [MOTIVACION_OPTIONS[0]],
    acuerdos_observaciones:
      "Acta de prueba diligenciada para validar el flujo de publicacion.",
    asistentes: buildPresentacionTestAttendees(empresa),
  } satisfies PresentacionValues;
}

export function buildSensibilizacionManualTestValues(empresa: Empresa | null) {
  const defaults = getDefaultSensibilizacionValues(empresa);

  return {
    ...defaults,
    fecha_visita: getManualTestFillDate(),
    modalidad: "Presencial" as const,
    nit_empresa: empresa?.nit_empresa ?? defaults.nit_empresa,
    observaciones:
      "Observaciones de prueba diligenciadas para validar el cierre del acta.",
    asistentes: buildTestAttendees(empresa),
  } satisfies SensibilizacionValues;
}

export function buildInterpreteLscManualTestValues(
  empresa: Empresa | null,
  currentValues?: InterpreteLscValues
) {
  const defaults = getDefaultInterpreteLscValues(empresa);
  const oferentesCount = Math.max(1, currentValues?.oferentes?.length ?? 1);
  const interpretesCount = Math.max(1, currentValues?.interpretes?.length ?? 1);

  return {
    ...defaults,
    fecha_visita: getManualTestFillDate(),
    modalidad_interprete: "Presencial" as const,
    modalidad_profesional_reca: "Presencial" as const,
    nit_empresa: empresa?.nit_empresa ?? defaults.nit_empresa,
    oferentes: Array.from({ length: oferentesCount }, (_, index) => ({
      ...createEmptyInterpreteLscOferenteRow(),
      nombre_oferente: `Oferente LSC ${index + 1}`,
      cedula: String(50000000 + index),
      proceso: index % 2 === 0 ? "Seleccion" : "Contratacion",
    })),
    interpretes: Array.from({ length: interpretesCount }, (_, index) => ({
      ...createEmptyInterpreteLscInterpreteRow(),
      nombre: `Interprete LSC ${index + 1}`,
      hora_inicial: index % 2 === 0 ? "08:00" : "13:00",
      hora_final: index % 2 === 0 ? "10:00" : "15:30",
      total_tiempo: index % 2 === 0 ? "2:00" : "2:30",
    })),
    sabana: { activo: true, horas: 1.5 },
    sumatoria_horas: "0:00",
    asistentes: buildTestAttendees(empresa),
  } satisfies InterpreteLscValues;
}

export function buildCondicionesVacanteManualTestValues(
  empresa: Empresa | null
) {
  const defaults = getDefaultCondicionesVacanteValues(empresa);
  const textFields = Object.fromEntries(
    CONDICIONES_VACANTE_TEXT_FIELDS.map((fieldId) => [
      fieldId,
      getManualCondicionesVacanteTextValue(fieldId, empresa),
    ])
  ) as Pick<
    CondicionesVacanteValues,
    (typeof CONDICIONES_VACANTE_TEXT_FIELDS)[number]
  >;
  const optionFields = Object.fromEntries(
    Object.keys(CONDICIONES_VACANTE_OPTION_FIELDS).map((fieldId) => [
      fieldId,
      getManualCondicionesVacanteOptionValue(
        fieldId as keyof typeof CONDICIONES_VACANTE_OPTION_FIELDS
      ),
    ])
  ) as Pick<
    CondicionesVacanteValues,
    keyof typeof CONDICIONES_VACANTE_OPTION_FIELDS
  >;
  const checkboxFields = Object.fromEntries(
    CONDICIONES_VACANTE_CHECKBOX_FIELDS.map((fieldId) => [
      fieldId,
      fieldId === "nivel_bachiller",
    ])
  ) as Pick<
    CondicionesVacanteValues,
    (typeof CONDICIONES_VACANTE_CHECKBOX_FIELDS)[number]
  >;

  return {
    ...defaults,
    ...textFields,
    ...optionFields,
    ...checkboxFields,
    competencias: defaults.competencias,
    discapacidades: [
      {
        discapacidad: "Auditiva",
        descripcion: "Compatible con apoyos de comunicacion basicos.",
      },
      ...defaults.discapacidades.slice(1),
    ],
    asistentes: [
      {
        nombre: empresa?.profesional_asignado?.trim() || "Profesional RECA",
        cargo: "Profesional RECA",
      },
      {
        nombre: empresa?.contacto_empresa?.trim() || "Contacto Empresa",
        cargo: empresa?.cargo?.trim() || "Talento Humano",
      },
      {
        nombre: "Asesor Agencia",
        cargo: "Asesor Agencia",
      },
    ],
  } satisfies CondicionesVacanteValues;
}

export function buildContratacionManualTestValues(
  empresa: Empresa | null,
  currentValues?: ContratacionValues
) {
  const defaults = getDefaultContratacionValues(empresa);
  const rowCount = getRowCount(currentValues?.vinculados);

  return {
    ...defaults,
    fecha_visita: getManualTestFillDate(),
    modalidad: "Presencial" as const,
    nit_empresa: empresa?.nit_empresa ?? defaults.nit_empresa,
    desarrollo_actividad:
      "Actividad de prueba diligenciada para validacion manual del formulario.",
    ajustes_recomendaciones:
      "Ajustes de prueba diligenciados automaticamente para validar el flujo.",
    vinculados: Array.from({ length: rowCount }, (_, index) =>
      buildContratacionTestRow(index)
    ),
    asistentes: buildTestAttendees(empresa),
  } satisfies ContratacionValues;
}

export function buildEvaluacionManualTestValues(empresa: Empresa | null) {
  const values = createEmptyEvaluacionValues(empresa);

  values.fecha_visita = getManualTestFillDate();
  values.modalidad = "Presencial";
  values.nit_empresa = empresa?.nit_empresa ?? values.nit_empresa;

  // Ensure derived empresa fields have fallback test values so validation passes
  // even when the empresa record has optional fields unfilled.
  if (!values.nombre_empresa) values.nombre_empresa = empresa?.nombre_empresa?.trim() || "Empresa de Prueba";
  if (!values.direccion_empresa) values.direccion_empresa = "Calle 100 # 20-30";
  if (!values.correo_1) values.correo_1 = "contacto@empresaprueba.co";
  if (!values.contacto_empresa) values.contacto_empresa = empresa?.contacto_empresa?.trim() || "Contacto Empresa";
  if (!values.caja_compensacion) values.caja_compensacion = "Compensar";
  if (!values.asesor) values.asesor = empresa?.asesor?.trim() || "Asesor Agencia";
  if (!values.ciudad_empresa) values.ciudad_empresa = "Bogota";
  if (!values.telefono_empresa) values.telefono_empresa = "6011234567";
  if (!values.cargo) values.cargo = empresa?.cargo?.trim() || "Talento Humano";
  if (!values.sede_empresa) values.sede_empresa = "Sede Principal";
  if (!values.profesional_asignado) values.profesional_asignado = empresa?.profesional_asignado?.trim() || "Profesional RECA";

  EVALUACION_QUESTION_DESCRIPTORS.forEach((question, index) => {
    const answer = values[question.sectionId][question.id];

    question.fields.forEach((field) => {
      answer[field.key] =
        field.key === "accesible" && field.options.includes("Si")
          ? "Si"
          : field.options[0] ?? `${field.label} de prueba ${index + 1}`;
    });
  });

  const summary = calculateEvaluacionAccessibilitySummary(values);
  values.section_4 = {
    nivel_accesibilidad: summary.suggestion,
    descripcion: deriveEvaluacionSection4Description(summary.suggestion),
  };

  EVALUACION_SECTION_5_ITEMS.forEach((item) => {
    values.section_5[item.id] = deriveEvaluacionSection5ItemValue(
      item.id,
      "Aplica"
    );
  });

  values.observaciones_generales =
    "Observaciones de prueba diligenciadas para validar el recorrido completo del acta.";
  values.cargos_compatibles =
    "Auxiliar administrativo, analista de apoyo y roles operativos con ajustes razonables basicos.";
  values.asistentes = [
    {
      nombre: empresa?.profesional_asignado?.trim() || "Profesional RECA",
      cargo: "Profesional RECA",
    },
    {
      nombre: empresa?.contacto_empresa?.trim() || "Contacto Empresa",
      cargo: empresa?.cargo?.trim() || "Contacto",
    },
    {
      nombre: empresa?.asesor?.trim() || "Asesor Agencia",
      cargo: "Asesor Agencia",
    },
  ];

  return values satisfies EvaluacionValues;
}

export function buildInduccionOrganizacionalManualTestValues(
  empresa: Empresa | null
) {
  const defaults = getDefaultInduccionOrganizacionalValues(empresa);

  return {
    ...defaults,
    fecha_visita: getManualTestFillDate(),
    modalidad: "Presencial" as const,
    nit_empresa: empresa?.nit_empresa ?? defaults.nit_empresa,
    vinculado: {
      numero: "1",
      nombre_oferente: "Vinculado Test 1",
      cedula: "510000001",
      telefono_oferente: "3001112233",
      cargo_oferente: "Auxiliar",
    },
    section_3: Object.fromEntries(
      getInduccionOrganizacionalSection3ItemIds().map((itemId) => [
        itemId,
        {
          visto: "Si",
          responsable: empresa?.contacto_empresa?.trim() || "Contacto Empresa",
          medio_socializacion: "Video",
          descripcion: "Dato de prueba",
        },
      ])
    ) as InduccionOrganizacionalValues["section_3"],
    section_4: [
      "Video",
      "Documentos Escritos, Presentaciones, Imagenes y Evaluaciones escritas",
      "No aplica",
    ].map((medio) => ({
      medio,
      recomendacion: getInduccionOrganizacionalRecommendationForMedium(medio),
    })) as InduccionOrganizacionalValues["section_4"],
    section_5: {
      observaciones: "Observaciones de prueba.",
    },
    asistentes: buildTestAttendees(empresa),
  } satisfies InduccionOrganizacionalValues;
}

export function buildInduccionOperativaManualTestValues(empresa: Empresa | null) {
  const defaults = getDefaultInduccionOperativaValues(empresa);

  return {
    ...defaults,
    fecha_visita: getManualTestFillDate(),
    modalidad: "Presencial" as const,
    nit_empresa: empresa?.nit_empresa ?? defaults.nit_empresa,
    vinculado: {
      numero: "1",
      nombre_oferente: "Vinculado Test 1",
      cedula: "520000001",
      telefono_oferente: "3004445566",
      cargo_oferente: "Operario",
    },
    section_3: Object.fromEntries(
      Object.keys(INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS).map((itemId) => [
        itemId,
        {
          ejecucion: "Si",
          observaciones: "Sin novedad",
        },
      ])
    ) as InduccionOperativaValues["section_3"],
    section_4: {
      items: Object.fromEntries(
        Object.keys(INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS).map((itemId) => [
          itemId,
          {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: "0. Cumple autonomamente.",
          },
        ])
      ) as InduccionOperativaValues["section_4"]["items"],
      notes: Object.fromEntries(
        INDUCCION_OPERATIVA_SECTION_4_BLOCKS.map((block) => [block.id, "Sin novedad"])
      ) as InduccionOperativaValues["section_4"]["notes"],
    },
    section_5: Object.fromEntries(
      INDUCCION_OPERATIVA_SECTION_5_ROWS.map((row) => [
        row.id,
        {
          nivel_apoyo_requerido: "0. No requiere apoyo.",
          observaciones: "Sin novedad",
        },
      ])
    ) as InduccionOperativaValues["section_5"],
    ajustes_requeridos: "Ajustes de prueba para QA.",
    fecha_primer_seguimiento: getManualTestFillDate(),
    observaciones_recomendaciones: "Observaciones finales de prueba.",
    asistentes: buildTestAttendees(empresa),
  } satisfies InduccionOperativaValues;
}
