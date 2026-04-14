import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
  normalizePayloadAsistentes,
  type PayloadOutput,
} from "@/lib/finalization/payloads";

export const SENSIBILIZACION_FORM_ID = "sensibilizacion";
export const SENSIBILIZACION_FORM_NAME = "Sensibilizacion";

interface SensibilizacionSection1Data {
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
  asesor: string;
  sede_empresa: string;
  profesional_asignado: string;
  correo_profesional: string;
  correo_asesor: string;
  caja_compensacion: string;
}

interface BuildSensibilizacionCompletionPayloadsOptions {
  section1Data: SensibilizacionSection1Data;
  observaciones: string;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
}

export function buildSensibilizacionCompletionPayloads({
  section1Data,
  observaciones,
  asistentes,
  output,
  generatedAt,
  payloadSource,
}: BuildSensibilizacionCompletionPayloadsOptions) {
  const normalizedAsistentes = normalizePayloadAsistentes(asistentes);
  const cacheSnapshot = {
    section_1: section1Data,
    section_2: {},
    section_3: {
      observaciones,
    },
    section_4: {},
    section_5: normalizedAsistentes,
  };

  return buildCompletionPayloads({
    formId: SENSIBILIZACION_FORM_ID,
    formName: SENSIBILIZACION_FORM_NAME,
    cacheSnapshot,
    attachment: {
      document_kind: "sensibilizacion",
      document_label: "Sensibilizacion",
      is_ods_candidate: true,
    },
    parsedRaw: buildBaseParsedRaw({
      section1Data,
      asistentes: normalizedAsistentes,
      extraFields: {
        observaciones,
        sheet_link: output.sheetLink,
        ...(output.pdfLink ? { pdf_link: output.pdfLink } : {}),
      },
    }),
    output,
    generatedAt,
    payloadSource,
  });
}
