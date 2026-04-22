import type {
  ContratacionValues,
  ContratacionVinculadoFieldId,
  ContratacionVinculadoRow,
} from "@/lib/validations/contratacion";
import {
  normalizeContratacionGenero,
  normalizeNullableContratacionGenero,
} from "@/lib/contratacion";
import type {
  SeleccionOferenteFieldId,
  SeleccionOferenteRow,
  SeleccionValues,
} from "@/lib/validations/seleccion";
import type { InduccionLinkedPerson } from "@/lib/inducciones";
import { isMeaningfulRepeatedPeopleValue } from "@/lib/repeatedPeople";
import { normalizeSeguimientosDateInput } from "@/lib/seguimientosDates";

export const USUARIOS_RECA_CONFLICT_COLUMN = "cedula_usuario";

export const USUARIOS_RECA_DETAIL_FIELDS = [
  "cedula_usuario",
  "nombre_usuario",
  "genero_usuario",
  "discapacidad_usuario",
  "discapacidad_detalle",
  "certificado_discapacidad",
  "certificado_porcentaje",
  "telefono_oferente",
  "fecha_nacimiento",
  "cargo_oferente",
  "contacto_emergencia",
  "parentesco",
  "telefono_emergencia",
  "correo_oferente",
  "lgtbiq",
  "grupo_etnico",
  "grupo_etnico_cual",
  "lugar_firma_contrato",
  "fecha_firma_contrato",
  "tipo_contrato",
  "fecha_fin",
  "resultado_certificado",
  "pendiente_otros_oferentes",
  "cuenta_pension",
  "tipo_pension",
  "empresa_nit",
  "empresa_nombre",
] as const;

export const USUARIOS_RECA_SEARCH_FIELDS = [
  "cedula_usuario",
  "nombre_usuario",
] as const;

export interface UsuarioRecaRecord {
  cedula_usuario: string;
  nombre_usuario: string | null;
  genero_usuario: string | null;
  discapacidad_usuario: string | null;
  discapacidad_detalle: string | null;
  certificado_discapacidad: string | null;
  certificado_porcentaje: string | null;
  telefono_oferente: string | null;
  fecha_nacimiento: string | null;
  cargo_oferente: string | null;
  contacto_emergencia: string | null;
  parentesco: string | null;
  telefono_emergencia: string | null;
  correo_oferente: string | null;
  lgtbiq: string | null;
  grupo_etnico: string | null;
  grupo_etnico_cual: string | null;
  lugar_firma_contrato: string | null;
  fecha_firma_contrato: string | null;
  tipo_contrato: string | null;
  fecha_fin: string | null;
  resultado_certificado: string | null;
  pendiente_otros_oferentes: string | null;
  cuenta_pension: string | null;
  tipo_pension: string | null;
  empresa_nit: string | null;
  empresa_nombre: string | null;
}

export type UsuarioRecaUpsertRow = {
  cedula_usuario: string;
} & Partial<Omit<UsuarioRecaRecord, "cedula_usuario">>;

export interface UsuarioRecaSearchResult {
  cedula_usuario: string;
  nombre_usuario: string;
}

export interface UsuarioRecaInduccionPrefill {
  cedula: string;
  nombre_oferente: string;
  telefono_oferente: string;
  cargo_oferente: string;
}

export interface UsuarioRecaSeguimientoPrefill {
  cedula_usuario: string;
  nombre_usuario: string;
  discapacidad_usuario: string;
  discapacidad_detalle: string;
  certificado_discapacidad: string;
  certificado_porcentaje: string;
  telefono_oferente: string;
  correo_oferente: string;
  cargo_oferente: string;
  contacto_emergencia: string;
  parentesco: string;
  telefono_emergencia: string;
  fecha_firma_contrato: string;
  tipo_contrato: string;
  fecha_fin: string;
  empresa_nit: string;
  empresa_nombre: string;
}

type UsuarioRecaSourceShape = Partial<UsuarioRecaRecord> &
  Record<(typeof USUARIOS_RECA_DETAIL_FIELDS)[number], unknown>;

type ContratacionSection1UsuarioRecaSource = {
  nit_empresa: string;
  nombre_empresa: string;
};

type InduccionSection1UsuarioRecaSource = {
  nit_empresa: string;
  nombre_empresa: string;
};

type UsuarioRecaUpsertFieldKey = Exclude<
  keyof UsuarioRecaUpsertRow,
  "cedula_usuario"
>;

const EMPTY_USUARIO_RECA_RECORD: UsuarioRecaRecord = {
  cedula_usuario: "",
  nombre_usuario: null,
  genero_usuario: null,
  discapacidad_usuario: null,
  discapacidad_detalle: null,
  certificado_discapacidad: null,
  certificado_porcentaje: null,
  telefono_oferente: null,
  fecha_nacimiento: null,
  cargo_oferente: null,
  contacto_emergencia: null,
  parentesco: null,
  telefono_emergencia: null,
  correo_oferente: null,
  lgtbiq: null,
  grupo_etnico: null,
  grupo_etnico_cual: null,
  lugar_firma_contrato: null,
  fecha_firma_contrato: null,
  tipo_contrato: null,
  fecha_fin: null,
  resultado_certificado: null,
  pendiente_otros_oferentes: null,
  cuenta_pension: null,
  tipo_pension: null,
  empresa_nit: null,
  empresa_nombre: null,
};

const CONTRATACION_PREFILL_FIELD_MAP = {
  cedula: "cedula_usuario",
  nombre_oferente: "nombre_usuario",
  certificado_porcentaje: "certificado_porcentaje",
  discapacidad: "discapacidad_detalle",
  telefono_oferente: "telefono_oferente",
  genero: "genero_usuario",
  correo_oferente: "correo_oferente",
  fecha_nacimiento: "fecha_nacimiento",
  cargo_oferente: "cargo_oferente",
  contacto_emergencia: "contacto_emergencia",
  parentesco: "parentesco",
  telefono_emergencia: "telefono_emergencia",
  certificado_discapacidad: "certificado_discapacidad",
  lgtbiq: "lgtbiq",
  grupo_etnico: "grupo_etnico",
  grupo_etnico_cual: "grupo_etnico_cual",
  lugar_firma_contrato: "lugar_firma_contrato",
  fecha_firma_contrato: "fecha_firma_contrato",
  tipo_contrato: "tipo_contrato",
  fecha_fin: "fecha_fin",
} as const satisfies Record<string, keyof UsuarioRecaRecord>;

type ContratacionUsuariosRecaPrefillFieldId =
  keyof typeof CONTRATACION_PREFILL_FIELD_MAP;

export const CONTRATACION_USUARIOS_RECA_PREFILL_FIELD_IDS = Object.keys(
  CONTRATACION_PREFILL_FIELD_MAP
) as readonly ContratacionUsuariosRecaPrefillFieldId[];

export const CONTRATACION_USUARIOS_RECA_REPLACE_TARGET_FIELD_IDS =
  CONTRATACION_USUARIOS_RECA_PREFILL_FIELD_IDS.filter(
    (fieldId) => fieldId !== "cedula"
  );

const SELECCION_PREFILL_FIELD_MAP = {
  cedula: "cedula_usuario",
  nombre_oferente: "nombre_usuario",
  certificado_porcentaje: "certificado_porcentaje",
  discapacidad: "discapacidad_detalle",
  telefono_oferente: "telefono_oferente",
  fecha_nacimiento: "fecha_nacimiento",
  cargo_oferente: "cargo_oferente",
  nombre_contacto_emergencia: "contacto_emergencia",
  parentesco: "parentesco",
  telefono_emergencia: "telefono_emergencia",
  resultado_certificado: "resultado_certificado",
  pendiente_otros_oferentes: "pendiente_otros_oferentes",
  cuenta_pension: "cuenta_pension",
  tipo_pension: "tipo_pension",
} as const satisfies Record<string, keyof UsuarioRecaRecord>;

type SeleccionUsuariosRecaPrefillFieldId = keyof typeof SELECCION_PREFILL_FIELD_MAP;

export const SELECCION_USUARIOS_RECA_PREFILL_FIELD_IDS = Object.keys(
  SELECCION_PREFILL_FIELD_MAP
) as readonly SeleccionUsuariosRecaPrefillFieldId[];

export const SELECCION_USUARIOS_RECA_REPLACE_TARGET_FIELD_IDS =
  SELECCION_USUARIOS_RECA_PREFILL_FIELD_IDS.filter(
    (fieldId) => fieldId !== "cedula"
  );

const INDUCCION_PREFILL_FIELD_MAP = {
  cedula: "cedula_usuario",
  nombre_oferente: "nombre_usuario",
  telefono_oferente: "telefono_oferente",
  cargo_oferente: "cargo_oferente",
} as const satisfies Record<string, keyof UsuarioRecaRecord>;

type InduccionUsuariosRecaPrefillFieldId = keyof typeof INDUCCION_PREFILL_FIELD_MAP;

export const INDUCCION_USUARIOS_RECA_PREFILL_FIELD_IDS = Object.keys(
  INDUCCION_PREFILL_FIELD_MAP
) as readonly InduccionUsuariosRecaPrefillFieldId[];

export const INDUCCION_USUARIOS_RECA_REPLACE_TARGET_FIELD_IDS =
  INDUCCION_USUARIOS_RECA_PREFILL_FIELD_IDS.filter(
    (fieldId) => fieldId !== "cedula"
  );

const USUARIOS_RECA_UPSERT_FIELD_KEYS = [
  "nombre_usuario",
  "genero_usuario",
  "discapacidad_usuario",
  "discapacidad_detalle",
  "certificado_discapacidad",
  "certificado_porcentaje",
  "telefono_oferente",
  "fecha_nacimiento",
  "cargo_oferente",
  "contacto_emergencia",
  "parentesco",
  "telefono_emergencia",
  "correo_oferente",
  "lgtbiq",
  "grupo_etnico",
  "grupo_etnico_cual",
  "lugar_firma_contrato",
  "fecha_firma_contrato",
  "tipo_contrato",
  "fecha_fin",
  "resultado_certificado",
  "pendiente_otros_oferentes",
  "cuenta_pension",
  "tipo_pension",
  "empresa_nit",
  "empresa_nombre",
] as const satisfies readonly UsuarioRecaUpsertFieldKey[];

const USUARIOS_RECA_UPSERT_FIELD_KEYS_SET = new Set<string>(
  USUARIOS_RECA_UPSERT_FIELD_KEYS
);

function normalizeText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function normalizeNullableText(value: unknown) {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDateLike(value: unknown) {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDecimalLike(value: unknown) {
  const raw = typeof value === "number" ? String(value) : normalizeText(value);
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) {
    return null;
  }

  const [integerPart, ...decimalParts] = normalized.split(".");
  const decimalPart = decimalParts.join("");
  const compact =
    decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;

  return compact || null;
}

function formatDecimalLikePercentageForDisplay(value: unknown) {
  const normalized = normalizeDecimalLike(value);
  if (!normalized) {
    return "";
  }

  return `${normalized}%`;
}

function normalizeComparablePrefillValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparableCertificadoPorcentajeValue(value: unknown) {
  const normalized = normalizeDecimalLike(value);
  return normalized ?? normalizeComparablePrefillValue(value);
}

function normalizeComparableValue(
  fieldId:
    | ContratacionUsuariosRecaPrefillFieldId
    | SeleccionUsuariosRecaPrefillFieldId,
  value: unknown
) {
  if (fieldId === "certificado_porcentaje") {
    return normalizeComparableCertificadoPorcentajeValue(value);
  }

  if (fieldId === "genero") {
    return normalizeContratacionGenero(value);
  }

  return normalizeComparablePrefillValue(value);
}

function normalizeDiscapacidadText(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO");
}

function normalizeComparableToken(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\.+$/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-CO");
}

function isAffirmativeComparableValue(value: unknown) {
  return normalizeComparableToken(value) === "si";
}

function isNoAplicaComparableValue(value: unknown) {
  return normalizeComparableToken(value) === "no aplica";
}

function isContratacionUsuariosRecaReplaceTargetFieldMeaningful(
  row: ContratacionVinculadoRow,
  fieldId: ContratacionUsuariosRecaPrefillFieldId
) {
  if (
    fieldId === "grupo_etnico_cual" &&
    !isAffirmativeComparableValue(row.grupo_etnico) &&
    isNoAplicaComparableValue(row.grupo_etnico_cual)
  ) {
    return false;
  }

  return isMeaningfulRepeatedPeopleValue(row[fieldId]);
}

function isSeleccionUsuariosRecaReplaceTargetFieldMeaningful(
  row: SeleccionOferenteRow,
  fieldId: SeleccionUsuariosRecaPrefillFieldId
) {
  if (
    fieldId === "tipo_pension" &&
    !isAffirmativeComparableValue(row.cuenta_pension) &&
    isNoAplicaComparableValue(row.tipo_pension)
  ) {
    return false;
  }

  return isMeaningfulRepeatedPeopleValue(row[fieldId]);
}

export function normalizeCedulaUsuario(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\D+/g, "");
}

export function inferUsuarioRecaDiscapacidadCategoria(value: unknown) {
  const normalized = normalizeDiscapacidadText(value);
  if (!normalized || normalized.includes("no aplica")) {
    return null;
  }

  if (normalized.includes("multiple")) {
    return "Múltiple";
  }

  if (normalized.includes("visual")) {
    return "Visual";
  }

  if (normalized.includes("auditiva") || normalized.includes("hipoacusia")) {
    return "Auditiva";
  }

  if (normalized.includes("fisica")) {
    return "Física";
  }

  if (normalized.includes("psicosocial")) {
    return "Psicosocial";
  }

  if (
    normalized.includes("intelectual") ||
    normalized.includes("autismo") ||
    normalized.includes("autista")
  ) {
    return "Intelectual";
  }

  return null;
}

export function normalizeUsuarioRecaRecord(
  record: Partial<UsuarioRecaSourceShape> | null | undefined
): UsuarioRecaRecord | null {
  if (!record) {
    return null;
  }

  const normalizedCedula = normalizeCedulaUsuario(record.cedula_usuario);
  if (!normalizedCedula) {
    return null;
  }

  return {
    ...EMPTY_USUARIO_RECA_RECORD,
    cedula_usuario: normalizedCedula,
    nombre_usuario: normalizeNullableText(record.nombre_usuario),
    genero_usuario: normalizeNullableContratacionGenero(record.genero_usuario),
    discapacidad_usuario: normalizeNullableText(record.discapacidad_usuario),
    discapacidad_detalle: normalizeNullableText(record.discapacidad_detalle),
    certificado_discapacidad: normalizeNullableText(
      record.certificado_discapacidad
    ),
    certificado_porcentaje: normalizeNullableText(record.certificado_porcentaje),
    telefono_oferente: normalizeNullableText(record.telefono_oferente),
    fecha_nacimiento: normalizeDateLike(record.fecha_nacimiento),
    cargo_oferente: normalizeNullableText(record.cargo_oferente),
    contacto_emergencia: normalizeNullableText(record.contacto_emergencia),
    parentesco: normalizeNullableText(record.parentesco),
    telefono_emergencia: normalizeNullableText(record.telefono_emergencia),
    correo_oferente: normalizeNullableText(record.correo_oferente),
    lgtbiq: normalizeNullableText(record.lgtbiq),
    grupo_etnico: normalizeNullableText(record.grupo_etnico),
    grupo_etnico_cual: normalizeNullableText(record.grupo_etnico_cual),
    lugar_firma_contrato: normalizeNullableText(record.lugar_firma_contrato),
    fecha_firma_contrato: normalizeDateLike(record.fecha_firma_contrato),
    tipo_contrato: normalizeNullableText(record.tipo_contrato),
    fecha_fin: normalizeDateLike(record.fecha_fin),
    resultado_certificado: normalizeNullableText(record.resultado_certificado),
    pendiente_otros_oferentes: normalizeNullableText(
      record.pendiente_otros_oferentes
    ),
    cuenta_pension: normalizeNullableText(record.cuenta_pension),
    tipo_pension: normalizeNullableText(record.tipo_pension),
    empresa_nit: normalizeNullableText(record.empresa_nit),
    empresa_nombre: normalizeNullableText(record.empresa_nombre),
  };
}

export function normalizeUsuarioRecaSearchResult(
  record: Partial<UsuarioRecaSearchResult> | null | undefined
): UsuarioRecaSearchResult | null {
  const cedula = normalizeCedulaUsuario(record?.cedula_usuario);
  const nombre = normalizeText(record?.nombre_usuario);
  if (!cedula || !nombre) {
    return null;
  }

  return {
    cedula_usuario: cedula,
    nombre_usuario: nombre,
  };
}

function dedupeUsuariosRecaRows<T extends { cedula_usuario: string }>(
  rows: readonly T[]
) {
  const deduped = new Map<string, T>();
  for (const row of rows) {
    if (!row.cedula_usuario) {
      continue;
    }

    // Later rows win so the last row in the acta can override earlier drafts.
    deduped.set(row.cedula_usuario, row);
  }

  return Array.from(deduped.values());
}

function normalizeUsuarioRecaUpsertRow(
  row: Record<string, unknown>
): UsuarioRecaUpsertRow | null {
  const normalizedCedula = normalizeCedulaUsuario(row.cedula_usuario);
  if (!normalizedCedula) {
    return null;
  }

  const nextRow: UsuarioRecaUpsertRow = {
    cedula_usuario: normalizedCedula,
  };

  for (const key of Object.keys(row)) {
    if (key === "cedula_usuario") {
      continue;
    }

    if (!USUARIOS_RECA_UPSERT_FIELD_KEYS_SET.has(key)) {
      continue;
    }

    const targetKey = key as UsuarioRecaUpsertFieldKey;
    const value = row[key];
    if (targetKey === "genero_usuario") {
      nextRow[targetKey] = normalizeNullableContratacionGenero(value);
      continue;
    }

    if (typeof value === "string") {
      nextRow[targetKey] = value.trim() || null;
      continue;
    }

    nextRow[targetKey] = value == null ? null : String(value);
  }

  return nextRow;
}

export function buildUsuariosRecaRowsFromSeleccion(values: SeleccionValues) {
  const rows = values.oferentes
    .map((row) => {
      const cedula = normalizeCedulaUsuario(row.cedula);
      if (!cedula) {
        return null;
      }

      return normalizeUsuarioRecaUpsertRow({
        cedula_usuario: cedula,
        nombre_usuario: row.nombre_oferente,
        discapacidad_usuario: inferUsuarioRecaDiscapacidadCategoria(
          row.discapacidad
        ),
        discapacidad_detalle: normalizeNullableText(row.discapacidad),
        certificado_porcentaje: normalizeDecimalLike(
          row.certificado_porcentaje
        ),
        telefono_oferente: row.telefono_oferente,
        fecha_nacimiento: row.fecha_nacimiento,
        cargo_oferente: row.cargo_oferente,
        contacto_emergencia: row.nombre_contacto_emergencia,
        parentesco: row.parentesco,
        telefono_emergencia: row.telefono_emergencia,
        resultado_certificado: row.resultado_certificado,
        pendiente_otros_oferentes: row.pendiente_otros_oferentes,
        cuenta_pension: row.cuenta_pension,
        tipo_pension: row.tipo_pension,
      });
    })
    .filter((row): row is UsuarioRecaUpsertRow => row !== null);

  return dedupeUsuariosRecaRows(rows);
}

export function buildUsuariosRecaRowsFromContratacion(
  values: ContratacionValues,
  section1Data: ContratacionSection1UsuarioRecaSource
) {
  const rows = values.vinculados
    .map((row) => {
      const cedula = normalizeCedulaUsuario(row.cedula);
      if (!cedula) {
        return null;
      }

      return normalizeUsuarioRecaUpsertRow({
        cedula_usuario: cedula,
        nombre_usuario: row.nombre_oferente,
        genero_usuario: row.genero,
        discapacidad_usuario: inferUsuarioRecaDiscapacidadCategoria(
          row.discapacidad
        ),
        discapacidad_detalle: row.discapacidad,
        certificado_porcentaje: normalizeDecimalLike(
          row.certificado_porcentaje
        ),
        telefono_oferente: row.telefono_oferente,
        fecha_nacimiento: row.fecha_nacimiento,
        cargo_oferente: row.cargo_oferente,
        contacto_emergencia: row.contacto_emergencia,
        parentesco: row.parentesco,
        telefono_emergencia: row.telefono_emergencia,
        correo_oferente: row.correo_oferente,
        lgtbiq: row.lgtbiq,
        grupo_etnico: row.grupo_etnico,
        grupo_etnico_cual: row.grupo_etnico_cual,
        certificado_discapacidad: row.certificado_discapacidad,
        lugar_firma_contrato: row.lugar_firma_contrato,
        fecha_firma_contrato: row.fecha_firma_contrato,
        tipo_contrato: row.tipo_contrato,
        fecha_fin: row.fecha_fin,
        empresa_nit: section1Data.nit_empresa,
        empresa_nombre: section1Data.nombre_empresa,
      });
    })
    .filter((row): row is UsuarioRecaUpsertRow => row !== null);

  return dedupeUsuariosRecaRows(rows);
}

export function buildUsuariosRecaRowsFromInduccion(
  linkedPerson: InduccionLinkedPerson,
  section1Data: InduccionSection1UsuarioRecaSource
) {
  const row = normalizeUsuarioRecaUpsertRow({
    cedula_usuario: linkedPerson.cedula,
    nombre_usuario: linkedPerson.nombre_oferente,
    telefono_oferente: linkedPerson.telefono_oferente,
    cargo_oferente: linkedPerson.cargo_oferente,
    empresa_nit: section1Data.nit_empresa,
    empresa_nombre: section1Data.nombre_empresa,
  });

  return dedupeUsuariosRecaRows(row ? [row] : []);
}

export function mapUsuarioRecaToContratacionPrefill(record: UsuarioRecaRecord) {
  const prefill = {} as Partial<
    Record<Exclude<ContratacionVinculadoFieldId, "numero">, string>
  >;

  for (const fieldId of CONTRATACION_USUARIOS_RECA_PREFILL_FIELD_IDS) {
    const sourceField = CONTRATACION_PREFILL_FIELD_MAP[fieldId];
    prefill[fieldId] =
      fieldId === "certificado_porcentaje"
        ? formatDecimalLikePercentageForDisplay(record[sourceField])
        : (record[sourceField] ?? "");
  }

  return prefill;
}

export function mapUsuarioRecaToSeleccionPrefill(record: UsuarioRecaRecord) {
  const prefill = {} as Partial<
    Record<Exclude<SeleccionOferenteFieldId, "numero">, string>
  >;

  for (const fieldId of SELECCION_USUARIOS_RECA_PREFILL_FIELD_IDS) {
    const sourceField = SELECCION_PREFILL_FIELD_MAP[fieldId];
    prefill[fieldId] =
      fieldId === "certificado_porcentaje"
        ? formatDecimalLikePercentageForDisplay(record[sourceField])
        : (record[sourceField] ?? "");
  }

  return prefill;
}

export function mapUsuarioRecaToInduccionPrefill(
  record: UsuarioRecaRecord
): UsuarioRecaInduccionPrefill {
  const prefill = {} as UsuarioRecaInduccionPrefill;

  for (const fieldId of INDUCCION_USUARIOS_RECA_PREFILL_FIELD_IDS) {
    const sourceField = INDUCCION_PREFILL_FIELD_MAP[fieldId];
    prefill[fieldId] = record[sourceField] ?? "";
  }

  return prefill;
}

export function hasContratacionUsuariosRecaReplaceTargetData(
  row: ContratacionVinculadoRow
) {
  return CONTRATACION_USUARIOS_RECA_REPLACE_TARGET_FIELD_IDS.some((fieldId) =>
    isContratacionUsuariosRecaReplaceTargetFieldMeaningful(row, fieldId)
  );
}

export function isContratacionUsuariosRecaPrefillRowEmpty(
  row: ContratacionVinculadoRow
) {
  return !CONTRATACION_USUARIOS_RECA_PREFILL_FIELD_IDS.some((fieldId) =>
    isContratacionUsuariosRecaReplaceTargetFieldMeaningful(row, fieldId)
  );
}

export function hasSeleccionUsuariosRecaReplaceTargetData(
  row: SeleccionOferenteRow
) {
  return SELECCION_USUARIOS_RECA_REPLACE_TARGET_FIELD_IDS.some((fieldId) =>
    isSeleccionUsuariosRecaReplaceTargetFieldMeaningful(row, fieldId)
  );
}

export function isSeleccionUsuariosRecaPrefillRowEmpty(row: SeleccionOferenteRow) {
  return !SELECCION_USUARIOS_RECA_PREFILL_FIELD_IDS.some((fieldId) =>
    isSeleccionUsuariosRecaReplaceTargetFieldMeaningful(row, fieldId)
  );
}

export function hasInduccionUsuariosRecaReplaceTargetData(
  row: InduccionLinkedPerson
) {
  return INDUCCION_USUARIOS_RECA_REPLACE_TARGET_FIELD_IDS.some((fieldId) =>
    isMeaningfulRepeatedPeopleValue(row[fieldId])
  );
}

export function isInduccionUsuariosRecaPrefillRowEmpty(
  row: InduccionLinkedPerson
) {
  return !INDUCCION_USUARIOS_RECA_PREFILL_FIELD_IDS.some((fieldId) =>
    isMeaningfulRepeatedPeopleValue(row[fieldId])
  );
}

export function getContratacionUsuariosRecaModifiedFieldIds(
  snapshot: UsuarioRecaRecord,
  row: ContratacionVinculadoRow
) {
  const prefill = mapUsuarioRecaToContratacionPrefill(snapshot);

  return CONTRATACION_USUARIOS_RECA_PREFILL_FIELD_IDS.filter((fieldId) => {
    return (
      normalizeComparableValue(fieldId, prefill[fieldId]) !==
      normalizeComparableValue(fieldId, row[fieldId])
    );
  });
}

export function getSeleccionUsuariosRecaModifiedFieldIds(
  snapshot: UsuarioRecaRecord,
  row: SeleccionOferenteRow
) {
  const prefill = mapUsuarioRecaToSeleccionPrefill(snapshot);

  return SELECCION_USUARIOS_RECA_PREFILL_FIELD_IDS.filter((fieldId) => {
    return (
      normalizeComparableValue(fieldId, prefill[fieldId]) !==
      normalizeComparableValue(fieldId, row[fieldId])
    );
  });
}

export function getInduccionUsuariosRecaModifiedFieldIds(
  snapshot: UsuarioRecaRecord,
  row: InduccionLinkedPerson
) {
  const prefill = mapUsuarioRecaToInduccionPrefill(snapshot);

  return INDUCCION_USUARIOS_RECA_PREFILL_FIELD_IDS.filter((fieldId) => {
    return (
      normalizeComparableValue(fieldId, prefill[fieldId]) !==
      normalizeComparableValue(fieldId, row[fieldId])
    );
  });
}

export function mapUsuarioRecaToSeguimientoPrefill(
  record: UsuarioRecaRecord
): UsuarioRecaSeguimientoPrefill {
  return {
    cedula_usuario: record.cedula_usuario,
    nombre_usuario: record.nombre_usuario ?? "",
    discapacidad_usuario: record.discapacidad_usuario ?? "",
    discapacidad_detalle: record.discapacidad_detalle ?? "",
    certificado_discapacidad: record.certificado_discapacidad ?? "",
    certificado_porcentaje: record.certificado_porcentaje ?? "",
    telefono_oferente: record.telefono_oferente ?? "",
    correo_oferente: record.correo_oferente ?? "",
    cargo_oferente: record.cargo_oferente ?? "",
    contacto_emergencia: record.contacto_emergencia ?? "",
    parentesco: record.parentesco ?? "",
    telefono_emergencia: record.telefono_emergencia ?? "",
    fecha_firma_contrato:
      normalizeSeguimientosDateInput(record.fecha_firma_contrato ?? "") ?? "",
    tipo_contrato: record.tipo_contrato ?? "",
    fecha_fin: normalizeSeguimientosDateInput(record.fecha_fin ?? "") ?? "",
    empresa_nit: record.empresa_nit ?? "",
    empresa_nombre: record.empresa_nombre ?? "",
  };
}
