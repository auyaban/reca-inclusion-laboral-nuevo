import { randomUUID } from "node:crypto";
import type { sheets_v4 } from "googleapis";
import { EMPRESA_SELECT_FIELDS } from "@/lib/empresa";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import { getDriveClient, getSheetsClient } from "@/lib/google/auth";
import {
  exportSheetToPdf,
  getOrCreateFolder,
  sanitizeFileName,
  trashDriveFile,
  uploadPdf,
} from "@/lib/google/drive";
import { requireDriveFileId } from "@/lib/google/driveQuery";
import {
  batchWriteCells,
  clearProtectedRanges,
  copyTemplate,
  keepOnlySheetsVisible,
  normalizeA1Range,
} from "@/lib/google/sheets";
import {
  SEGUIMIENTOS_BASE_STAGE_ID,
  buildSeguimientosStageDraftStateMap,
  buildSeguimientosFollowupStageId,
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFollowupValues,
  getSeguimientosFollowupDateFromBase,
  SEGUIMIENTOS_MAX_ATTENDEES,
  getSeguimientosVisibleFollowupIndexes,
  normalizeSeguimientosBaseValues,
  normalizeSeguimientosCompanyType,
  normalizeSeguimientosFollowupValues,
  type SeguimientosBaseValues,
  type SeguimientosCaseMeta,
  type SeguimientosCompanyType,
  type SeguimientosEditableStageId,
  type SeguimientosFinalSummary,
  type SeguimientosFollowupIndex,
  type SeguimientosFollowupValues,
  parseSeguimientosFollowupStageId,
} from "@/lib/seguimientos";
import {
  buildSeguimientosBaseProgress,
  buildSeguimientosFollowupProgress,
  buildSeguimientosWorkflow,
  listSeguimientosPdfOptions,
  SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS,
  type SeguimientosPdfOption,
} from "@/lib/seguimientosStages";
import {
  SEGUIMIENTOS_FINAL_SHEET_NAME,
  buildSeguimientosFinalFields,
  buildSeguimientosFinalFormulaSpec,
  evaluateSeguimientosFinalFormulas,
  sanitizeSeguimientosDirectWriteValue,
} from "@/lib/seguimientosFinalSummary";
import {
  SEGUIMIENTOS_CASE_SCHEMA_VERSION,
  withSeguimientosStageDraftStateUpdate,
  type SeguimientosBootstrapResponse,
  type SeguimientosBaseStageSaveResponse,
  type SeguimientosCaseHydration,
  type SeguimientosOverrideGrant,
  type SeguimientosPdfExportResponse,
  type SeguimientosResultRefreshResponse,
  type SeguimientosStageOverrideResponse,
  type SeguimientosStagesSaveResponse,
} from "@/lib/seguimientosRuntime";
import {
  claimSeguimientosBootstrapLease,
  releaseSeguimientosBootstrapLease,
} from "@/lib/seguimientosBootstrapLease";
import {
  createSeguimientosOverrideGrant,
  inspectSeguimientosOverrideGrantDetailed,
} from "@/lib/seguimientosOverrideGrant";
import {
  SeguimientosServerError,
  getSeguimientosErrorStatusCode,
} from "@/lib/seguimientosServerErrors";
import {
  getSeguimientosValueAtPath,
  setSeguimientosValueAtPath,
} from "@/lib/seguimientosPathAccess";
import { formatSeguimientosDateForOutput } from "@/lib/seguimientosDates";
import type { Empresa } from "@/lib/store/empresaStore";
import { getUsuarioRecaByCedula } from "@/lib/usuariosRecaServer";
import {
  mapUsuarioRecaToSeguimientoPrefill,
  normalizeCedulaUsuario,
  type UsuarioRecaRecord,
  type UsuarioRecaSeguimientoPrefill,
} from "@/lib/usuariosReca";
import { mergeSeguimientosBaseTimelineFromFollowups } from "@/lib/seguimientosStageState";

const GOOGLE_SHEETS_MIME = "application/vnd.google-apps.spreadsheet";
const SEGUIMIENTOS_FOLDER_NAME = "SEGUIMIENTOS";
const SEGUIMIENTOS_KIND = "seguimiento_il";
const SHEET_BASE = "9. SEGUIMIENTO AL PROCESO DE INCLUSION LABORAL";
const LEGACY_SHEET_BASE = "9. SEGUIMIENTO AL PROCESO DE INCLUSIÓN LABORAL";
const LEGACY_SHEET_BASE_DOUBLE_SPACE = "9.  SEGUIMIENTO AL PROCESO DE INCLUSION LABORAL";
const LEGACY_SHEET_BASE_SHORT = "9.  SEGUIMIENTO AL PROCESO DE I";
const SHEET_FINAL = SEGUIMIENTOS_FINAL_SHEET_NAME;
const SHEET_PREFIX = "SEGUIMIENTO PROCESO IL ";
const FOLLOWUP_DATE_LABEL = "Fecha seguimiento:";
const FOLLOWUP_DATE_LABEL_CELL = "U8";
const FOLLOWUP_DATE_VALUE_CELL = "X8";
const FOLLOWUP_ATTENDEES_START_ROW = 47;
const BASE_SHEET_CANDIDATES = [
  SHEET_BASE,
  LEGACY_SHEET_BASE,
  LEGACY_SHEET_BASE_DOUBLE_SPACE,
  LEGACY_SHEET_BASE_SHORT,
] as const;
const BASE_DATE_FIELD_IDS = new Set<keyof SeguimientosBaseValues>([
  "fecha_visita",
  "fecha_inicio_contrato",
  "fecha_fin_contrato",
  "fecha_firma_contrato",
]);

function logSeguimientosServerEvent(
  event: string,
  payload: Record<string, unknown>
) {
  console.info(`[seguimientos] ${event}`, payload);
}

function isSeguimientosOverrideSecretError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("SEGUIMIENTOS_OVERRIDE_SECRET")
  );
}

function buildSeguimientosOverrideUnavailableError() {
  return new SeguimientosServerError(
    "override_unavailable",
    "La configuracion de desbloqueo no esta disponible en este momento. Intenta mas tarde o contacta soporte.",
    getSeguimientosErrorStatusCode("override_unavailable")
  );
}

function assertSeguimientosCaseUpdatedAt(options: {
  caseId: string;
  userId: string;
  expectedCaseUpdatedAt?: string | null;
  currentCaseUpdatedAt: string | null;
}) {
  const expectedCaseUpdatedAt = options.expectedCaseUpdatedAt?.trim() || null;
  const currentCaseUpdatedAt = options.currentCaseUpdatedAt?.trim() || null;
  if (!expectedCaseUpdatedAt || expectedCaseUpdatedAt === currentCaseUpdatedAt) {
    return;
  }

  logSeguimientosServerEvent("case_conflict_on_save", {
    caseId: options.caseId,
    userId: options.userId,
    result: "rejected",
    reason: "stale_expected_updated_at",
    expectedCaseUpdatedAt,
    currentCaseUpdatedAt,
  });
  throw new SeguimientosServerError(
    "case_conflict",
    "Este caso cambio en otra pestaña o sesion. Recargalo antes de guardar.",
    getSeguimientosErrorStatusCode("case_conflict"),
    {
      currentCaseUpdatedAt,
    }
  );
}

type SeguimientosHydrationMaintenanceMode = "eager" | "passive";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

type EmpresaResolutionRequired = {
  status: "resolution_required";
  reason: "empresa";
  context: Record<string, unknown>;
};

type EmpresaResolution =
  | { status: "ready"; empresa: Empresa }
  | EmpresaResolutionRequired;

type GoogleDriveFile = {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  modifiedTime?: string | null;
  createdTime?: string | null;
  parents?: string[] | null;
  appProperties?: Record<string, string> | null;
};

const BASE_SHEET_FIELD_MAP = {
  fecha_visita: "D8",
  modalidad: "R8",
  nombre_empresa: "D9",
  ciudad_empresa: "R9",
  direccion_empresa: "D10",
  nit_empresa: "R10",
  correo_1: "D11",
  telefono_empresa: "R11",
  contacto_empresa: "D12",
  cargo: "R12",
  asesor: "D13",
  sede_empresa: "R13",
  nombre_vinculado: "A16",
  cedula: "E16",
  telefono_vinculado: "I16",
  correo_vinculado: "K16",
  contacto_emergencia: "P16",
  parentesco: "S16",
  telefono_emergencia: "U16",
  cargo_vinculado: "A18",
  certificado_discapacidad: "E18",
  certificado_porcentaje: "I18",
  discapacidad: "N18",
  tipo_contrato: "C20",
  fecha_inicio_contrato: "M20",
  fecha_fin_contrato: "T20",
  apoyos_ajustes: "E21",
} as const satisfies Record<string, string>;

const PONDERADO_COMPANY_MAP = {
  fecha_visita: "D6",
  modalidad: "Q6",
  nombre_empresa: "D7",
  ciudad_empresa: "Q7",
  direccion_empresa: "D8",
  nit_empresa: "Q8",
  correo_1: "D9",
  telefono_empresa: "Q9",
  contacto_empresa: "D10",
  cargo: "Q10",
  caja_compensacion: "D11",
  sede_empresa: "Q11",
  asesor: "D12",
  profesional_asignado: "Q12",
} as const satisfies Record<string, string>;

const PONDERADO_USER_MAP = {
  nombre_vinculado: "K15",
  cedula: "Q15",
  telefono_vinculado: "S15",
  correo_vinculado: "U15",
  cargo_vinculado: "K17",
  certificado_discapacidad: "Q17",
  certificado_porcentaje: "U17",
  fecha_firma_contrato: "N18",
  discapacidad: "U18",
} as const satisfies Record<string, string>;

const PONDERADO_FUNCTION_LAYOUT = [
  { cell: "L20", source: "funciones_1_5", index: 0 },
  { cell: "R20", source: "funciones_6_10", index: 0 },
  { cell: "L21", source: "funciones_1_5", index: 1 },
  { cell: "R21", source: "funciones_6_10", index: 1 },
  { cell: "L22", source: "funciones_1_5", index: 2 },
  { cell: "R22", source: "funciones_6_10", index: 2 },
  { cell: "L23", source: "funciones_1_5", index: 3 },
  { cell: "R23", source: "funciones_6_10", index: 3 },
  { cell: "L24", source: "funciones_1_5", index: 4 },
  { cell: "R24", source: "funciones_6_10", index: 4 },
] as const satisfies readonly {
  cell: string;
  source: "funciones_1_5" | "funciones_6_10";
  index: number;
}[];

function normalizeComparableText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-CO");
}

function buildCaseFolderName(nombreUsuario: unknown, cedula: string) {
  const tokens = String(nombreUsuario ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = tokens[0] ?? "Usuario";
  const lastName = tokens.length > 1 ? tokens[tokens.length - 1] : "SinApellido";

  return `${firstName} ${lastName} - ${cedula}`
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSeguimientosTemplateId() {
  const templateId =
    process.env.GOOGLE_SHEETS_SEGUIMIENTOS_TEMPLATE_ID?.trim() ||
    process.env.GOOGLE_SHEETS_MASTER_ID?.trim() ||
    "";

  if (!templateId) {
    throw new Error(
      "Falta GOOGLE_SHEETS_SEGUIMIENTOS_TEMPLATE_ID o GOOGLE_SHEETS_MASTER_ID."
    );
  }

  return templateId;
}

function getSeguimientosRootFolderId() {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || "";
  if (!rootFolderId) {
    throw new Error("Falta GOOGLE_DRIVE_FOLDER_ID para preparar Seguimientos.");
  }

  return rootFolderId;
}

function getFollowupSheetName(index: SeguimientosFollowupIndex) {
  return `${SHEET_PREFIX}${index}`;
}

function buildVisibleSeguimientosSheetNames(
  baseSheetName: string,
  companyType: SeguimientosCompanyType
) {
  return [
    baseSheetName,
    ...getSeguimientosVisibleFollowupIndexes(companyType).map((followupIndex) =>
      getFollowupSheetName(followupIndex)
    ),
    SHEET_FINAL,
  ];
}

function inferMaxFollowupsFromSheetVisibility(
  sheets: Array<{ title: string; hidden: boolean }>
): 3 | 6 {
  const visibleFollowups = sheets.filter((sheet) => {
    return sheet.title.startsWith(SHEET_PREFIX) && !sheet.hidden;
  }).length;

  if (visibleFollowups >= 6) {
    return 6;
  }

  if (visibleFollowups >= 3) {
    return 3;
  }

  const totalFollowups = sheets.filter((sheet) =>
    sheet.title.startsWith(SHEET_PREFIX)
  ).length;

  return totalFollowups >= 6 ? 6 : 3;
}

function resolveBaseSheetName(sheets: Array<{ title: string }>) {
  for (const candidate of BASE_SHEET_CANDIDATES) {
    const match = sheets.find((sheet) => sheet.title === candidate);
    if (match) {
      return match.title;
    }
  }

  return SHEET_BASE;
}

function firstBatchValue(
  valuesByRange: Record<string, unknown[][]>,
  rangeName: string
) {
  const rows = valuesByRange[normalizeA1Range(rangeName)] ?? [];
  const firstRow = rows[0];
  const firstValue = Array.isArray(firstRow) ? firstRow[0] : null;
  return firstValue == null ? "" : String(firstValue).trim();
}

function firstBatchDirectWriteValue(
  valuesByRange: Record<string, unknown[][]>,
  rangeName: string
) {
  return sanitizeSeguimientosDirectWriteValue(
    firstBatchValue(valuesByRange, rangeName)
  );
}

function columnBatchValues(
  valuesByRange: Record<string, unknown[][]>,
  rangeName: string,
  expectedCount: number
) {
  const rows = valuesByRange[normalizeA1Range(rangeName)] ?? [];
  return Array.from({ length: expectedCount }, (_, index) => {
    const row = rows[index];
    const value = Array.isArray(row) ? row[0] : null;
    return value == null ? "" : String(value).trim();
  });
}

function columnBatchDirectWriteValues(
  valuesByRange: Record<string, unknown[][]>,
  rangeName: string,
  expectedCount: number
) {
  return columnBatchValues(valuesByRange, rangeName, expectedCount).map((value) =>
    sanitizeSeguimientosDirectWriteValue(value)
  );
}

function formatSeguimientosDateWriteValue(value: string | null | undefined) {
  return formatSeguimientosDateForOutput(value ?? "", "");
}

function getFollowupAttendeeRows() {
  return Array.from(
    { length: SEGUIMIENTOS_MAX_ATTENDEES },
    (_, index) => FOLLOWUP_ATTENDEES_START_ROW + index
  );
}

async function batchReadValues(
  spreadsheetId: string,
  ranges: string[],
  valueRenderOption?: sheets_v4.Params$Resource$Spreadsheets$Values$Batchget["valueRenderOption"]
) {
  if (ranges.length === 0) {
    return {};
  }

  const sheets = getSheetsClient();
  const normalizedRanges = ranges.map((range) => normalizeA1Range(range));
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: normalizedRanges,
    valueRenderOption,
  });
  const valuesByRange: Record<string, unknown[][]> = {};

  for (const valueRange of response.data.valueRanges ?? []) {
    const rangeName = normalizeA1Range(String(valueRange.range ?? ""));
    valuesByRange[rangeName] =
      (valueRange.values as unknown[][] | undefined) ?? [];
  }

  return valuesByRange;
}

function extractSingleCellValuesByCell(
  valuesByRange: Record<string, unknown[][]>,
  rangesByCell: Record<string, string>
) {
  return Object.entries(rangesByCell).reduce<Record<string, string>>(
    (accumulator, [cell, rangeName]) => {
      accumulator[cell] = firstBatchValue(valuesByRange, rangeName);
      return accumulator;
    },
    {}
  );
}

function buildSeguimientosDirectWriteFormulaRanges(baseSheetName: string) {
  const ranges = [
    ...Object.values(BASE_SHEET_FIELD_MAP).map(
      (cell) => `'${baseSheetName}'!${cell}`
    ),
    ...[23, 24, 25, 26, 27].flatMap((row) => [
      `'${baseSheetName}'!B${row}`,
      `'${baseSheetName}'!N${row}`,
    ]),
    ...[29, 30, 31].flatMap((row) => [
      `'${baseSheetName}'!C${row}`,
      `'${baseSheetName}'!P${row}`,
    ]),
    ...Object.values(PONDERADO_COMPANY_MAP).map(
      (cell) => `'${SHEET_FINAL}'!${cell}`
    ),
    ...Object.values(PONDERADO_USER_MAP).map((cell) => `'${SHEET_FINAL}'!${cell}`),
    ...PONDERADO_FUNCTION_LAYOUT.map((entry) => `'${SHEET_FINAL}'!${entry.cell}`),
  ];

  return Array.from(new Set(ranges.map((range) => normalizeA1Range(range))));
}

async function listSpreadsheetSheets(spreadsheetId: string) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  return (response.data.sheets ?? [])
    .map((sheet) => sheet.properties)
    .filter(
      (
        props
      ): props is NonNullable<sheets_v4.Schema$Sheet["properties"]> =>
        Boolean(props?.sheetId != null && props?.title)
    )
    .map((props) => ({
      sheetId: props.sheetId!,
      title: String(props.title ?? "").trim(),
      hidden: Boolean(props.hidden),
    }));
}

async function listDriveFiles(parentFolderId: string) {
  const drive = getDriveClient();
  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and trashed = false`,
    fields:
      "files(id,name,mimeType,webViewLink,createdTime,modifiedTime,parents,appProperties)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 200,
    orderBy: "modifiedTime desc",
  });

  return (response.data.files ?? []) as GoogleDriveFile[];
}

async function findCaseFolder(params: {
  seguimientosFolderId: string;
  cedula: string;
  preferredFolderName: string;
}) {
  const files = await listDriveFiles(params.seguimientosFolderId);
  const exactMatch = files.find((file) => {
    return (
      file.mimeType === "application/vnd.google-apps.folder" &&
      String(file.name ?? "").trim() === params.preferredFolderName
    );
  });

  if (exactMatch) {
    return exactMatch;
  }

  const suffix = `- ${params.cedula}`;
  return (
    files.find((file) => {
      return (
        file.mimeType === "application/vnd.google-apps.folder" &&
        String(file.name ?? "").trim().endsWith(suffix)
      );
    }) ?? null
  );
}

function buildFallbackEmpresaSnapshot(options: {
  empresaNit: string;
  empresaNombre: string;
  cajaCompensacion?: string | null;
  profesionalAsignado?: string | null;
}) {
  return {
    id: `seguimientos-${options.empresaNit || options.empresaNombre || "empresa"}`,
    nombre_empresa: options.empresaNombre || "Empresa sin nombre",
    nit_empresa: options.empresaNit || null,
    direccion_empresa: null,
    ciudad_empresa: null,
    sede_empresa: null,
    zona_empresa: null,
    correo_1: null,
    contacto_empresa: null,
    telefono_empresa: null,
    cargo: null,
    profesional_asignado: options.profesionalAsignado ?? null,
    correo_profesional: null,
    asesor: null,
    correo_asesor: null,
    caja_compensacion: options.cajaCompensacion ?? null,
  } satisfies Empresa;
}

function buildBasePrefillValues(
  empresa: Empresa | null,
  personPrefill: UsuarioRecaSeguimientoPrefill
) {
  const defaults = createEmptySeguimientosBaseValues(empresa);
  const discapacidad =
    personPrefill.discapacidad_detalle || personPrefill.discapacidad_usuario;

  return normalizeSeguimientosBaseValues(
    {
      ...defaults,
      nombre_vinculado: personPrefill.nombre_usuario,
      cedula: personPrefill.cedula_usuario,
      telefono_vinculado: personPrefill.telefono_oferente,
      correo_vinculado: personPrefill.correo_oferente,
      contacto_emergencia: personPrefill.contacto_emergencia,
      parentesco: personPrefill.parentesco,
      telefono_emergencia: personPrefill.telefono_emergencia,
      cargo_vinculado: personPrefill.cargo_oferente,
      certificado_discapacidad: personPrefill.certificado_discapacidad,
      certificado_porcentaje: personPrefill.certificado_porcentaje,
      discapacidad,
      tipo_contrato: personPrefill.tipo_contrato,
      fecha_firma_contrato: personPrefill.fecha_firma_contrato,
      fecha_fin_contrato: personPrefill.fecha_fin,
      sede_empresa: getEmpresaSedeCompensarValue(empresa),
      caja_compensacion: empresa?.caja_compensacion ?? defaults.caja_compensacion,
      profesional_asignado:
        empresa?.profesional_asignado ?? defaults.profesional_asignado,
    },
    empresa
  );
}

const BASE_PREFILL_FALLBACK_FIELDS = [
  "nombre_empresa",
  "ciudad_empresa",
  "direccion_empresa",
  "nit_empresa",
  "correo_1",
  "telefono_empresa",
  "contacto_empresa",
  "cargo",
  "asesor",
  "sede_empresa",
  "caja_compensacion",
  "profesional_asignado",
  "nombre_vinculado",
  "cedula",
  "telefono_vinculado",
  "correo_vinculado",
] as const satisfies readonly (keyof SeguimientosBaseValues)[];

function mergeBaseValuesWithPrefill(
  baseValues: SeguimientosBaseValues,
  prefill: SeguimientosBaseValues,
  empresa: Empresa | null
) {
  const hasMeaningfulBase = buildSeguimientosBaseProgress(baseValues)
    .hasMeaningfulContent;
  if (!hasMeaningfulBase) {
    return normalizeSeguimientosBaseValues(prefill, empresa);
  }

  const mergedValues = {
    ...prefill,
    ...baseValues,
    funciones_1_5: baseValues.funciones_1_5,
    funciones_6_10: baseValues.funciones_6_10,
    seguimiento_fechas_1_3: baseValues.seguimiento_fechas_1_3,
    seguimiento_fechas_4_6: baseValues.seguimiento_fechas_4_6,
  } satisfies SeguimientosBaseValues;

  for (const fieldId of BASE_PREFILL_FALLBACK_FIELDS) {
    if (!String(baseValues[fieldId] ?? "").trim()) {
      mergedValues[fieldId] = prefill[fieldId];
    }
  }

  return normalizeSeguimientosBaseValues(
    mergedValues,
    empresa
  );
}

async function findEmpresasByNit(
  nit: string,
  supabase: ServerSupabaseClient
): Promise<Empresa[]> {
  if (!nit.trim()) {
    return [] as Empresa[];
  }

  const { data, error } = await supabase
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .eq("nit_empresa", nit)
    .limit(5);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as Empresa[]).slice();
}

async function findEmpresasByNormalizedName(
  nombre: string,
  supabase: ServerSupabaseClient
): Promise<Empresa[]> {
  if (!nombre.trim()) {
    return [] as Empresa[];
  }

  const searchTerms = nombre
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .slice(0, 3);
  const primaryQuery = searchTerms[0] ?? nombre.trim();

  const { data, error } = await supabase
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .ilike("nombre_empresa", `%${primaryQuery}%`)
    .limit(25);

  if (error) {
    throw error;
  }

  const normalizedTarget = normalizeComparableText(nombre);
  const results = (((data ?? []) as unknown as Empresa[]) ?? []).filter((empresa) => {
    const normalizedName = normalizeComparableText(empresa.nombre_empresa);
    if (normalizedName === normalizedTarget) {
      return true;
    }

    return searchTerms.every((term) =>
      normalizedName.includes(normalizeComparableText(term))
    );
  });

  const uniqueById = new Map<string, Empresa>();
  for (const empresa of results) {
    uniqueById.set(empresa.id, empresa);
  }

  return [...uniqueById.values()];
}

async function resolveEmpresaForUser(options: {
  userRow: UsuarioRecaRecord;
  supabase: ServerSupabaseClient;
}): Promise<EmpresaResolution> {
  const nit = String(options.userRow.empresa_nit ?? "").trim();
  const nombre = String(options.userRow.empresa_nombre ?? "").trim();

  if (nit) {
    const byNit = await findEmpresasByNit(nit, options.supabase);
    if (byNit.length === 1) {
      return { status: "ready" as const, empresa: byNit[0] };
    }

    if (byNit.length > 1) {
      return {
        status: "resolution_required" as const,
        reason: "empresa" as const,
        context: {
          source: "nit",
          nit,
          nombre,
          candidates: byNit.map((empresa) => ({
            id: empresa.id,
            nombre_empresa: empresa.nombre_empresa,
            nit_empresa: empresa.nit_empresa,
          })),
        },
      };
    }
  }

  const byName = await findEmpresasByNormalizedName(nombre, options.supabase);
  if (byName.length === 1) {
    return { status: "ready" as const, empresa: byName[0] };
  }

  return {
    status: "resolution_required" as const,
    reason: "empresa" as const,
    context: {
      source: nit ? "nombre_fallback" : "nombre",
      nit,
      nombre,
      candidates: byName.map((empresa) => ({
        id: empresa.id,
        nombre_empresa: empresa.nombre_empresa,
        nit_empresa: empresa.nit_empresa,
      })),
    },
  };
}

function resolveCompanyType(options: {
  empresa: Empresa | null;
  companyTypeOverride?: SeguimientosCompanyType | null;
  persistedCompanyType?: SeguimientosCompanyType | null;
}):
  | { status: "ready"; companyType: SeguimientosCompanyType }
  | {
      status: "resolution_required";
      reason: "company_type";
      context: Record<string, unknown>;
    } {
  if (options.persistedCompanyType) {
    return { status: "ready" as const, companyType: options.persistedCompanyType };
  }

  if (options.companyTypeOverride) {
    return { status: "ready" as const, companyType: options.companyTypeOverride };
  }

  const cajaCompensacion = String(options.empresa?.caja_compensacion ?? "").trim();
  if (!cajaCompensacion) {
    return {
      status: "resolution_required" as const,
      reason: "company_type" as const,
      context: {
        caja_compensacion: cajaCompensacion,
        empresa_nombre: options.empresa?.nombre_empresa ?? "",
      },
    };
  }

  const normalizedCaja = normalizeComparableText(cajaCompensacion);
  return {
    status: "ready" as const,
    companyType: normalizedCaja === "compensar" ? "compensar" : "no_compensar",
  };
}

async function readDriveFile(fileId: string) {
  const drive = getDriveClient();
  const response = await drive.files.get({
    fileId,
    fields:
      "id,name,mimeType,webViewLink,createdTime,modifiedTime,parents,appProperties",
    supportsAllDrives: true,
  });

  return response.data as GoogleDriveFile;
}

function getAppProperty(
  appProperties: Record<string, string> | null | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = appProperties?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getCaseOwnerUserId(
  appProperties: Record<string, string> | null | undefined
) {
  return getAppProperty(appProperties, "owner_user_id");
}

function getCaseOwnerClaimedAt(
  appProperties: Record<string, string> | null | undefined
) {
  return getAppProperty(appProperties, "owner_claimed_at");
}

function buildCaseAppProperties(params: {
  caseId: string;
  cedula: string;
  empresaNit: string;
  empresaNombre: string;
  companyType: SeguimientosCompanyType;
  maxFollowups: 3 | 6;
  baseSheetName: string;
  folderId: string;
  ownerUserId?: string | null;
  ownerClaimedAt?: string | null;
}) {
  return {
    kind: SEGUIMIENTOS_KIND,
    schema_version: String(SEGUIMIENTOS_CASE_SCHEMA_VERSION),
    cedula: params.cedula,
    empresa_nit: params.empresaNit,
    empresa_nombre: params.empresaNombre,
    company_type: params.companyType,
    max_followups: String(params.maxFollowups),
    max_seguimientos: String(params.maxFollowups),
    base_sheet_name: params.baseSheetName,
    folder_id: params.folderId,
    spreadsheet_id: params.caseId,
    ...(params.ownerUserId?.trim()
      ? {
          owner_user_id: params.ownerUserId.trim(),
          owner_claimed_at:
            params.ownerClaimedAt?.trim() ?? new Date().toISOString(),
        }
      : {}),
  } satisfies Record<string, string>;
}

function assertSeguimientosCaseOwnership(options: {
  appProperties: Record<string, string> | null | undefined;
  userId: string;
}) {
  const ownerUserId = getCaseOwnerUserId(options.appProperties);
  if (!ownerUserId) {
    throw new SeguimientosServerError(
      "case_reclaim_required",
      "Este caso todavia no tiene ownership asignado. Vuelve a abrirlo por cédula para reclamarlo antes de continuar.",
      getSeguimientosErrorStatusCode("case_reclaim_required")
    );
  }

  if (ownerUserId !== options.userId) {
    throw new SeguimientosServerError(
      "case_access_denied",
      "No tienes permisos para abrir o modificar este caso de Seguimientos.",
      getSeguimientosErrorStatusCode("case_access_denied")
    );
  }

  return {
    ownerUserId,
    ownerClaimedAt: getCaseOwnerClaimedAt(options.appProperties) || null,
  };
}

async function claimSeguimientosCaseOwnership(options: {
  file: GoogleDriveFile;
  userId: string;
}) {
  const fileId = requireDriveFileId(
    options.file.id,
    "reclamar ownership del caso de seguimientos"
  );
  const claimedAt = new Date().toISOString();

  await updateCaseAppProperties(fileId, {
    ...(options.file.appProperties ?? {}),
    owner_user_id: options.userId,
    owner_claimed_at: claimedAt,
  });

  return readDriveFile(fileId);
}

async function readOwnedSeguimientosCaseFile(options: {
  caseId: string;
  userId: string;
}) {
  const file = await readDriveFile(options.caseId);
  if (String(file.mimeType ?? "").trim() !== GOOGLE_SHEETS_MIME) {
    throw new Error("El caseId solicitado no corresponde a un spreadsheet de Google.");
  }

  assertSeguimientosCaseOwnership({
    appProperties: file.appProperties,
    userId: options.userId,
  });

  return file;
}

async function updateCaseAppProperties(
  fileId: string,
  appProperties: Record<string, string>
) {
  const drive = getDriveClient();
  await drive.files.update({
    fileId,
    requestBody: {
      appProperties,
    },
    fields: "id,appProperties,modifiedTime",
    supportsAllDrives: true,
  });
}

function haveCaseAppPropertiesChanged(
  currentAppProperties: Record<string, string> | null | undefined,
  nextAppProperties: Record<string, string>
) {
  const currentEntries = Object.entries(currentAppProperties ?? {}).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0
  );
  const nextEntries = Object.entries(nextAppProperties).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0
  );

  if (currentEntries.length !== nextEntries.length) {
    return true;
  }

  return nextEntries.some(([key, value]) => currentAppProperties?.[key] !== value);
}

function getSeguimientosErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as Record<string, unknown>;
  if (typeof candidate.status === "number") {
    return candidate.status;
  }
  if (typeof candidate.code === "number") {
    return candidate.code;
  }

  const response =
    typeof candidate.response === "object" &&
    candidate.response !== null
      ? (candidate.response as Record<string, unknown>)
      : null;
  if (response && typeof response.status === "number") {
    return response.status;
  }

  return null;
}

function listSeguimientosGoogleErrorReasons(error: unknown) {
  if (!error || typeof error !== "object") {
    return [];
  }

  const candidate = error as Record<string, unknown>;
  const rawErrors = Array.isArray(candidate.errors)
    ? candidate.errors
    : typeof candidate.response === "object" &&
        candidate.response !== null &&
        Array.isArray((candidate.response as Record<string, unknown>).errors)
      ? ((candidate.response as Record<string, unknown>).errors as unknown[])
      : [];

  return rawErrors
    .map((entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>).reason === "string"
        ? String((entry as Record<string, unknown>).reason)
        : ""
    )
    .filter(Boolean);
}

function isSeguimientosRetryableGoogleStorageError(error: unknown) {
  const status = getSeguimientosErrorStatus(error);
  if (status === 429 || status === 503 || status === 504) {
    return true;
  }

  const reasons = listSeguimientosGoogleErrorReasons(error).map((reason) =>
    reason.toLowerCase()
  );
  if (
    reasons.some((reason) =>
      [
        "ratelimitexceeded",
        "userratelimitexceeded",
        "quotaexceeded",
        "resource_exhausted",
      ].includes(reason)
    )
  ) {
    return true;
  }

  const normalizedMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "string"
        ? error.toLowerCase()
        : "";

  return (
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("userratelimitexceeded") ||
    normalizedMessage.includes("quotaexceeded") ||
    normalizedMessage.includes("resource_exhausted")
  );
}

function normalizeSeguimientosBootstrapStorageError(error: unknown) {
  if (isSeguimientosRetryableGoogleStorageError(error)) {
    return {
      code: "google_storage_quota_exceeded" as const,
      message:
        "Google Drive/Sheets no pudo preparar el caso por limite temporal de cuota. Intenta de nuevo en unos minutos.",
    };
  }

  return {
    code: "case_bootstrap_storage_failed" as const,
    message: "No se pudo preparar el archivo de Seguimientos en Google Drive.",
  };
}

function buildCaseMeta(options: {
  file: GoogleDriveFile;
  folderId: string;
  folderName: string;
  empresa: Empresa | null;
  baseValues: SeguimientosBaseValues;
  companyType: SeguimientosCompanyType;
  maxFollowups: 3 | 6;
  baseSheetName: string;
}) {
  const spreadsheetId = requireDriveFileId(
    options.file.id,
    "resolver spreadsheet de seguimientos"
  );

  return {
    caseId: spreadsheetId,
    cedula:
      getAppProperty(options.file.appProperties, "cedula") ||
      options.baseValues.cedula,
    nombreVinculado:
      options.baseValues.nombre_vinculado ||
      String(options.file.name ?? "").trim(),
    empresaNit:
      getAppProperty(options.file.appProperties, "empresa_nit") ||
      options.empresa?.nit_empresa?.trim() ||
      options.baseValues.nit_empresa,
    empresaNombre:
      getAppProperty(options.file.appProperties, "empresa_nombre") ||
      options.empresa?.nombre_empresa?.trim() ||
      options.baseValues.nombre_empresa,
    companyType: options.companyType,
    maxFollowups: options.maxFollowups,
    driveFolderId: options.folderId,
    spreadsheetId,
    spreadsheetUrl:
      String(options.file.webViewLink ?? "").trim() ||
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    folderName: options.folderName,
    baseSheetName: options.baseSheetName,
    profesionalAsignado:
      options.baseValues.profesional_asignado ||
      options.empresa?.profesional_asignado ||
      null,
    cajaCompensacion:
      options.baseValues.caja_compensacion ||
      options.empresa?.caja_compensacion ||
      null,
    createdAt: String(options.file.createdTime ?? "").trim() || null,
    updatedAt: String(options.file.modifiedTime ?? "").trim() || null,
  } satisfies SeguimientosCaseMeta;
}

function buildFinalSheetRangesByCell(cells: string[]) {
  return cells.reduce<Record<string, string>>((accumulator, cell) => {
    accumulator[cell] = `'${SHEET_FINAL}'!${cell}`;
    return accumulator;
  }, {});
}

async function readSeguimientosFinalSummaryFromSpreadsheet(options: {
  spreadsheetId: string;
  baseSheetName: string;
  attemptRepair?: boolean;
}) {
  const formulaSpec = buildSeguimientosFinalFormulaSpec();
  let formulaEvaluation = evaluateSeguimientosFinalFormulas(formulaSpec, {});
  let lastRepairedAt: string | null = null;

  if (formulaSpec.formulaCells.length > 0) {
    const formulaRangesByCell = buildFinalSheetRangesByCell(
      formulaSpec.formulaCells.map((entry) => entry.cell)
    );
    const formulaRead = await batchReadValues(
      options.spreadsheetId,
      Object.values(formulaRangesByCell),
      "FORMULA"
    );
    formulaEvaluation = evaluateSeguimientosFinalFormulas(
      formulaSpec,
      extractSingleCellValuesByCell(formulaRead, formulaRangesByCell)
    );

    if (options.attemptRepair && formulaEvaluation.mismatchedCells.length > 0) {
      await batchWriteCells(
        options.spreadsheetId,
        formulaEvaluation.writeBacks.map((writeBack) => ({
          range: `'${SHEET_FINAL}'!${writeBack.cell}`,
          value: writeBack.formula,
        }))
      );
      lastRepairedAt = new Date().toISOString();

      const repairedFormulaRead = await batchReadValues(
        options.spreadsheetId,
        Object.values(formulaRangesByCell),
        "FORMULA"
      );
      formulaEvaluation = evaluateSeguimientosFinalFormulas(
        formulaSpec,
        extractSingleCellValuesByCell(repairedFormulaRead, formulaRangesByCell)
      );
    }
  }

  const readRangesByCell = buildFinalSheetRangesByCell(
    formulaSpec.readFields.map((field) => field.cell)
  );
  const readValues = await batchReadValues(
    options.spreadsheetId,
    Object.values(readRangesByCell)
  );
  const timestamp = new Date().toISOString();

  return {
    stageId: "final_result",
    status: "review_only",
    formulaIntegrity: formulaEvaluation.integrity,
    formulaValidationMode: formulaSpec.validationMode,
    lastVerifiedAt: timestamp,
    lastRepairedAt,
    lastComputedAt: timestamp,
    exportReady: formulaEvaluation.integrity === "healthy",
    issues: formulaEvaluation.issues,
    fields: buildSeguimientosFinalFields(
      formulaSpec,
      extractSingleCellValuesByCell(readValues, readRangesByCell)
    ),
  } satisfies SeguimientosFinalSummary;
}

async function readBaseValuesFromSpreadsheet(options: {
  spreadsheetId: string;
  baseSheetName: string;
  empresa: Empresa | null;
}) {
  const ranges = [
    `'${options.baseSheetName}'!D8`,
    `'${options.baseSheetName}'!R8`,
    `'${options.baseSheetName}'!D9`,
    `'${options.baseSheetName}'!R9`,
    `'${options.baseSheetName}'!D10`,
    `'${options.baseSheetName}'!R10`,
    `'${options.baseSheetName}'!D11`,
    `'${options.baseSheetName}'!R11`,
    `'${options.baseSheetName}'!D12`,
    `'${options.baseSheetName}'!R12`,
    `'${options.baseSheetName}'!D13`,
    `'${options.baseSheetName}'!R13`,
    `'${options.baseSheetName}'!A16`,
    `'${options.baseSheetName}'!E16`,
    `'${options.baseSheetName}'!I16`,
    `'${options.baseSheetName}'!K16`,
    `'${options.baseSheetName}'!P16`,
    `'${options.baseSheetName}'!S16`,
    `'${options.baseSheetName}'!U16`,
    `'${options.baseSheetName}'!A18`,
    `'${options.baseSheetName}'!E18`,
    `'${options.baseSheetName}'!I18`,
    `'${options.baseSheetName}'!N18`,
    `'${options.baseSheetName}'!C20`,
    `'${options.baseSheetName}'!M20`,
    `'${options.baseSheetName}'!T20`,
    `'${options.baseSheetName}'!E21`,
    `'${options.baseSheetName}'!B23:B27`,
    `'${options.baseSheetName}'!N23:N27`,
    `'${options.baseSheetName}'!C29:C31`,
    `'${options.baseSheetName}'!P29:P31`,
    `'${SHEET_FINAL}'!D11`,
    `'${SHEET_FINAL}'!Q12`,
    `'${SHEET_FINAL}'!N18`,
  ];

  const values = await batchReadValues(options.spreadsheetId, ranges);
  return normalizeSeguimientosBaseValues(
    {
      fecha_visita: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!D8`
      ),
      modalidad: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!R8`
      ),
      nombre_empresa: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!D9`
      ),
      ciudad_empresa: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!R9`
      ),
      direccion_empresa: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!D10`
      ),
      nit_empresa: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!R10`
      ),
      correo_1: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!D11`
      ),
      telefono_empresa: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!R11`
      ),
      contacto_empresa: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!D12`
      ),
      cargo: firstBatchDirectWriteValue(values, `'${options.baseSheetName}'!R12`),
      asesor: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!D13`
      ),
      sede_empresa: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!R13`
      ),
      caja_compensacion: firstBatchDirectWriteValue(values, `'${SHEET_FINAL}'!D11`),
      profesional_asignado: firstBatchDirectWriteValue(
        values,
        `'${SHEET_FINAL}'!Q12`
      ),
      nombre_vinculado: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!A16`
      ),
      cedula: firstBatchDirectWriteValue(values, `'${options.baseSheetName}'!E16`),
      telefono_vinculado: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!I16`
      ),
      correo_vinculado: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!K16`
      ),
      contacto_emergencia: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!P16`
      ),
      parentesco: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!S16`
      ),
      telefono_emergencia: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!U16`
      ),
      cargo_vinculado: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!A18`
      ),
      certificado_discapacidad: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!E18`
      ),
      certificado_porcentaje: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!I18`
      ),
      discapacidad: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!N18`
      ),
      tipo_contrato: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!C20`
      ),
      fecha_inicio_contrato: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!M20`
      ),
      fecha_fin_contrato: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!T20`
      ),
      fecha_firma_contrato: firstBatchDirectWriteValue(
        values,
        `'${SHEET_FINAL}'!N18`
      ),
      apoyos_ajustes: firstBatchDirectWriteValue(
        values,
        `'${options.baseSheetName}'!E21`
      ),
      funciones_1_5: columnBatchDirectWriteValues(
        values,
        `'${options.baseSheetName}'!B23:B27`,
        5
      ),
      funciones_6_10: columnBatchDirectWriteValues(
        values,
        `'${options.baseSheetName}'!N23:N27`,
        5
      ),
      seguimiento_fechas_1_3: columnBatchDirectWriteValues(
        values,
        `'${options.baseSheetName}'!C29:C31`,
        3
      ),
      seguimiento_fechas_4_6: columnBatchDirectWriteValues(
        values,
        `'${options.baseSheetName}'!P29:P31`,
        3
      ),
    },
    options.empresa
  );
}

async function readFollowupValuesFromSpreadsheet(options: {
  spreadsheetId: string;
  followupIndex: SeguimientosFollowupIndex;
}) {
  const sheetName = getFollowupSheetName(options.followupIndex);
  const attendeeRows = getFollowupAttendeeRows();
  const attendeesNamesRange = `'${sheetName}'!D${attendeeRows[0]}:D${attendeeRows.at(-1)}`;
  const attendeesCargosRange = `'${sheetName}'!N${attendeeRows[0]}:N${attendeeRows.at(-1)}`;
  const ranges = [
    `'${sheetName}'!E8`,
    `'${sheetName}'!P8`,
    `'${sheetName}'!${FOLLOWUP_DATE_VALUE_CELL}`,
    `'${sheetName}'!A12:A30`,
    `'${sheetName}'!G12:G30`,
    `'${sheetName}'!O12:O30`,
    `'${sheetName}'!R12:R30`,
    `'${sheetName}'!J31`,
    `'${sheetName}'!A34:A41`,
    `'${sheetName}'!J34:J41`,
    `'${sheetName}'!L34:L41`,
    `'${sheetName}'!A43`,
    `'${sheetName}'!A45`,
    attendeesNamesRange,
    attendeesCargosRange,
  ];
  const values = await batchReadValues(options.spreadsheetId, ranges);
  const attendeeNames = columnBatchValues(
    values,
    attendeesNamesRange,
    SEGUIMIENTOS_MAX_ATTENDEES
  );
  const attendeeCargos = columnBatchValues(
    values,
    attendeesCargosRange,
    SEGUIMIENTOS_MAX_ATTENDEES
  );

  return normalizeSeguimientosFollowupValues(
    {
      modalidad: firstBatchValue(values, `'${sheetName}'!E8`),
      seguimiento_numero: firstBatchValue(values, `'${sheetName}'!P8`),
      fecha_seguimiento: firstBatchValue(
        values,
        `'${sheetName}'!${FOLLOWUP_DATE_VALUE_CELL}`
      ),
      item_labels: columnBatchValues(values, `'${sheetName}'!A12:A30`, 19),
      item_observaciones: columnBatchValues(values, `'${sheetName}'!G12:G30`, 19),
      item_autoevaluacion: columnBatchValues(values, `'${sheetName}'!O12:O30`, 19),
      item_eval_empresa: columnBatchValues(values, `'${sheetName}'!R12:R30`, 19),
      tipo_apoyo: firstBatchValue(values, `'${sheetName}'!J31`),
      empresa_item_labels: columnBatchValues(values, `'${sheetName}'!A34:A41`, 8),
      empresa_eval: columnBatchValues(values, `'${sheetName}'!J34:J41`, 8),
      empresa_observacion: columnBatchValues(values, `'${sheetName}'!L34:L41`, 8),
      situacion_encontrada: firstBatchValue(values, `'${sheetName}'!A43`),
      estrategias_ajustes: firstBatchValue(values, `'${sheetName}'!A45`),
      asistentes: Array.from({ length: SEGUIMIENTOS_MAX_ATTENDEES }, (_, index) => ({
        nombre: attendeeNames[index] ?? "",
        cargo: attendeeCargos[index] ?? "",
      })),
    },
    options.followupIndex
  );
}

function buildBaseSheetWrites(
  baseValues: SeguimientosBaseValues,
  baseSheetName: string
) {
  const writes = Object.entries(BASE_SHEET_FIELD_MAP).map(([fieldId, cell]) => ({
    range: `'${baseSheetName}'!${cell}`,
    value: BASE_DATE_FIELD_IDS.has(fieldId as keyof SeguimientosBaseValues)
      ? formatSeguimientosDateWriteValue(
          String((baseValues as Record<string, unknown>)[fieldId] ?? "")
        )
      : String((baseValues as Record<string, unknown>)[fieldId] ?? ""),
  }));

  for (const [index, row] of [23, 24, 25, 26, 27].entries()) {
    writes.push({
      range: `'${baseSheetName}'!B${row}`,
      value: baseValues.funciones_1_5[index] ?? "",
    });
    writes.push({
      range: `'${baseSheetName}'!N${row}`,
      value: baseValues.funciones_6_10[index] ?? "",
    });
  }

  for (const [index, row] of [29, 30, 31].entries()) {
    writes.push({
      range: `'${baseSheetName}'!C${row}`,
      value: formatSeguimientosDateWriteValue(
        baseValues.seguimiento_fechas_1_3[index] ?? ""
      ),
    });
    writes.push({
      range: `'${baseSheetName}'!P${row}`,
      value: formatSeguimientosDateWriteValue(
        baseValues.seguimiento_fechas_4_6[index] ?? ""
      ),
    });
  }

  const ponderadoValues = {
    ...baseValues,
    fecha_firma_contrato:
      baseValues.fecha_firma_contrato || baseValues.fecha_inicio_contrato,
  };

  for (const [fieldId, cell] of Object.entries(PONDERADO_COMPANY_MAP)) {
    writes.push({
      range: `'${SHEET_FINAL}'!${cell}`,
      value: fieldId === "fecha_visita"
        ? formatSeguimientosDateWriteValue(
            String((ponderadoValues as Record<string, unknown>)[fieldId] ?? "")
          )
        : String((ponderadoValues as Record<string, unknown>)[fieldId] ?? ""),
    });
  }

  for (const [fieldId, cell] of Object.entries(PONDERADO_USER_MAP)) {
    writes.push({
      range: `'${SHEET_FINAL}'!${cell}`,
      value: fieldId === "fecha_firma_contrato"
        ? formatSeguimientosDateWriteValue(
            String((ponderadoValues as Record<string, unknown>)[fieldId] ?? "")
          )
        : String((ponderadoValues as Record<string, unknown>)[fieldId] ?? ""),
    });
  }

  for (const entry of PONDERADO_FUNCTION_LAYOUT) {
    const sourceValues =
      entry.source === "funciones_1_5"
        ? baseValues.funciones_1_5
        : baseValues.funciones_6_10;
    writes.push({
      range: `'${SHEET_FINAL}'!${entry.cell}`,
      value: sourceValues[entry.index] ?? "",
    });
  }

  return writes;
}

async function cleanupLegacySeguimientosDirectWriteCells(options: {
  spreadsheetId: string;
  baseSheetName: string;
  baseValues: SeguimientosBaseValues;
}) {
  const formulaRanges = buildSeguimientosDirectWriteFormulaRanges(
    options.baseSheetName
  );
  const formulaValues = await batchReadValues(
    options.spreadsheetId,
    formulaRanges,
    "FORMULA"
  );
  const cleanupRangeSet = new Set(
    formulaRanges.filter((rangeName) =>
      firstBatchValue(formulaValues, rangeName).startsWith("=")
    )
  );

  if (cleanupRangeSet.size === 0) {
    return false;
  }

  const cleanupWrites = buildBaseSheetWrites(
    options.baseValues,
    options.baseSheetName
  ).filter((write) => cleanupRangeSet.has(normalizeA1Range(write.range)));

  if (cleanupWrites.length === 0) {
    return false;
  }

  await batchWriteCells(options.spreadsheetId, cleanupWrites);
  return true;
}

function mergeEditableBaseValues(options: {
  currentBaseValues: SeguimientosBaseValues;
  submittedBaseValues: SeguimientosBaseValues;
  empresa: Empresa | null;
}) {
  const nextValues = structuredClone(options.currentBaseValues) as Record<
    string,
    unknown
  >;

  for (const path of SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS) {
    setSeguimientosValueAtPath(
      nextValues,
      path,
      getSeguimientosValueAtPath(options.submittedBaseValues, path) ?? ""
    );
  }

  return normalizeSeguimientosBaseValues(nextValues, options.empresa);
}

function mergeEditableFollowupValues(options: {
  currentFollowupValues: SeguimientosFollowupValues;
  submittedFollowupValues: SeguimientosFollowupValues;
  followupIndex: SeguimientosFollowupIndex;
}) {
  const nextValues = structuredClone(options.currentFollowupValues) as Record<
    string,
    unknown
  >;

  for (const path of SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS) {
    setSeguimientosValueAtPath(
      nextValues,
      path,
      getSeguimientosValueAtPath(options.submittedFollowupValues, path) ?? ""
    );
  }

  return normalizeSeguimientosFollowupValues(nextValues, options.followupIndex);
}

function buildFollowupSheetWrites(
  values: SeguimientosFollowupValues,
  followupIndex: SeguimientosFollowupIndex
) {
  const sheetName = getFollowupSheetName(followupIndex);
  const writes = [
    { range: `'${sheetName}'!E8`, value: values.modalidad },
    { range: `'${sheetName}'!P8`, value: values.seguimiento_numero },
    { range: `'${sheetName}'!${FOLLOWUP_DATE_LABEL_CELL}`, value: FOLLOWUP_DATE_LABEL },
    {
      range: `'${sheetName}'!${FOLLOWUP_DATE_VALUE_CELL}`,
      value: formatSeguimientosDateWriteValue(values.fecha_seguimiento),
    },
    { range: `'${sheetName}'!J31`, value: values.tipo_apoyo },
    { range: `'${sheetName}'!A43`, value: values.situacion_encontrada },
    { range: `'${sheetName}'!A45`, value: values.estrategias_ajustes },
  ];

  for (const [offset, row] of Array.from({ length: 19 }, (_, value) => value + 12).entries()) {
    writes.push({
      range: `'${sheetName}'!G${row}`,
      value: values.item_observaciones[offset] ?? "",
    });
    writes.push({
      range: `'${sheetName}'!O${row}`,
      value: values.item_autoevaluacion[offset] ?? "",
    });
    writes.push({
      range: `'${sheetName}'!R${row}`,
      value: values.item_eval_empresa[offset] ?? "",
    });
  }

  for (const [offset, row] of [34, 35, 36, 37, 38, 39, 40, 41].entries()) {
    writes.push({
      range: `'${sheetName}'!J${row}`,
      value: values.empresa_eval[offset] ?? "",
    });
    writes.push({
      range: `'${sheetName}'!L${row}`,
      value: values.empresa_observacion[offset] ?? "",
    });
  }

  for (const [offset, row] of getFollowupAttendeeRows().entries()) {
    writes.push({
      range: `'${sheetName}'!D${row}`,
      value: values.asistentes[offset]?.nombre ?? "",
    });
    writes.push({
      range: `'${sheetName}'!N${row}`,
      value: values.asistentes[offset]?.cargo ?? "",
    });
  }

  return writes;
}

function buildEmptyFollowupSheetWrites(index: SeguimientosFollowupIndex) {
  return buildFollowupSheetWrites(
    createEmptySeguimientosFollowupValues(index),
    index
  );
}

async function initializeNewCaseSpreadsheet(options: {
  spreadsheetId: string;
  baseSheetName: string;
  maxFollowups: 3 | 6;
  baseValues: SeguimientosBaseValues;
}) {
  await clearProtectedRanges(options.spreadsheetId);
  const writes = buildBaseSheetWrites(options.baseValues, options.baseSheetName);
  for (const followupIndex of [1, 2, 3, 4, 5, 6] as const) {
    writes.push(...buildEmptyFollowupSheetWrites(followupIndex));
  }
  await batchWriteCells(options.spreadsheetId, writes);
  await keepOnlySheetsVisible(
    options.spreadsheetId,
    buildVisibleSeguimientosSheetNames(
      options.baseSheetName,
      options.maxFollowups === 6 ? "compensar" : "no_compensar"
    )
  );
}

async function findExistingCaseFile(options: {
  cedula: string;
  nombreUsuario: string;
}) {
  const seguimientosRootId = await getOrCreateFolder(
    getSeguimientosRootFolderId(),
    SEGUIMIENTOS_FOLDER_NAME
  );
  const folderName = buildCaseFolderName(options.nombreUsuario, options.cedula);
  const existingFolder = await findCaseFolder({
    seguimientosFolderId: seguimientosRootId,
    cedula: options.cedula,
    preferredFolderName: folderName,
  });

  if (!existingFolder?.id) {
    return null;
  }

  const folderId = requireDriveFileId(existingFolder.id, "resolver carpeta del caso");
  const files = await listDriveFiles(folderId);
  const spreadsheetFiles = files.filter(
    (entry) => entry.mimeType === GOOGLE_SHEETS_MIME
  );
  if (spreadsheetFiles.length > 1) {
    console.warn("[seguimientos.bootstrap] duplicate spreadsheets detected", {
      cedula: options.cedula,
      folderId,
      spreadsheetIds: spreadsheetFiles
        .map((entry) => entry.id)
        .filter(Boolean),
    });
  }
  const file = spreadsheetFiles[0] ?? null;

  if (!file) {
    return {
      folderId,
      folderName: String(existingFolder.name ?? folderName).trim() || folderName,
      file: null,
    };
  }

  return {
    folderId,
    folderName: String(existingFolder.name ?? folderName).trim() || folderName,
    file,
  };
}

async function ensureCaseFile(options: {
  cedula: string;
  nombreUsuario: string;
  companyType: SeguimientosCompanyType;
  personPrefill: UsuarioRecaSeguimientoPrefill;
  empresa: Empresa | null;
  ownerUserId: string;
}) {
  const seguimientosRootId = await getOrCreateFolder(
    getSeguimientosRootFolderId(),
    SEGUIMIENTOS_FOLDER_NAME
  );
  const folderName = buildCaseFolderName(options.nombreUsuario, options.cedula);
  const existingFolder = await findCaseFolder({
    seguimientosFolderId: seguimientosRootId,
    cedula: options.cedula,
    preferredFolderName: folderName,
  });
  const caseFolderId = existingFolder?.id
    ? requireDriveFileId(existingFolder.id, "resolver carpeta del caso")
    : await getOrCreateFolder(seguimientosRootId, folderName);
  const caseFolderName = String(existingFolder?.name ?? folderName).trim() || folderName;
  const files = await listDriveFiles(caseFolderId);
  const spreadsheetFiles = files.filter(
    (file) => file.mimeType === GOOGLE_SHEETS_MIME
  );
  if (spreadsheetFiles.length > 1) {
    console.warn("[seguimientos.bootstrap] duplicate spreadsheets detected", {
      cedula: options.cedula,
      folderId: caseFolderId,
      spreadsheetIds: spreadsheetFiles
        .map((entry) => entry.id)
        .filter(Boolean),
    });
  }
  const existingSpreadsheet = spreadsheetFiles[0] ?? null;

  if (existingSpreadsheet) {
    return {
      created: false,
      folderId: caseFolderId,
      folderName: caseFolderName,
      file: existingSpreadsheet,
    };
  }

  const copied = await copyTemplate(
    getSeguimientosTemplateId(),
    caseFolderName,
    caseFolderId
  );
  const sheets = await listSpreadsheetSheets(copied.fileId);
  const baseSheetName = resolveBaseSheetName(sheets);
  const maxFollowups = options.companyType === "compensar" ? 6 : 3;
  const baseValues = buildBasePrefillValues(options.empresa, options.personPrefill);

  await initializeNewCaseSpreadsheet({
    spreadsheetId: copied.fileId,
    baseSheetName,
    maxFollowups,
    baseValues,
  });
  await updateCaseAppProperties(
    copied.fileId,
    buildCaseAppProperties({
      caseId: copied.fileId,
      cedula: options.cedula,
      empresaNit:
        options.empresa?.nit_empresa?.trim() || options.personPrefill.empresa_nit,
      empresaNombre:
        options.empresa?.nombre_empresa?.trim() ||
        options.personPrefill.empresa_nombre,
      companyType: options.companyType,
      maxFollowups,
      baseSheetName,
      folderId: caseFolderId,
      ownerUserId: options.ownerUserId,
    })
  );

  const hydratedFile = await readDriveFile(copied.fileId);
  return {
    created: true,
    folderId: caseFolderId,
    folderName: caseFolderName,
    file: hydratedFile,
  };
}

async function readSeguimientosFollowupsFromSpreadsheet(options: {
  spreadsheetId: string;
  companyType: SeguimientosCompanyType;
}) {
  const followupEntries = await Promise.all(
    getSeguimientosVisibleFollowupIndexes(options.companyType).map(
      async (followupIndex) =>
        [
          followupIndex,
          await readFollowupValuesFromSpreadsheet({
            spreadsheetId: options.spreadsheetId,
            followupIndex,
          }),
        ] as const
    )
  );

  return followupEntries.reduce<{
    current: Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>;
    persisted: Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>;
  }>(
    (accumulator, [followupIndex, followupValues]) => {
      accumulator.current[followupIndex] = followupValues;
      accumulator.persisted[followupIndex] = followupValues;
      return accumulator;
    },
    {
      current: {},
      persisted: {},
    }
  );
}

async function syncSeguimientosHydrationMaintenance(options: {
  spreadsheetId: string;
  sheets: Array<{ sheetId: number; title: string; hidden: boolean }>;
  file: GoogleDriveFile;
  folderId: string;
  personPrefill: UsuarioRecaSeguimientoPrefill;
  empresa: Empresa | null;
  companyType: SeguimientosCompanyType;
  maxFollowups: 3 | 6;
  baseSheetName: string;
  baseValues: SeguimientosBaseValues;
}) {
  await cleanupLegacySeguimientosDirectWriteCells({
    spreadsheetId: options.spreadsheetId,
    baseSheetName: options.baseSheetName,
    baseValues: options.baseValues,
  });

  await keepOnlySheetsVisible(
    options.spreadsheetId,
    buildVisibleSeguimientosSheetNames(options.baseSheetName, options.companyType),
    options.sheets
  );

  const desiredAppProperties = buildCaseAppProperties({
    caseId: options.spreadsheetId,
    cedula: options.personPrefill.cedula_usuario,
    empresaNit:
      options.empresa?.nit_empresa?.trim() ||
      options.baseValues.nit_empresa ||
      options.personPrefill.empresa_nit,
    empresaNombre:
      options.empresa?.nombre_empresa?.trim() ||
      options.baseValues.nombre_empresa ||
      options.personPrefill.empresa_nombre,
    companyType: options.companyType,
    maxFollowups: options.maxFollowups,
    baseSheetName: options.baseSheetName,
    folderId: options.folderId,
    ownerUserId: getCaseOwnerUserId(options.file.appProperties) || null,
    ownerClaimedAt: getCaseOwnerClaimedAt(options.file.appProperties) || null,
  });

  if (haveCaseAppPropertiesChanged(options.file.appProperties, desiredAppProperties)) {
    await updateCaseAppProperties(options.spreadsheetId, desiredAppProperties);
  }
}

async function buildCaseHydration(options: {
  file: GoogleDriveFile;
  folderId: string;
  folderName: string;
  personPrefill: UsuarioRecaSeguimientoPrefill;
  empresa: Empresa | null;
  companyType: SeguimientosCompanyType;
  maintenanceMode?: SeguimientosHydrationMaintenanceMode;
}): Promise<SeguimientosCaseHydration> {
  const spreadsheetId = requireDriveFileId(
    options.file.id,
    "resolver spreadsheet del caso"
  );
  const sheets = await listSpreadsheetSheets(spreadsheetId);
  const baseSheetName = resolveBaseSheetName(sheets);
  const persistedMaxFollowups = Number.parseInt(
    getAppProperty(options.file.appProperties, "max_followups", "max_seguimientos"),
    10
  );
  const maxFollowups =
    persistedMaxFollowups === 6 || persistedMaxFollowups === 3
      ? (persistedMaxFollowups as 3 | 6)
      : inferMaxFollowupsFromSheetVisibility(sheets);
  const inferredCompanyType =
    maxFollowups === 6 ? ("compensar" as const) : ("no_compensar" as const);
  const companyType = normalizeSeguimientosCompanyType(
    getAppProperty(options.file.appProperties, "company_type"),
    options.companyType || inferredCompanyType
  );

  const baseValuesFromSheet = await readBaseValuesFromSpreadsheet({
    spreadsheetId,
    baseSheetName,
    empresa: options.empresa,
  });
  const persistedBaseValues = normalizeSeguimientosBaseValues(
    baseValuesFromSheet,
    options.empresa
  );
  const prefillValues = buildBasePrefillValues(options.empresa, options.personPrefill);
  const baseValues = mergeBaseValuesWithPrefill(
    baseValuesFromSheet,
    prefillValues,
    options.empresa
  );
  const maintenanceMode = options.maintenanceMode ?? "eager";
  if (maintenanceMode === "eager") {
    await syncSeguimientosHydrationMaintenance({
      spreadsheetId,
      sheets,
      file: options.file,
      folderId: options.folderId,
      personPrefill: options.personPrefill,
      empresa: options.empresa,
      companyType,
      maxFollowups,
      baseSheetName,
      baseValues,
    });
  }
  const [{ current: followupValuesByIndex, persisted: persistedFollowupValuesByIndex }, summary] =
    await Promise.all([
      readSeguimientosFollowupsFromSpreadsheet({
        spreadsheetId,
        companyType,
      }),
      readSeguimientosFinalSummaryFromSpreadsheet({
        spreadsheetId,
        baseSheetName,
      }),
    ]);

  const caseMeta = buildCaseMeta({
    file: options.file,
    folderId: options.folderId,
    folderName: options.folderName,
    empresa: options.empresa,
    baseValues,
    companyType,
    maxFollowups,
    baseSheetName,
  });
  const workflow = buildSeguimientosWorkflow({
    companyType,
    baseValues,
    persistedBaseValues,
    followups: followupValuesByIndex,
    persistedFollowups: persistedFollowupValuesByIndex,
  });

  return {
    schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION,
    caseMeta,
    empresaSnapshot:
      options.empresa ??
      buildFallbackEmpresaSnapshot({
        empresaNit: caseMeta.empresaNit,
        empresaNombre: caseMeta.empresaNombre,
        cajaCompensacion: caseMeta.cajaCompensacion,
        profesionalAsignado: caseMeta.profesionalAsignado,
      }),
    personPrefill: options.personPrefill,
    stageDraftStateByStageId: buildSeguimientosStageDraftStateMap(companyType),
    baseValues,
    persistedBaseValues,
    followupValuesByIndex,
    persistedFollowupValuesByIndex,
    summary,
    workflow,
    suggestedStageId: workflow.suggestedStageId,
  } satisfies SeguimientosCaseHydration;
}

function listVisibleSeguimientosEditableStageIds(
  companyType: SeguimientosCompanyType
) {
  return [
    SEGUIMIENTOS_BASE_STAGE_ID,
    ...getSeguimientosVisibleFollowupIndexes(companyType).map((index) =>
      buildSeguimientosFollowupStageId(index)
    ),
  ] satisfies SeguimientosEditableStageId[];
}

function assertVisibleSeguimientosEditableStageId(options: {
  companyType: SeguimientosCompanyType;
  stageId: SeguimientosEditableStageId;
  message: string;
}) {
  const visibleStageIds = new Set(
    listVisibleSeguimientosEditableStageIds(options.companyType)
  );
  if (!visibleStageIds.has(options.stageId)) {
    throw new Error(options.message);
  }
}

function getProtectedDirtySeguimientosStageIds(options: {
  hydration: SeguimientosCaseHydration;
  dirtyStageIds: readonly SeguimientosEditableStageId[];
}) {
  const protectedStageIds = new Set(
    options.hydration.workflow.stageStates
      .filter(
        (stageState) =>
          stageState.kind !== "final" && stageState.isProtectedByDefault
      )
      .map((stageState) => stageState.stageId as SeguimientosEditableStageId)
  );

  return options.dirtyStageIds.filter((stageId) => protectedStageIds.has(stageId));
}

function assertSeguimientosOverrideGrants(options: {
  caseId: string;
  userId: string;
  dirtyStageIds: readonly SeguimientosEditableStageId[];
  hydration: SeguimientosCaseHydration;
  overrideGrants: readonly SeguimientosOverrideGrant[];
}) {
  const protectedStageIds = getProtectedDirtySeguimientosStageIds({
    hydration: options.hydration,
    dirtyStageIds: options.dirtyStageIds,
  });
  if (protectedStageIds.length === 0) {
    return;
  }

  const grantsByStageId = new Map(
    options.overrideGrants.map((grant) => [grant.stageId, grant.token])
  );

  const missingOverrideStageIds: SeguimientosEditableStageId[] = [];
  const expiredOverrideStageIds: SeguimientosEditableStageId[] = [];
  const missingGrantStageIds: SeguimientosEditableStageId[] = [];
  const parseFailedOverrideStageIds: SeguimientosEditableStageId[] = [];
  const invalidSignatureOverrideStageIds: SeguimientosEditableStageId[] = [];
  for (const stageId of protectedStageIds) {
    const token = grantsByStageId.get(stageId);
    if (!token) {
      missingOverrideStageIds.push(stageId);
      missingGrantStageIds.push(stageId);
      continue;
    }

    let grantInspection;
    try {
      grantInspection = inspectSeguimientosOverrideGrantDetailed({
        caseId: options.caseId,
        stageId,
        userId: options.userId,
        token,
      });
    } catch (error) {
      if (isSeguimientosOverrideSecretError(error)) {
        logSeguimientosServerEvent("override_unavailable", {
          caseId: options.caseId,
          stageIds: protectedStageIds,
          userId: options.userId,
          result: "rejected",
          reason: "missing_secret_during_verify",
        });
        throw buildSeguimientosOverrideUnavailableError();
      }

      throw error;
    }

    if (grantInspection.result === "expired") {
      expiredOverrideStageIds.push(stageId);
      continue;
    }

    if (grantInspection.result !== "valid") {
      missingOverrideStageIds.push(stageId);
      if (grantInspection.reason === "parse_failed") {
        parseFailedOverrideStageIds.push(stageId);
      } else {
        invalidSignatureOverrideStageIds.push(stageId);
      }
    }
  }

  if (
    missingOverrideStageIds.length > 0 ||
    expiredOverrideStageIds.length > 0
  ) {
    if (expiredOverrideStageIds.length > 0) {
      logSeguimientosServerEvent("override_expired_on_save", {
        caseId: options.caseId,
        stageIds: expiredOverrideStageIds,
        userId: options.userId,
        result: "rejected",
        reason: "grant_expired",
      });
    }
    if (missingGrantStageIds.length > 0) {
      logSeguimientosServerEvent("override_missing_on_save", {
        caseId: options.caseId,
        stageIds: missingGrantStageIds,
        userId: options.userId,
        result: "rejected",
        reason: "grant_missing",
      });
    }
    if (parseFailedOverrideStageIds.length > 0) {
      logSeguimientosServerEvent("override_missing_on_save", {
        caseId: options.caseId,
        stageIds: parseFailedOverrideStageIds,
        userId: options.userId,
        result: "rejected",
        reason: "grant_parse_failed",
      });
    }
    if (invalidSignatureOverrideStageIds.length > 0) {
      logSeguimientosServerEvent("override_missing_on_save", {
        caseId: options.caseId,
        stageIds: invalidSignatureOverrideStageIds,
        userId: options.userId,
        result: "rejected",
        reason: "grant_signature_invalid",
      });
    }

    const code =
      expiredOverrideStageIds.length > 0
        ? "override_expired"
        : "override_required";
    throw new SeguimientosServerError(
      code,
      expiredOverrideStageIds.length > 0
        ? "El override de una o mas etapas historicas vencio antes de guardarse."
        : "Esta etapa historica requiere un override valido antes de guardarse.",
      getSeguimientosErrorStatusCode(code),
      {
        ...(missingOverrideStageIds.length > 0
          ? { missingOverrideStageIds }
          : {}),
        ...(expiredOverrideStageIds.length > 0
          ? { expiredOverrideStageIds }
          : {}),
      }
    );
  }
}

function hasSeguimientosDirtyFollowupStage(
  dirtyStageIds: readonly SeguimientosEditableStageId[]
) {
  return dirtyStageIds.some((stageId) => stageId !== SEGUIMIENTOS_BASE_STAGE_ID);
}

export async function bootstrapSeguimientosCase(options: {
  cedula: string;
  companyTypeOverride?: SeguimientosCompanyType | null;
  supabase: ServerSupabaseClient;
  userId: string;
}): Promise<SeguimientosBootstrapResponse> {
  const normalizedCedula = normalizeCedulaUsuario(options.cedula);
  if (!normalizedCedula) {
    return {
      status: "error",
      message: "La cédula suministrada no es válida.",
    };
  }

  const userRow = await getUsuarioRecaByCedula(normalizedCedula);
  if (!userRow) {
    return {
      status: "error",
      message: "No se encontraron datos en usuarios RECA para esa cédula.",
    };
  }

  const leaseRequestId = randomUUID();
  const lease = await claimSeguimientosBootstrapLease(
    normalizedCedula,
    leaseRequestId
  );
  if (!lease.claimed) {
    return {
      status: "error",
      code: "bootstrap_in_progress",
      message:
        "Ya hay otra preparacion de Seguimientos en curso para esta cedula. Espera unos segundos e intenta de nuevo.",
    };
  }

  try {
    const empresaResolution = await resolveEmpresaForUser({
      userRow,
      supabase: options.supabase,
    });
    if (empresaResolution.status !== "ready") {
      return {
        status: "resolution_required",
        reason: empresaResolution.reason,
        context: empresaResolution.context,
      };
    }

    const personPrefill = mapUsuarioRecaToSeguimientoPrefill(userRow);
    const existingCase = await findExistingCaseFile({
      cedula: normalizedCedula,
      nombreUsuario: userRow.nombre_usuario ?? personPrefill.nombre_usuario,
    });

    const persistedCompanyTypeText = getAppProperty(
      existingCase?.file?.appProperties,
      "company_type"
    );
    const companyTypeResolution = resolveCompanyType({
      empresa: empresaResolution.empresa,
      companyTypeOverride: options.companyTypeOverride ?? null,
      persistedCompanyType: persistedCompanyTypeText
        ? normalizeSeguimientosCompanyType(persistedCompanyTypeText)
        : null,
    });

    if (companyTypeResolution.status !== "ready") {
      return companyTypeResolution;
    }

    let caseRecord;
    try {
      caseRecord =
        existingCase?.file != null
          ? {
              created: false as const,
              folderId: existingCase.folderId,
              folderName: existingCase.folderName,
              file: existingCase.file,
            }
          : await ensureCaseFile({
              cedula: normalizedCedula,
              nombreUsuario: userRow.nombre_usuario ?? personPrefill.nombre_usuario,
              companyType: companyTypeResolution.companyType,
              personPrefill,
              empresa: empresaResolution.empresa,
              ownerUserId: options.userId,
            });
    } catch (error) {
      const normalizedError = normalizeSeguimientosBootstrapStorageError(error);
      return {
        status: "error",
        code: normalizedError.code,
        message: normalizedError.message,
      };
    }

    if (!caseRecord.created) {
      const ownerUserId = getCaseOwnerUserId(caseRecord.file.appProperties);
      if (ownerUserId && ownerUserId !== options.userId) {
        return {
          status: "error",
          code: "case_access_denied",
          message:
            "No tienes permisos para abrir o modificar este caso de Seguimientos.",
        };
      }

      if (!ownerUserId) {
        caseRecord = {
          ...caseRecord,
          file: await claimSeguimientosCaseOwnership({
            file: caseRecord.file,
            userId: options.userId,
          }),
        };
      }
    }

    const persistedEmpresaNit = getAppProperty(
      caseRecord.file.appProperties,
      "empresa_nit"
    );
    const persistedEmpresaNombre = getAppProperty(
      caseRecord.file.appProperties,
      "empresa_nombre"
    );

    if (
      !caseRecord.created &&
      ((persistedEmpresaNit &&
        empresaResolution.empresa.nit_empresa &&
        persistedEmpresaNit !== empresaResolution.empresa.nit_empresa) ||
        (persistedEmpresaNombre &&
          normalizeComparableText(persistedEmpresaNombre) !==
            normalizeComparableText(empresaResolution.empresa.nombre_empresa)) ||
        (persistedCompanyTypeText &&
          normalizeSeguimientosCompanyType(persistedCompanyTypeText) !==
            companyTypeResolution.companyType))
    ) {
      return {
        status: "resolution_required",
        reason: "case_conflict",
        context: {
          persisted: {
            empresa_nit: persistedEmpresaNit,
            empresa_nombre: persistedEmpresaNombre,
            company_type: persistedCompanyTypeText,
          },
          current: {
            empresa_nit: empresaResolution.empresa.nit_empresa,
            empresa_nombre: empresaResolution.empresa.nombre_empresa,
            company_type: companyTypeResolution.companyType,
          },
        },
      };
    }

    const hydration = await buildCaseHydration({
      file: caseRecord.file,
      folderId: caseRecord.folderId,
      folderName: caseRecord.folderName,
      personPrefill,
      empresa: empresaResolution.empresa,
      companyType: companyTypeResolution.companyType,
    });

    return {
      status: "ready",
      hydration,
    };
  } finally {
    await releaseSeguimientosBootstrapLease(normalizedCedula, leaseRequestId).catch(
      (error) => {
        console.warn("[seguimientos.bootstrap] lease release failed", {
          cedula: normalizedCedula,
          leaseRequestId,
          error,
        });
      }
    );
  }
}

export async function grantSeguimientosStageOverride(options: {
  caseId: string;
  stageIds: SeguimientosEditableStageId[];
  supabase: ServerSupabaseClient;
  userId: string;
}): Promise<SeguimientosStageOverrideResponse> {
  logSeguimientosServerEvent("override_request_started", {
    caseId: options.caseId,
    stageIds: options.stageIds,
    userId: options.userId,
    result: "started",
  });
  const hydration = await getSeguimientosCaseHydrationByCaseId({
    caseId: options.caseId,
    supabase: options.supabase,
    userId: options.userId,
    maintenanceMode: "passive",
  });

  const requestedStageIds = [...new Set(options.stageIds)];
  for (const stageId of requestedStageIds) {
    assertVisibleSeguimientosEditableStageId({
      companyType: hydration.caseMeta.companyType,
      stageId,
      message:
        "La etapa solicitada ya no es valida para el tipo de empresa persistido.",
    });
  }

  const grants = requestedStageIds.flatMap((stageId) => {
    const targetStage = hydration.workflow.stageStates.find(
      (stageState) =>
        stageState.kind !== "final" && stageState.stageId === stageId
    );
    if (!targetStage?.supportsOverride || !targetStage.isProtectedByDefault) {
      return [];
    }

    try {
      return [
        createSeguimientosOverrideGrant({
          caseId: options.caseId,
          stageId,
          userId: options.userId,
        }),
      ];
    } catch (error) {
      if (isSeguimientosOverrideSecretError(error)) {
        logSeguimientosServerEvent("override_unavailable", {
          caseId: options.caseId,
          stageIds: requestedStageIds,
          userId: options.userId,
          result: "rejected",
          reason: "missing_secret_during_grant",
        });
        throw buildSeguimientosOverrideUnavailableError();
      }

      throw error;
    }
  });

  if (grants.length === 0) {
    logSeguimientosServerEvent("override_request_rejected", {
      caseId: options.caseId,
      stageIds: requestedStageIds,
      userId: options.userId,
      result: "rejected",
      reason: "not_protected",
    });
    return {
      status: "error",
      code: "override_required",
      message:
        "La etapa seleccionada no requiere override o ya no esta protegida.",
    };
  }

  logSeguimientosServerEvent("override_request_ready", {
    caseId: options.caseId,
    stageIds: grants.map((grant) => grant.stageId),
    userId: options.userId,
    result: "granted",
  });
  return {
    status: "ready",
    grants,
  };
}

export async function saveSeguimientosBaseStage(options: {
  caseId: string;
  baseValues: SeguimientosBaseValues;
  supabase: ServerSupabaseClient;
  userId: string;
  overrideGrant?: SeguimientosOverrideGrant | null;
  expectedCaseUpdatedAt?: string | null;
}): Promise<SeguimientosBaseStageSaveResponse> {
  const currentHydration = await getSeguimientosCaseHydrationByCaseId({
    caseId: options.caseId,
    supabase: options.supabase,
    userId: options.userId,
    maintenanceMode: "passive",
  });
  assertSeguimientosCaseUpdatedAt({
    caseId: options.caseId,
    userId: options.userId,
    expectedCaseUpdatedAt: options.expectedCaseUpdatedAt,
    currentCaseUpdatedAt: currentHydration.caseMeta.updatedAt,
  });

  const baseSheetName = currentHydration.caseMeta.baseSheetName?.trim() || "";
  if (!baseSheetName) {
    return {
      status: "error",
      message:
        "No se pudo determinar la hoja base del caso para guardar la ficha inicial.",
    };
  }

  assertSeguimientosOverrideGrants({
    caseId: options.caseId,
    userId: options.userId,
    dirtyStageIds: [SEGUIMIENTOS_BASE_STAGE_ID],
    hydration: currentHydration,
    overrideGrants: options.overrideGrant ? [options.overrideGrant] : [],
  });

  const mergedBaseValues = mergeEditableBaseValues({
    currentBaseValues: currentHydration.baseValues,
    submittedBaseValues: options.baseValues,
    empresa: currentHydration.empresaSnapshot,
  });

  await batchWriteCells(options.caseId, [
    ...buildBaseSheetWrites(mergedBaseValues, baseSheetName),
  ]);

  const savedAt = new Date().toISOString();
  let hydration: SeguimientosCaseHydration;
  try {
    hydration = await getSeguimientosCaseHydrationByCaseId({
      caseId: options.caseId,
      supabase: options.supabase,
      userId: options.userId,
      maintenanceMode: "passive",
    });
  } catch {
    return {
      status: "written_needs_reload",
      savedAt,
      savedStageIds: [SEGUIMIENTOS_BASE_STAGE_ID],
      message:
        "Los cambios ya quedaron en Google Sheets. Recarga Seguimientos antes de continuar.",
    };
  }

  return {
    status: "ready",
    savedAt,
    hydration: {
      ...hydration,
      stageDraftStateByStageId: withSeguimientosStageDraftStateUpdate(
        hydration.stageDraftStateByStageId,
        "base_process",
        {
          lastSavedToSheetsAt: savedAt,
        }
      ),
    },
  };
}

export async function saveSeguimientosDirtyStages(options: {
  caseId: string;
  companyType: SeguimientosCompanyType;
  activeStageId: SeguimientosEditableStageId;
  baseValues: SeguimientosBaseValues;
  followupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  dirtyStageIds: SeguimientosEditableStageId[];
  overrideGrants: SeguimientosOverrideGrant[];
  supabase: ServerSupabaseClient;
  userId: string;
  expectedCaseUpdatedAt?: string | null;
}): Promise<SeguimientosStagesSaveResponse> {
  const currentHydration = await getSeguimientosCaseHydrationByCaseId({
    caseId: options.caseId,
    supabase: options.supabase,
    userId: options.userId,
    maintenanceMode: "passive",
  });
  assertSeguimientosCaseUpdatedAt({
    caseId: options.caseId,
    userId: options.userId,
    expectedCaseUpdatedAt: options.expectedCaseUpdatedAt,
    currentCaseUpdatedAt: currentHydration.caseMeta.updatedAt,
  });
  const baseSheetName = currentHydration.caseMeta.baseSheetName?.trim() || "";
  if (!baseSheetName) {
    return {
      status: "error",
      message:
        "No se pudo determinar la hoja base del caso para guardar Seguimientos.",
    };
  }

  if (currentHydration.caseMeta.companyType !== options.companyType) {
    return {
      status: "error",
      message:
        "El tipo de empresa del borrador no coincide con el caso persistido. Recarga Seguimientos antes de guardar.",
    };
  }

  const visibleFollowupIndexes = getSeguimientosVisibleFollowupIndexes(
    currentHydration.caseMeta.companyType
  );
  const visibleStageIds = new Set<SeguimientosEditableStageId>(
    listVisibleSeguimientosEditableStageIds(currentHydration.caseMeta.companyType)
  );

  assertVisibleSeguimientosEditableStageId({
    companyType: currentHydration.caseMeta.companyType,
    stageId: options.activeStageId,
    message:
      "La etapa activa ya no es valida para el tipo de empresa persistido. Recarga Seguimientos antes de guardar.",
  });

  const invalidDirtyStageIds = options.dirtyStageIds.filter(
    (stageId) => !visibleStageIds.has(stageId)
  );
  if (invalidDirtyStageIds.length > 0) {
    return {
      status: "error",
      message:
        "Hay etapas pendientes fuera del rango visible del caso persistido. Recarga Seguimientos antes de guardar.",
    };
  }

  const dirtyStageIds = [...options.dirtyStageIds];

  if (dirtyStageIds.length === 0) {
    return {
      status: "error",
      message: "No hay cambios pendientes para enviar a Google Sheets.",
    };
  }

  assertSeguimientosOverrideGrants({
    caseId: options.caseId,
    userId: options.userId,
    dirtyStageIds,
    hydration: currentHydration,
    overrideGrants: options.overrideGrants,
  });

  let mergedBaseValues = currentHydration.baseValues;
  const mergedFollowupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  > = {
    ...currentHydration.followupValuesByIndex,
  };
  const writes: Array<{ range: string; value: string }> = [];
  const savedStageIds: SeguimientosEditableStageId[] = [];

  for (const stageId of dirtyStageIds) {
    if (stageId === "base_process") {
      mergedBaseValues = mergeEditableBaseValues({
        currentBaseValues: mergedBaseValues,
        submittedBaseValues: options.baseValues,
        empresa: currentHydration.empresaSnapshot,
      });
      savedStageIds.push(stageId);
      continue;
    }

    const followupIndex = parseSeguimientosFollowupStageId(stageId);
    if (!followupIndex || !visibleFollowupIndexes.includes(followupIndex)) {
      continue;
    }

    const currentFollowupValues =
      mergedFollowupValuesByIndex[followupIndex] ??
      createEmptySeguimientosFollowupValues(followupIndex);
    const submittedFollowupValues =
      options.followupValuesByIndex[followupIndex] ??
      currentFollowupValues;
    const mergedFollowupValues = mergeEditableFollowupValues({
      currentFollowupValues,
      submittedFollowupValues,
      followupIndex,
    });

    mergedFollowupValuesByIndex[followupIndex] = mergedFollowupValues;
    writes.push(...buildFollowupSheetWrites(mergedFollowupValues, followupIndex));
    savedStageIds.push(stageId);
  }

  mergedBaseValues = mergeSeguimientosBaseTimelineFromFollowups({
    baseValues:
      dirtyStageIds.includes("base_process") ? mergedBaseValues : currentHydration.baseValues,
    followupValuesByIndex: mergedFollowupValuesByIndex,
    companyType: currentHydration.caseMeta.companyType,
  });

  if (
    hasSeguimientosDirtyFollowupStage(dirtyStageIds) &&
    !buildSeguimientosBaseProgress(mergedBaseValues).isCompleted
  ) {
    return {
      status: "error",
      code: "base_stage_incomplete",
      message:
        "La ficha inicial debe estar completa antes de guardar seguimientos.",
    };
  }

  if (dirtyStageIds.includes("base_process")) {
    writes.unshift(...buildBaseSheetWrites(mergedBaseValues, baseSheetName));
  } else {
    const timelineChanged =
      JSON.stringify(mergedBaseValues.seguimiento_fechas_1_3) !==
        JSON.stringify(currentHydration.baseValues.seguimiento_fechas_1_3) ||
      JSON.stringify(mergedBaseValues.seguimiento_fechas_4_6) !==
        JSON.stringify(currentHydration.baseValues.seguimiento_fechas_4_6);

    if (timelineChanged) {
      writes.unshift(...buildBaseSheetWrites(mergedBaseValues, baseSheetName));
      if (!savedStageIds.includes("base_process")) {
        savedStageIds.unshift("base_process");
      }
    }
  }

  await batchWriteCells(options.caseId, writes);

  const savedAt = new Date().toISOString();
  let hydration: SeguimientosCaseHydration;
  try {
    hydration = await getSeguimientosCaseHydrationByCaseId({
      caseId: options.caseId,
      supabase: options.supabase,
      userId: options.userId,
      maintenanceMode: "passive",
    });
  } catch {
    return {
      status: "written_needs_reload",
      savedAt,
      savedStageIds,
      message:
        "Los cambios ya quedaron en Google Sheets. Recarga Seguimientos antes de continuar.",
    };
  }

  let stageDraftStateByStageId = hydration.stageDraftStateByStageId;
  for (const stageId of savedStageIds) {
    stageDraftStateByStageId = withSeguimientosStageDraftStateUpdate(
      stageDraftStateByStageId,
      stageId,
      {
        lastSavedToSheetsAt: savedAt,
      }
    );
  }

  return {
    status: "ready",
    savedAt,
    savedStageIds,
    hydration: {
      ...hydration,
      stageDraftStateByStageId,
    },
  };
}

export async function getSeguimientosCaseHydrationByCaseId(options: {
  caseId: string;
  supabase: ServerSupabaseClient;
  userId: string;
  maintenanceMode?: SeguimientosHydrationMaintenanceMode;
}): Promise<SeguimientosCaseHydration> {
  const caseId = options.caseId.trim();
  if (!caseId) {
    throw new Error("El caseId de Seguimientos es obligatorio.");
  }

  const file = await readOwnedSeguimientosCaseFile({
    caseId,
    userId: options.userId,
  });

  const empresaNit = getAppProperty(file.appProperties, "empresa_nit");
  const empresaNombre = getAppProperty(file.appProperties, "empresa_nombre");
  const cedula = getAppProperty(file.appProperties, "cedula");
  const userRow = cedula ? await getUsuarioRecaByCedula(cedula) : null;
  const personPrefill = userRow
    ? mapUsuarioRecaToSeguimientoPrefill(userRow)
    : {
        cedula_usuario: cedula,
        nombre_usuario: "",
        discapacidad_usuario: "",
        discapacidad_detalle: "",
        certificado_discapacidad: "",
        certificado_porcentaje: "",
        telefono_oferente: "",
        correo_oferente: "",
        cargo_oferente: "",
        contacto_emergencia: "",
        parentesco: "",
        telefono_emergencia: "",
        fecha_firma_contrato: "",
        tipo_contrato: "",
        fecha_fin: "",
        empresa_nit: empresaNit,
        empresa_nombre: empresaNombre,
      };

  let empresa: Empresa | null = null;
  if (empresaNit) {
    const byNit = await findEmpresasByNit(empresaNit, options.supabase);
    empresa = byNit[0] ?? null;
  }

  if (!empresa && empresaNombre) {
    const byName = await findEmpresasByNormalizedName(
      empresaNombre,
      options.supabase
    );
    empresa = byName[0] ?? null;
  }

  const folderId =
    getAppProperty(file.appProperties, "folder_id") ||
    String(file.parents?.[0] ?? "").trim();
  const folderFile = folderId ? await readDriveFile(folderId) : null;

  return buildCaseHydration({
    file,
    folderId,
    folderName: String(folderFile?.name ?? file.name ?? "").trim() || "Seguimientos",
    personPrefill,
    empresa,
    companyType: normalizeSeguimientosCompanyType(
      getAppProperty(file.appProperties, "company_type"),
      "no_compensar"
    ),
    maintenanceMode: options.maintenanceMode,
  });
}

function buildSeguimientosPdfFileName(options: {
  hydration: SeguimientosCaseHydration;
  pdfOption: SeguimientosPdfOption;
}) {
  const companyName = sanitizeFileName(
    options.hydration.caseMeta.empresaNombre || "Seguimientos"
  );

  if (options.pdfOption.id === "base_only") {
    return `${companyName} - Seguimientos - Ficha inicial.pdf`;
  }

  const followupLabel = `Seguimiento ${options.pdfOption.followupIndex}`;
  if (options.pdfOption.includeFinalSummary) {
    return `${companyName} - Seguimientos - ${followupLabel} - Consolidado.pdf`;
  }

  return `${companyName} - Seguimientos - ${followupLabel}.pdf`;
}

function buildSeguimientosPdfSelectedSheetNames(options: {
  hydration: SeguimientosCaseHydration;
  pdfOption: SeguimientosPdfOption;
}) {
  const baseSheetName =
    options.hydration.caseMeta.baseSheetName?.trim() || SHEET_BASE;
  const selectedSheetNames = [baseSheetName];

  if (options.pdfOption.followupIndex) {
    selectedSheetNames.push(getFollowupSheetName(options.pdfOption.followupIndex));
  }

  if (options.pdfOption.includeFinalSummary) {
    selectedSheetNames.push(SHEET_FINAL);
  }

  return selectedSheetNames;
}

function buildSeguimientosPdfUnavailableMessage(options: {
  hydration: SeguimientosCaseHydration;
  optionId: string;
}) {
  const baseProgress = buildSeguimientosBaseProgress(options.hydration.baseValues);
  if (!baseProgress.isCompleted) {
    return "La ficha inicial aun no esta lista para exportacion.";
  }

  if (options.optionId === "base_only") {
    return "La variante seleccionada no esta disponible para este caso.";
  }

  const followupMatch = options.optionId.match(
    /^base_plus_followup_(\d+)(?:_plus_final)?$/
  );
  const followupIndex = followupMatch?.[1]
    ? Number.parseInt(followupMatch[1], 10)
    : null;
  const includeFinalSummary = options.optionId.endsWith("_plus_final");
  if (!followupIndex) {
    return "La variante seleccionada no esta disponible para este caso.";
  }

  const normalizedFollowupValues = normalizeSeguimientosFollowupValues(
    options.hydration.followupValuesByIndex[followupIndex as SeguimientosFollowupIndex] ??
      {},
    followupIndex as SeguimientosFollowupIndex
  );
  const followupProgress = buildSeguimientosFollowupProgress(
    normalizedFollowupValues,
    followupIndex as SeguimientosFollowupIndex
  );

  if (!followupProgress.isCompleted) {
    return "El seguimiento seleccionado aun no esta listo para exportacion.";
  }

  const followupDate =
    normalizedFollowupValues.fecha_seguimiento ||
    getSeguimientosFollowupDateFromBase(
      options.hydration.baseValues,
      followupIndex as SeguimientosFollowupIndex
    ) ||
    null;
  if (!followupDate) {
    return "El seguimiento seleccionado no tiene una fecha valida para exportar.";
  }

  if (includeFinalSummary && !options.hydration.summary.exportReady) {
    return "El consolidado necesita verificacion antes de incluirse en el PDF.";
  }

  return "La variante seleccionada no esta disponible para este caso.";
}

export async function refreshSeguimientosResultSummary(options: {
  caseId: string;
  supabase: ServerSupabaseClient;
  userId: string;
}): Promise<SeguimientosResultRefreshResponse> {
  try {
    const hydration = await getSeguimientosCaseHydrationByCaseId({
      caseId: options.caseId,
      supabase: options.supabase,
      userId: options.userId,
      maintenanceMode: "passive",
    });
    const baseSheetName = hydration.caseMeta.baseSheetName?.trim() || "";
    if (!baseSheetName) {
      return {
        status: "error",
        message:
          "No se pudo determinar la hoja base del caso para recalcular el consolidado.",
      };
    }

    const summary = await readSeguimientosFinalSummaryFromSpreadsheet({
      spreadsheetId: options.caseId,
      baseSheetName,
      attemptRepair: true,
    });
    const refreshedAt = new Date().toISOString();

    return {
      status: "ready",
      refreshedAt,
      hydration: {
        ...hydration,
        summary,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el consolidado de Seguimientos.",
    };
  }
}

export async function exportSeguimientosPdf(options: {
  caseId: string;
  optionId: string;
  supabase: ServerSupabaseClient;
  userId: string;
}): Promise<SeguimientosPdfExportResponse> {
  let temporarySpreadsheetId: string | null = null;

  try {
    const currentHydration = await getSeguimientosCaseHydrationByCaseId({
      caseId: options.caseId,
      supabase: options.supabase,
      userId: options.userId,
      maintenanceMode: "passive",
    });
    let hydration = currentHydration;
    const pdfOptions = listSeguimientosPdfOptions({
      companyType: hydration.caseMeta.companyType,
      baseValues: hydration.baseValues,
      followups: hydration.followupValuesByIndex,
      summary: hydration.summary,
    });
    const selectedOption = pdfOptions.find(
      (pdfOption) => pdfOption.id === options.optionId
    );

    if (!selectedOption) {
      return {
        status: "error",
        code: "invalid_pdf_option",
        message: buildSeguimientosPdfUnavailableMessage({
          hydration,
          optionId: options.optionId,
        }),
      };
    }

    if (!selectedOption.enabled) {
      return {
        status: "error",
        code: "invalid_pdf_option",
        message:
          selectedOption.disabledReason ||
          buildSeguimientosPdfUnavailableMessage({
            hydration,
            optionId: options.optionId,
          }),
      };
    }

    if (selectedOption.followupIndex && !selectedOption.fechaSeguimiento) {
      return {
        status: "error",
        message:
          "El seguimiento seleccionado no tiene una fecha valida para generar el PDF.",
      };
    }

    if (selectedOption.includeFinalSummary) {
      const refreshResult = await refreshSeguimientosResultSummary({
        caseId: options.caseId,
        supabase: options.supabase,
        userId: options.userId,
      });
      if (refreshResult.status !== "ready") {
        return {
          status: "error",
          message: refreshResult.message,
        };
      }

      hydration = refreshResult.hydration;
      if (!hydration.summary.exportReady) {
        return {
          status: "error",
          message:
            "No se pudo dejar el consolidado listo para exportacion.",
        };
      }
    }

    const selectedSheetNames = buildSeguimientosPdfSelectedSheetNames({
      hydration,
      pdfOption: selectedOption,
    });
    const tempParentFolderId = hydration.caseMeta.driveFolderId?.trim() || "";
    if (!tempParentFolderId) {
      return {
        status: "error",
        message:
          "No se encontro la carpeta del caso para preparar la exportacion temporal del PDF.",
      };
    }

    const copied = await copyTemplate(
      options.caseId,
      `${sanitizeFileName(hydration.caseMeta.folderName || hydration.caseMeta.empresaNombre || "Seguimientos")} - export temporal`,
      tempParentFolderId
    );
    temporarySpreadsheetId = copied.fileId;

    await keepOnlySheetsVisible(temporarySpreadsheetId, selectedSheetNames);
    const pdfBytes = await exportSheetToPdf(temporarySpreadsheetId);

    const pdfRootFolderId =
      process.env.GOOGLE_DRIVE_PDF_FOLDER_ID?.trim() ||
      process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() ||
      "";
    if (!pdfRootFolderId) {
      return {
        status: "error",
        message:
          "Falta GOOGLE_DRIVE_PDF_FOLDER_ID o GOOGLE_DRIVE_FOLDER_ID para exportar el PDF de Seguimientos.",
      };
    }

    const pdfCompanyFolderId = await getOrCreateFolder(
      pdfRootFolderId,
      sanitizeFileName(hydration.caseMeta.empresaNombre || "Seguimientos")
    );
    const uploaded = await uploadPdf(
      pdfBytes,
      buildSeguimientosPdfFileName({
        hydration,
        pdfOption: selectedOption,
      }),
      pdfCompanyFolderId
    );
    const exportedAt = new Date().toISOString();

    return {
      status: "ready",
      hydration,
      exportedAt,
      optionId: selectedOption.id,
      links: {
        sheetLink:
          hydration.caseMeta.spreadsheetUrl ||
          `https://docs.google.com/spreadsheets/d/${options.caseId}/edit`,
        pdfLink: uploaded.webViewLink,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo exportar el PDF de Seguimientos.",
    };
  } finally {
    if (temporarySpreadsheetId) {
      try {
        await trashDriveFile(temporarySpreadsheetId);
      } catch (error) {
        console.warn("[seguimientos.pdf.export] temp cleanup failed", {
          caseId: options.caseId,
          temporarySpreadsheetId,
          temporarySpreadsheetUrl: `https://docs.google.com/spreadsheets/d/${temporarySpreadsheetId}/edit`,
          needsManualCleanup: true,
          error,
        });
      }
    }
  }
}
