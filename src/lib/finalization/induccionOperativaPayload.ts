import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
  normalizePayloadAsistentes,
  type PayloadOutput,
} from "@/lib/finalization/payloads";
import type { InduccionOperativaValues } from "@/lib/validations/induccionOperativa";

export const INDUCCION_OPERATIVA_FORM_ID = "induccion_operativa";
export const INDUCCION_OPERATIVA_FORM_NAME = "Induccion Operativa";

export interface InduccionOperativaSection1Data {
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

type BuildInduccionOperativaCompletionPayloadsOptions = {
  actaRef: string;
  section1Data: InduccionOperativaSection1Data;
  formData: InduccionOperativaValues;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
};

function buildLinkedParticipants(formData: InduccionOperativaValues) {
  return [
    {
      nombre_usuario: formData.vinculado.nombre_oferente.trim(),
      cedula_usuario: formData.vinculado.cedula.trim(),
      cargo_servicio: formData.vinculado.cargo_oferente.trim(),
    },
  ].filter((row) =>
    Boolean(row.nombre_usuario || row.cedula_usuario || row.cargo_servicio)
  );
}

function buildLinkedSnapshot(formData: InduccionOperativaValues) {
  return {
    ...formData.vinculado,
  };
}

export function buildInduccionOperativaCompletionPayloads({
  actaRef,
  section1Data,
  formData,
  asistentes,
  output,
  generatedAt,
  payloadSource,
}: BuildInduccionOperativaCompletionPayloadsOptions) {
  const normalizedAsistentes = normalizePayloadAsistentes(asistentes);
  const participants = buildLinkedParticipants(formData);
  const cacheSnapshot = {
    failed_visit_applied_at: formData.failed_visit_applied_at,
    section_1: section1Data,
    section_2: buildLinkedSnapshot(formData),
    section_3: formData.section_3,
    section_4: formData.section_4,
    section_5: formData.section_5,
    section_6: {
      ajustes_requeridos: formData.ajustes_requeridos,
    },
    section_7: {
      fecha_primer_seguimiento: formData.fecha_primer_seguimiento,
    },
    section_8: {
      observaciones_recomendaciones: formData.observaciones_recomendaciones,
    },
    section_9: normalizedAsistentes,
  };

  return buildCompletionPayloads({
    formId: INDUCCION_OPERATIVA_FORM_ID,
    formName: INDUCCION_OPERATIVA_FORM_NAME,
    cacheSnapshot,
    attachment: {
      document_kind: "operational_induction",
      document_label: "Induccion Operativa",
      is_ods_candidate: true,
    },
    parsedRaw: buildBaseParsedRaw({
      section1Data,
      asistentes: normalizedAsistentes,
      participantes: participants,
      cargoObjetivo: formData.vinculado.cargo_oferente.trim(),
      extraFields: {
        failed_visit_applied_at: formData.failed_visit_applied_at,
        document_kind: "operational_induction",
        linked_person_name: formData.vinculado.nombre_oferente.trim(),
        linked_person_cedula: formData.vinculado.cedula.trim(),
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
