import { normalizePayloadAsistentes } from "@/lib/finalization/payloads";
import type { PayloadOutput } from "@/lib/finalization/payloads";
import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
} from "@/lib/finalization/payloads";
import { coerceTrimmedText } from "@/lib/finalization/valueUtils";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";

export const INTERPRETE_LSC_FORM_ID = "interprete_lsc";
export const INTERPRETE_LSC_FORM_NAME = "Servicio de Interpretacion LSC";

export interface InterpreteLscSection1Data {
  fecha_visita: string;
  modalidad_interprete: string;
  modalidad_profesional_reca: string;
  nombre_empresa: string;
  ciudad_empresa: string;
  direccion_empresa: string;
  nit_empresa: string;
  contacto_empresa: string;
  cargo: string;
  asesor: string;
  sede_empresa: string;
  profesional_asignado: string;
  correo_profesional: string;
  correo_asesor: string;
  caja_compensacion: string;
}

interface BuildInterpreteLscCompletionPayloadsOptions {
  actaRef: string;
  section1Data: InterpreteLscSection1Data;
  formData: InterpreteLscValues;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
}

function buildParticipantes(formData: InterpreteLscValues) {
  return formData.oferentes
    .filter((row) =>
      Boolean(row.nombre_oferente.trim() || row.cedula.trim() || row.proceso.trim())
    )
    .map((row) => ({
      nombre_usuario: coerceTrimmedText(row.nombre_oferente),
      cedula_usuario: coerceTrimmedText(row.cedula),
      proceso: coerceTrimmedText(row.proceso),
    }));
}

function buildInterpretesSnapshot(formData: InterpreteLscValues) {
  return formData.interpretes
    .filter((row) =>
      Boolean(
        row.nombre.trim() ||
          row.hora_inicial.trim() ||
          row.hora_final.trim() ||
          row.total_tiempo.trim()
      )
    )
    .map((row) => ({
      nombre: coerceTrimmedText(row.nombre),
      hora_inicial: coerceTrimmedText(row.hora_inicial),
      hora_final: coerceTrimmedText(row.hora_final),
      total_tiempo: coerceTrimmedText(row.total_tiempo),
    }));
}

function buildUniqueInterpretesNames(interpretes: ReturnType<typeof buildInterpretesSnapshot>) {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const interprete of interpretes) {
    if (!interprete.nombre || seen.has(interprete.nombre)) {
      continue;
    }

    seen.add(interprete.nombre);
    names.push(interprete.nombre);
  }

  return names;
}

export function buildInterpreteLscCompletionPayloads({
  actaRef,
  section1Data,
  formData,
  output,
  generatedAt,
  payloadSource,
}: BuildInterpreteLscCompletionPayloadsOptions) {
  const normalizedAsistentes = normalizePayloadAsistentes(formData.asistentes);
  const participantes = buildParticipantes(formData);
  const interpretesSnapshot = buildInterpretesSnapshot(formData);
  const interpretesNames = buildUniqueInterpretesNames(interpretesSnapshot);
  const modalidadServicio =
    coerceTrimmedText(section1Data.modalidad_interprete) ||
    coerceTrimmedText(section1Data.modalidad_profesional_reca);

  const cacheSnapshot = {
    section_1: { ...section1Data },
    section_2: formData.oferentes.map((row) => ({
      nombre_oferente: coerceTrimmedText(row.nombre_oferente),
      cedula: coerceTrimmedText(row.cedula),
      proceso: coerceTrimmedText(row.proceso),
    })),
    section_3: {
      interpretes: interpretesSnapshot,
      sabana: {
        activo: Boolean(formData.sabana.activo),
        horas: formData.sabana.horas,
      },
      sumatoria_horas: coerceTrimmedText(formData.sumatoria_horas),
    },
    section_4: normalizedAsistentes,
  };

  const parsedRaw = buildBaseParsedRaw({
    section1Data: {
      ...section1Data,
      modalidad: modalidadServicio,
    },
    asistentes: normalizedAsistentes,
    participantes,
    extraFields: {
      tipo_acta: INTERPRETE_LSC_FORM_ID,
      modalidad_interprete: coerceTrimmedText(section1Data.modalidad_interprete),
      modalidad_profesional_reca: coerceTrimmedText(
        section1Data.modalidad_profesional_reca
      ),
      interpretes: interpretesSnapshot,
      interpretes_nombres: interpretesNames,
      sumatoria_horas: coerceTrimmedText(formData.sumatoria_horas),
      sabana: {
        activo: Boolean(formData.sabana.activo),
        horas: formData.sabana.horas,
      },
      sheet_link: output.sheetLink,
      ...(output.pdfLink ? { pdf_link: output.pdfLink } : {}),
    },
  });

  return buildCompletionPayloads({
    formId: INTERPRETE_LSC_FORM_ID,
    formName: INTERPRETE_LSC_FORM_NAME,
    cacheSnapshot,
    attachment: {
      document_kind: "interpreter_service",
      document_label: INTERPRETE_LSC_FORM_NAME,
      is_ods_candidate: true,
    },
    parsedRaw,
    output,
    generatedAt,
    payloadSource,
    actaRef,
  });
}
