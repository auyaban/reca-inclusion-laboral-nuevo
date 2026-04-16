import type { Empresa } from "@/lib/store/empresaStore";
import {
  createEmptyContratacionVinculadoRow,
  getDefaultContratacionValues,
} from "@/lib/contratacion";
import { createEmptySeleccionOferenteRow, getDefaultSeleccionValues } from "@/lib/seleccion";
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
