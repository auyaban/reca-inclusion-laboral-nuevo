import { getMeaningfulAsistentes } from "@/lib/asistentes";

export const PAYLOAD_SCHEMA_VERSION = 1;

export interface PayloadOutput {
  sheetLink: string;
  pdfLink?: string;
}

export interface PayloadMetadata {
  generated_at: string;
  payload_source: string;
  acta_ref: string;
  raw_payload_artifact?: RawPayloadArtifact;
  [key: string]: unknown;
}

export interface UploadedRawPayloadArtifact {
  storage: "google_drive";
  folder_name: string;
  file_id: string;
  web_view_link: string;
  file_name: string;
  status: "uploaded";
  uploaded_at: string;
}

export interface FailedRawPayloadArtifact {
  storage: "google_drive";
  folder_name: string;
  file_name: string;
  status: "failed";
}

export type RawPayloadArtifact =
  | UploadedRawPayloadArtifact
  | FailedRawPayloadArtifact;

export interface PayloadAsistente {
  nombre: string;
  cargo: string;
}

export interface BaseSection1Data {
  nit_empresa?: unknown;
  nombre_empresa?: unknown;
  fecha_visita?: unknown;
  profesional_asignado?: unknown;
  modalidad?: unknown;
  ciudad_empresa?: unknown;
  sede_empresa?: unknown;
  caja_compensacion?: unknown;
  asesor?: unknown;
}

interface BuildBaseParsedRawOptions {
  section1Data: BaseSection1Data;
  asistentes?: PayloadAsistente[];
  participantes?: unknown[];
  cargoObjetivo?: unknown;
  totalVacantes?: unknown;
  numeroSeguimiento?: unknown;
  extraFields?: Record<string, unknown>;
}

interface BuildCompletionPayloadsOptions<
  TCacheSnapshot extends Record<string, unknown>,
  TAttachment extends Record<string, unknown>,
  TParsedRaw extends Record<string, unknown>,
> {
  formId: string;
  formName: string;
  cacheSnapshot: TCacheSnapshot;
  attachment: TAttachment;
  parsedRaw: TParsedRaw;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
  actaRef: string;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeGeneratedAt(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

export function buildUploadedRawPayloadArtifact({
  folderName,
  fileId,
  webViewLink,
  fileName,
  uploadedAt,
}: {
  folderName: string;
  fileId: string;
  webViewLink: string;
  fileName: string;
  uploadedAt: string | Date;
}): UploadedRawPayloadArtifact {
  return {
    storage: "google_drive",
    folder_name: folderName,
    file_id: fileId,
    web_view_link: webViewLink,
    file_name: fileName,
    status: "uploaded",
    uploaded_at: normalizeGeneratedAt(uploadedAt),
  };
}

export function buildFailedRawPayloadArtifact({
  folderName,
  fileName,
}: {
  folderName: string;
  fileName: string;
}): FailedRawPayloadArtifact {
  return {
    storage: "google_drive",
    folder_name: folderName,
    file_name: fileName,
    status: "failed",
  };
}

function normalizeAsistentesNames(asistentes: PayloadAsistente[]) {
  const names: string[] = [];

  for (const asistente of asistentes) {
    const nombre = cleanText(asistente.nombre);
    if (nombre && !names.includes(nombre)) {
      names.push(nombre);
    }
  }

  return names;
}

export function normalizePayloadAsistentes(
  asistentes: Array<{
    nombre?: unknown;
    cargo?: unknown;
  }>
) {
  return getMeaningfulAsistentes(asistentes).map((asistente) => ({
    nombre: cleanText(asistente.nombre),
    cargo: cleanText(asistente.cargo),
  }));
}

export function buildBaseParsedRaw({
  section1Data,
  asistentes = [],
  participantes = [],
  cargoObjetivo = "",
  totalVacantes = "",
  numeroSeguimiento = "",
  extraFields = {},
}: BuildBaseParsedRawOptions) {
  const asistentesNombres = normalizeAsistentesNames(asistentes);
  const nombreProfesional = cleanText(section1Data.profesional_asignado);
  const candidatosProfesional = [
    nombreProfesional,
    ...asistentesNombres,
  ].filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);

  return {
    nit_empresa: cleanText(section1Data.nit_empresa),
    nombre_empresa: cleanText(section1Data.nombre_empresa),
    fecha_servicio: cleanText(section1Data.fecha_visita),
    nombre_profesional: nombreProfesional,
    candidatos_profesional: candidatosProfesional,
    modalidad_servicio: cleanText(section1Data.modalidad),
    cargo_objetivo: cleanText(cargoObjetivo),
    total_vacantes: cleanText(totalVacantes),
    numero_seguimiento: cleanText(numeroSeguimiento),
    participantes,
    warnings: [],
    asistentes: asistentesNombres,
    ciudad_empresa: cleanText(section1Data.ciudad_empresa),
    sede_empresa: cleanText(section1Data.sede_empresa),
    caja_compensacion: cleanText(section1Data.caja_compensacion),
    asesor_empresa: cleanText(section1Data.asesor),
    ...extraFields,
  };
}

export function buildCompletionPayloads<
  TCacheSnapshot extends Record<string, unknown>,
  TAttachment extends Record<string, unknown>,
  TParsedRaw extends Record<string, unknown>,
>({
  formId,
  formName,
  cacheSnapshot,
  attachment,
  parsedRaw,
  output,
  generatedAt,
  payloadSource,
  actaRef,
}: BuildCompletionPayloadsOptions<TCacheSnapshot, TAttachment, TParsedRaw>) {
  const metadata: PayloadMetadata = {
    generated_at: normalizeGeneratedAt(generatedAt),
    payload_source: payloadSource,
    acta_ref: cleanText(actaRef),
  };

  return {
    payloadRaw: {
      schema_version: PAYLOAD_SCHEMA_VERSION,
      form_id: formId,
      form_name: formName,
      cache_snapshot: cacheSnapshot,
      output,
      metadata,
    },
    payloadNormalized: {
      schema_version: PAYLOAD_SCHEMA_VERSION,
      form_id: formId,
      form_name: formName,
      attachment,
      parsed_raw: parsedRaw,
      metadata,
    },
    payloadMetadata: metadata,
  };
}

export function withRawPayloadArtifact<
  TPayloadNormalized extends {
    metadata: PayloadMetadata;
  },
>(
  payloadNormalized: TPayloadNormalized,
  rawPayloadArtifact: RawPayloadArtifact
): TPayloadNormalized {
  return {
    ...payloadNormalized,
    metadata: {
      ...payloadNormalized.metadata,
      raw_payload_artifact: rawPayloadArtifact,
    },
  };
}
