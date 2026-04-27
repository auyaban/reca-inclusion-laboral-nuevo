import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
  normalizePayloadAsistentes,
  type PayloadOutput,
} from "@/lib/finalization/payloads";
import type { ContratacionValues } from "@/lib/validations/contratacion";

export const CONTRATACION_FORM_ID = "contratacion_incluyente";
export const CONTRATACION_FORM_NAME = "Contratacion Incluyente";

export interface ContratacionSection1Data {
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

type BuildContratacionCompletionPayloadsOptions = {
  actaRef: string;
  section1Data: ContratacionSection1Data;
  formData: ContratacionValues;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
};

function buildSection2Snapshot(formData: ContratacionValues) {
  return formData.vinculados.map((row) => ({
    ...row,
    desarrollo_actividad: formData.desarrollo_actividad,
  }));
}

function buildParticipantes(formData: ContratacionValues) {
  return formData.vinculados
    .filter((row) => row.nombre_oferente.trim())
    .map((row) => ({
      nombre_usuario: row.nombre_oferente.trim(),
      cedula_usuario: row.cedula.trim(),
      cargo_servicio: row.cargo_oferente.trim(),
    }));
}

export function buildContratacionCompletionPayloads({
  actaRef,
  section1Data,
  formData,
  asistentes,
  output,
  generatedAt,
  payloadSource,
}: BuildContratacionCompletionPayloadsOptions) {
  const normalizedAsistentes = normalizePayloadAsistentes(asistentes);
  const participantes = buildParticipantes(formData);
  const tipoActa =
    formData.vinculados.length <= 1
      ? "contratacion_individual"
      : "contratacion_grupal";
  // Legacy keeps the full vinculado name in Contratacion individual payloads.
  const extraName =
    formData.vinculados.length <= 1
      ? formData.vinculados[0]?.nombre_oferente.trim() ?? ""
      : String(formData.vinculados.length);
  const cacheSnapshot = {
    failed_visit_applied_at: formData.failed_visit_applied_at,
    section_1: section1Data,
    section_2: buildSection2Snapshot(formData),
    section_6: {
      ajustes_recomendaciones: formData.ajustes_recomendaciones,
    },
    section_7: normalizedAsistentes,
  };

  return buildCompletionPayloads({
    formId: CONTRATACION_FORM_ID,
    formName: CONTRATACION_FORM_NAME,
    cacheSnapshot,
    attachment: {
      document_kind: "inclusive_hiring",
      document_label: "Contratacion Incluyente",
      is_ods_candidate: true,
    },
    parsedRaw: buildBaseParsedRaw({
      section1Data,
      asistentes: normalizedAsistentes,
      participantes,
      cargoObjetivo: participantes[0]?.cargo_servicio ?? "",
      extraFields: {
        failed_visit_applied_at: formData.failed_visit_applied_at,
        tipo_acta: tipoActa,
        extra_name: extraName,
        total_vinculados: String(formData.vinculados.length),
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
