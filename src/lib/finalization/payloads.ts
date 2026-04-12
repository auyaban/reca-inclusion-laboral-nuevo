export const PAYLOAD_SCHEMA_VERSION = 1;

export interface PayloadOutput {
  sheetLink: string;
  pdfLink: string;
}

export interface PayloadMetadata {
  generated_at: string;
  payload_source: string;
}

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
  return asistentes
    .map((asistente) => ({
      nombre: cleanText(asistente.nombre),
      cargo: cleanText(asistente.cargo),
    }))
    .filter((asistente) => asistente.nombre || asistente.cargo);
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
}: BuildCompletionPayloadsOptions<TCacheSnapshot, TAttachment, TParsedRaw>) {
  const metadata: PayloadMetadata = {
    generated_at: normalizeGeneratedAt(generatedAt),
    payload_source: payloadSource,
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
