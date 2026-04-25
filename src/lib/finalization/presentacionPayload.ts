import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
  normalizePayloadAsistentes,
  type PayloadOutput,
} from "@/lib/finalization/payloads";

export const PRESENTACION_FORM_ID = "presentacion_programa";

export function getPresentacionFormName(tipoVisita: string) {
  return `${tipoVisita} del Programa`;
}

interface PresentacionSection1Data {
  fecha_visita: string;
  modalidad: string;
  nit_empresa: string;
  nombre_empresa: string;
  direccion_empresa: string;
  correo_1: string;
  contacto_empresa: string;
  caja_compensacion: string;
  profesional_asignado: string;
  asesor: string;
  ciudad_empresa: string;
  telefono_empresa: string;
  cargo: string;
  sede_empresa: string;
  correo_profesional: string;
  correo_asesor: string;
  tipo_visita: string;
}

interface BuildPresentacionCompletionPayloadsOptions {
  tipoVisita: string;
  actaRef: string;
  section1Data: PresentacionSection1Data;
  failedVisitAppliedAt: string | null;
  motivacionSeleccionada: string[];
  acuerdosObservaciones: string;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
}

export function buildPresentacionCompletionPayloads({
  tipoVisita,
  actaRef,
  section1Data,
  failedVisitAppliedAt,
  motivacionSeleccionada,
  acuerdosObservaciones,
  asistentes,
  output,
  generatedAt,
  payloadSource,
}: BuildPresentacionCompletionPayloadsOptions) {
  const normalizedAsistentes = normalizePayloadAsistentes(asistentes);
  const formName = getPresentacionFormName(tipoVisita);
  const cacheSnapshot = {
    failed_visit_applied_at: failedVisitAppliedAt,
    section_1: section1Data,
    section_3_item_8: motivacionSeleccionada,
    section_4: {
      acuerdos_observaciones: acuerdosObservaciones,
    },
    section_5: normalizedAsistentes,
  };

  return buildCompletionPayloads({
    formId: PRESENTACION_FORM_ID,
    formName,
    cacheSnapshot,
    attachment: {
      document_kind:
        tipoVisita === "Reactivación"
          ? "program_reactivation"
          : "program_presentation",
      document_label:
        tipoVisita === "Reactivación"
          ? "Reactivación del programa"
          : "Presentación del programa",
      is_ods_candidate: true,
    },
    parsedRaw: buildBaseParsedRaw({
      section1Data,
      asistentes: normalizedAsistentes,
      extraFields: {
        motivacion: motivacionSeleccionada,
        acuerdos_observaciones: acuerdosObservaciones,
        failed_visit_applied_at: failedVisitAppliedAt,
        sheet_link: output.sheetLink,
        pdf_link: output.pdfLink,
      },
    }),
    output,
    generatedAt,
    payloadSource,
    actaRef,
  });
}
