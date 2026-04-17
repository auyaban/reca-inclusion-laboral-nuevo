import {
  CONDICIONES_VACANTE_CAPABILITIES_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_EDUCATION_CHECKBOX_FIELDS,
  CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_POSTURES_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_RECOMMENDATIONS_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_RISKS_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_VACANCY_REQUIRED_FIELDS,
} from "@/lib/condicionesVacanteSections";
import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
  normalizePayloadAsistentes,
  type PayloadOutput,
} from "@/lib/finalization/payloads";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";

export const CONDICIONES_VACANTE_FORM_ID = "condiciones_vacante";
export const CONDICIONES_VACANTE_FORM_NAME = "Condiciones de Vacante";

export interface CondicionesVacanteSection1Data {
  fecha_visita: string;
  modalidad: string;
  nombre_empresa: string;
  ciudad_empresa: string;
  direccion_empresa: string;
  nit_empresa: string;
  correo_1: string;
  telefono_empresa: string;
  contacto_empresa: string;
  cargo: string;
  caja_compensacion: string;
  sede_empresa: string;
  asesor: string;
  profesional_asignado: string;
  correo_profesional: string;
  correo_asesor: string;
}

interface BuildCondicionesVacanteCompletionPayloadsOptions {
  actaRef: string;
  section1Data: CondicionesVacanteSection1Data;
  formData: CondicionesVacanteValues;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
  discapacidades?: CondicionesVacanteValues["discapacidades"];
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
}

function pickFields<
  TSource extends Record<string, unknown>,
  const TKeys extends readonly (keyof TSource)[],
>(source: TSource, keys: TKeys) {
  return Object.fromEntries(
    keys.map((key) => [key, source[key]])
  ) as Pick<TSource, TKeys[number]>;
}

function getMeaningfulDiscapacidades(
  rows: CondicionesVacanteValues["discapacidades"] = []
) {
  return rows.filter((row) => row.discapacidad.trim());
}

function buildSection2Snapshot(formData: CondicionesVacanteValues) {
  const competencias = Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [
      `competencia_${index + 1}`,
      formData.competencias[index] ?? "",
    ])
  );

  return {
    ...pickFields(formData, CONDICIONES_VACANTE_VACANCY_REQUIRED_FIELDS),
    ...competencias,
  };
}

export function buildCondicionesVacanteCompletionPayloads({
  actaRef,
  section1Data,
  formData,
  asistentes,
  discapacidades = formData.discapacidades,
  output,
  generatedAt,
  payloadSource,
}: BuildCondicionesVacanteCompletionPayloadsOptions) {
  const normalizedAsistentes = normalizePayloadAsistentes(asistentes);
  const meaningfulDiscapacidades = getMeaningfulDiscapacidades(discapacidades);
  const cacheSnapshot = {
    section_1: section1Data,
    section_2: buildSection2Snapshot(formData),
    section_2_1: {
      ...pickFields(formData, CONDICIONES_VACANTE_EDUCATION_CHECKBOX_FIELDS),
      ...pickFields(formData, CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS),
    },
    section_3: pickFields(
      formData,
      CONDICIONES_VACANTE_CAPABILITIES_REQUIRED_FIELDS
    ),
    section_4: pickFields(formData, CONDICIONES_VACANTE_POSTURES_REQUIRED_FIELDS),
    section_5: pickFields(formData, CONDICIONES_VACANTE_RISKS_REQUIRED_FIELDS),
    section_6: meaningfulDiscapacidades,
    section_7: pickFields(
      formData,
      CONDICIONES_VACANTE_RECOMMENDATIONS_REQUIRED_FIELDS
    ),
    section_8: normalizedAsistentes,
  };

  return buildCompletionPayloads({
    formId: CONDICIONES_VACANTE_FORM_ID,
    formName: CONDICIONES_VACANTE_FORM_NAME,
    cacheSnapshot,
    attachment: {
      document_kind: "vacancy_review",
      document_label: "Revision de condicion o vacante",
      is_ods_candidate: true,
    },
    parsedRaw: buildBaseParsedRaw({
      section1Data,
      asistentes: normalizedAsistentes,
      cargoObjetivo: formData.nombre_vacante,
      totalVacantes: formData.numero_vacantes,
      extraFields: {
        sheet_link: output.sheetLink,
        ...(output.pdfLink ? { pdf_link: output.pdfLink } : {}),
      },
    }),
    output,
    generatedAt,
    payloadSource,
    actaRef,
  });
}
