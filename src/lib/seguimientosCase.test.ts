import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFollowupValues,
  type SeguimientosFollowupIndex,
} from "@/lib/seguimientos";
import {
  SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
} from "@/lib/seguimientosStages";
import type { Empresa } from "@/lib/store/empresaStore";

const mocks = vi.hoisted(() => ({
  getDriveClient: vi.fn(),
  getSheetsClient: vi.fn(),
  getOrCreateFolder: vi.fn(),
  exportSheetToPdf: vi.fn(),
  uploadPdf: vi.fn(),
  trashDriveFile: vi.fn(),
  copyTemplate: vi.fn(),
  batchWriteCells: vi.fn(),
  clearProtectedRanges: vi.fn(),
  keepOnlySheetsVisible: vi.fn(),
  hideSheets: vi.fn(),
  getUsuarioRecaByCedula: vi.fn(),
  claimSeguimientosBootstrapLease: vi.fn(),
  releaseSeguimientosBootstrapLease: vi.fn(),
  createSeguimientosOverrideGrant: vi.fn(),
  inspectSeguimientosOverrideGrant: vi.fn(),
}));

vi.mock("@/lib/google/auth", () => ({
  getDriveClient: mocks.getDriveClient,
  getSheetsClient: mocks.getSheetsClient,
}));

vi.mock("@/lib/google/drive", () => ({
  exportSheetToPdf: mocks.exportSheetToPdf,
  getOrCreateFolder: mocks.getOrCreateFolder,
  sanitizeFileName: (value: string) => value,
  trashDriveFile: mocks.trashDriveFile,
  uploadPdf: mocks.uploadPdf,
}));

vi.mock("@/lib/google/driveQuery", () => ({
  requireDriveFileId: (value: string | null | undefined) => {
    if (!value) {
      throw new Error("Missing file id");
    }

    return value;
  },
}));

vi.mock("@/lib/google/sheets", () => ({
  batchWriteCells: mocks.batchWriteCells,
  clearProtectedRanges: mocks.clearProtectedRanges,
  copyTemplate: mocks.copyTemplate,
  keepOnlySheetsVisible: mocks.keepOnlySheetsVisible,
  hideSheets: mocks.hideSheets,
  normalizeA1Range: (value: string) => value.trim(),
  quoteSheetNameForA1: (value: string) => `'${value.replace(/'/g, "''")}'`,
}));

vi.mock("@/lib/usuariosRecaServer", () => ({
  getUsuarioRecaByCedula: mocks.getUsuarioRecaByCedula,
}));

vi.mock("@/lib/seguimientosBootstrapLease", () => ({
  claimSeguimientosBootstrapLease: mocks.claimSeguimientosBootstrapLease,
  releaseSeguimientosBootstrapLease: mocks.releaseSeguimientosBootstrapLease,
}));

vi.mock("@/lib/seguimientosOverrideGrant", () => ({
  createSeguimientosOverrideGrant: mocks.createSeguimientosOverrideGrant,
  inspectSeguimientosOverrideGrant: mocks.inspectSeguimientosOverrideGrant,
  inspectSeguimientosOverrideGrantDetailed: (...args: unknown[]) => {
    const result = mocks.inspectSeguimientosOverrideGrant(...args);
    if (result === "valid") {
      return {
        result: "valid",
        expiresAt: "2026-04-21T10:05:00.000Z",
      };
    }
    if (result === "expired") {
      return {
        result: "expired",
        expiresAt: "2026-04-21T10:05:00.000Z",
      };
    }
    return {
      result: "invalid",
      reason: "signature_invalid",
    };
  },
}));

import {
  bootstrapSeguimientosCase,
  exportSeguimientosPdf,
  grantSeguimientosStageOverride,
  refreshSeguimientosResultSummary,
  saveSeguimientosBaseStage,
  saveSeguimientosDirtyStages,
} from "@/lib/seguimientosCase";
import { buildSeguimientosFinalFormulaSpec } from "@/lib/seguimientosFinalSummary";

const GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder";
const GOOGLE_SHEETS_MIME = "application/vnd.google-apps.spreadsheet";
const BASE_SHEET_NAME = "9. SEGUIMIENTO AL PROCESO DE INCLUSION LABORAL";
const FINAL_SHEET_NAME = "PONDERADO FINAL";
const USER_ID = "user-1";
const REPAIRABLE_FINAL_FORMULA_CELL = {
  cell: "AA1",
  sourceCell: "D6",
  fieldKey: "fecha_visita",
  fieldLabel: "Fecha de la visita",
  formula: "=D6",
} as const;

async function withRepairableFinalFormulaSpec<T>(
  callback: (
    seguimientosCaseModule: typeof import("@/lib/seguimientosCase")
  ) => Promise<T>
) {
  vi.resetModules();
  vi.doMock("@/lib/seguimientosFinalSummary", async (importOriginal) => {
    const actual =
      await importOriginal<typeof import("@/lib/seguimientosFinalSummary")>();
    const baseSpec = actual.buildSeguimientosFinalFormulaSpec();

    return {
      ...actual,
      buildSeguimientosFinalFormulaSpec: () => ({
        ...baseSpec,
        validationMode: "canonical" as const,
        formulaCells: [REPAIRABLE_FINAL_FORMULA_CELL],
      }),
    };
  });

  try {
    const seguimientosCaseModule = await import("@/lib/seguimientosCase");
    return await callback(seguimientosCaseModule);
  } finally {
    vi.doUnmock("@/lib/seguimientosFinalSummary");
    vi.resetModules();
  }
}

function setValueAtPath(target: Record<string, unknown>, path: string, value: string) {
  const segments = path.split(".");
  let current: unknown = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isLastSegment = index === segments.length - 1;

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(segment, 10);
      if (isLastSegment) {
        current[arrayIndex] = value;
        return;
      }

      current = current[arrayIndex];
      continue;
    }

    const record = current as Record<string, unknown>;
    if (isLastSegment) {
      record[segment] = value;
      return;
    }

    current = record[segment];
  }
}

function buildCompletedBaseValues(empresa: Empresa) {
  const baseValues = createEmptySeguimientosBaseValues(empresa);
  const mutableBaseValues = baseValues as unknown as Record<string, unknown>;

  [
    ...SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
    ...SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  ].forEach((path) => {
    const value =
      path === "modalidad"
        ? "Presencial"
        : path === "fecha_visita"
          ? "2026-04-22"
          : path === "fecha_inicio_contrato"
            ? "2026-04-17"
            : path === "fecha_fin_contrato"
              ? "2026-12-21"
              : path === "fecha_firma_contrato"
                ? "2026-04-17"
                : "Listo";
    setValueAtPath(
      mutableBaseValues,
      path,
      value
    );
  });

  mutableBaseValues.nombre_empresa = empresa.nombre_empresa;
  mutableBaseValues.nit_empresa = empresa.nit_empresa;
  mutableBaseValues.nombre_vinculado = "Ana Perez";
  mutableBaseValues.cedula = "1001234567";

  return baseValues;
}

function buildCompletedFollowupValues(index: SeguimientosFollowupIndex) {
  const followupValues = createEmptySeguimientosFollowupValues(index);
  const mutableFollowupValues = followupValues as unknown as Record<string, unknown>;

  [
    ...SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
    ...SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  ].forEach((path) => {
    setValueAtPath(
      mutableFollowupValues,
      path,
      path === "modalidad"
        ? "Presencial"
        : path === "tipo_apoyo"
          ? "No requiere apoyo."
          : path === "fecha_seguimiento"
            ? `2026-04-2${index}`
            : "Ok"
    );
  });

  return followupValues;
}

type MockDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  appProperties?: Record<string, string>;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
};

function createEmpresa(
  overrides?: Partial<Empresa> & Pick<Empresa, "caja_compensacion">
): Empresa {
  return {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno SAS",
    nit_empresa: "900123456",
    direccion_empresa: "Calle 1 # 2-3",
    ciudad_empresa: "Bogota",
    sede_empresa: "Principal",
    zona_empresa: "Zona Norte",
    correo_1: "empresa@example.com",
    contacto_empresa: "Laura Gomez",
    telefono_empresa: "3000000000",
    cargo: "Lider SST",
    profesional_asignado: "Marta Ruiz",
    correo_profesional: "marta@example.com",
    asesor: "Carlos Perez",
    correo_asesor: "carlos@example.com",
    caja_compensacion: "Compensar",
    ...overrides,
  };
}

function createUserRow(overrides?: Record<string, unknown>) {
  return {
    cedula_usuario: "1001234567",
    nombre_usuario: "Ana Perez",
    discapacidad_usuario: "Auditiva",
    discapacidad_detalle: "",
    certificado_discapacidad: "Si",
    certificado_porcentaje: "45",
    telefono_oferente: "3000000000",
    correo_oferente: "ana@example.com",
    cargo_oferente: "Auxiliar administrativo",
    contacto_emergencia: "Mario Perez",
    parentesco: "Hermano",
    telefono_emergencia: "3010000000",
    fecha_firma_contrato: "2026-04-21",
    tipo_contrato: "Termino fijo",
    fecha_fin: "2026-12-21",
    empresa_nit: "900123456",
    empresa_nombre: "Empresa Uno SAS",
    ...overrides,
  };
}

function createSupabase(options: {
  nitResults?: Empresa[];
  nameResults?: Empresa[];
}) {
  const nitLimit = vi.fn().mockResolvedValue({
    data: options.nitResults ?? [],
    error: null,
  });
  const nitMaybeSingle = vi.fn().mockResolvedValue({
    data: (options.nitResults ?? [])[0] ?? null,
    error: null,
  });
  const nameLimit = vi.fn().mockResolvedValue({
    data: options.nameResults ?? [],
    error: null,
  });

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: nitMaybeSingle,
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: nitLimit,
            }),
            limit: nitLimit,
          }),
          limit: nitLimit,
        }),
        ilike: vi.fn().mockReturnValue({
          limit: nameLimit,
        }),
      }),
    }),
  };
}

function createDriveHarness(options?: {
  existingFolder?: boolean;
  existingSpreadsheet?: boolean;
  existingSpreadsheetAppProperties?: Record<string, string>;
  batchValueRanges?: Record<string, unknown[][]>;
  formulaValueRanges?: Record<string, unknown[][]>;
}) {
  const filesById = new Map<string, MockDriveFile>();
  const filesByParent = new Map<string, MockDriveFile[]>();
  const valueRanges = new Map(
    Object.entries(options?.batchValueRanges ?? {})
  );
  const formulaValueRanges = new Map(
    Object.entries(options?.formulaValueRanges ?? {})
  );
  const rootFolderId = "root-folder";
  const caseFolderId = "case-folder";
  const pdfCompanyFolderId = "pdf-company-folder";
  const spreadsheetId = "sheet-1";
  const folderName = "Ana Perez - 1001234567";
  const createdAt = "2026-04-21T10:00:00.000Z";
  let tempCopyCount = 0;

  function setParentFiles(parentId: string, files: MockDriveFile[]) {
    filesByParent.set(parentId, files);
    for (const file of files) {
      filesById.set(file.id, file);
    }
  }

  if (options?.existingFolder) {
    setParentFiles(rootFolderId, [
      {
        id: caseFolderId,
        name: folderName,
        mimeType: GOOGLE_FOLDER_MIME,
        parents: [rootFolderId],
      },
    ]);
  } else {
    setParentFiles(rootFolderId, []);
  }

  if (options?.existingSpreadsheet) {
    setParentFiles(caseFolderId, [
      {
        id: spreadsheetId,
        name: "Seguimientos - Ana Perez",
        mimeType: GOOGLE_SHEETS_MIME,
        parents: [caseFolderId],
        appProperties: options.existingSpreadsheetAppProperties ?? {},
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        createdTime: createdAt,
        modifiedTime: createdAt,
      },
    ]);
  } else {
    setParentFiles(caseFolderId, []);
  }

  const driveClient = {
    files: {
      list: vi.fn(async ({ q }: { q?: string }) => {
        const parentId =
          typeof q === "string" ? /'([^']+)'/.exec(q)?.[1] ?? "" : "";
        return {
          data: {
            files: filesByParent.get(parentId) ?? [],
          },
        };
      }),
      get: vi.fn(async ({ fileId }: { fileId: string }) => ({
        data: filesById.get(fileId) ?? null,
      })),
      update: vi.fn(
        async ({
          fileId,
          requestBody,
        }: {
          fileId: string;
          requestBody?: { appProperties?: Record<string, string> };
        }) => {
          const existing = filesById.get(fileId);
          if (!existing) {
            throw new Error(`Unknown file ${fileId}`);
          }

          const updated: MockDriveFile = {
            ...existing,
            appProperties: {
              ...(existing.appProperties ?? {}),
              ...(requestBody?.appProperties ?? {}),
            },
            modifiedTime: "2026-04-21T10:05:00.000Z",
          };

          filesById.set(fileId, updated);
          for (const parentId of updated.parents ?? []) {
            const siblings = filesByParent.get(parentId) ?? [];
            filesByParent.set(
              parentId,
              siblings.map((file) => (file.id === fileId ? updated : file))
            );
          }

          return {
            data: updated,
          };
        }
      ),
    },
  };

  const sheetsClient = {
    spreadsheets: {
      get: vi.fn(async () => ({
        data: {
          sheets: [
            { properties: { sheetId: 1, title: BASE_SHEET_NAME } },
            { properties: { sheetId: 2, title: "SEGUIMIENTO PROCESO IL 1" } },
            { properties: { sheetId: 3, title: "SEGUIMIENTO PROCESO IL 2" } },
            { properties: { sheetId: 4, title: "SEGUIMIENTO PROCESO IL 3" } },
            { properties: { sheetId: 5, title: "SEGUIMIENTO PROCESO IL 4" } },
            { properties: { sheetId: 6, title: "SEGUIMIENTO PROCESO IL 5" } },
            { properties: { sheetId: 7, title: "SEGUIMIENTO PROCESO IL 6" } },
            { properties: { sheetId: 8, title: FINAL_SHEET_NAME } },
          ],
        },
      })),
      values: {
        batchGet: vi.fn(
          async ({
            ranges,
            valueRenderOption,
          }: {
            ranges?: string[];
            valueRenderOption?: string;
          }) => ({
            data: {
              valueRanges: (ranges ?? []).map((range) => ({
                range,
                values:
                  valueRenderOption === "FORMULA"
                    ? (formulaValueRanges.get(range) ?? [])
                    : (valueRanges.get(range) ?? []),
              })),
            },
          })
        ),
      },
    },
  };

  mocks.getDriveClient.mockImplementation(() => driveClient as never);
  mocks.getSheetsClient.mockImplementation(() => sheetsClient as never);
  mocks.getOrCreateFolder.mockImplementation(
    async (parentId: string, name: string) => {
      if (name === "SEGUIMIENTOS") {
        return rootFolderId;
      }

      if (parentId === "pdf-root") {
        return pdfCompanyFolderId;
      }

      return caseFolderId;
    }
  );
  mocks.copyTemplate.mockImplementation(
    async (templateId: string, name: string, parentId: string) => {
      const isTempCopy = templateId === spreadsheetId && parentId === caseFolderId;
      const copiedFileId = isTempCopy
        ? `temp-sheet-${++tempCopyCount}`
        : spreadsheetId;
      const copied: MockDriveFile = {
        id: copiedFileId,
        name,
        mimeType: GOOGLE_SHEETS_MIME,
        parents: [parentId],
        appProperties: {},
        webViewLink: `https://docs.google.com/spreadsheets/d/${copiedFileId}/edit`,
        createdTime: createdAt,
        modifiedTime: createdAt,
      };
      filesById.set(copiedFileId, copied);
      filesByParent.set(parentId, [...(filesByParent.get(parentId) ?? []), copied]);
      return { fileId: copiedFileId };
    }
  );
  const groupedRangeSpecs = [
    { regex: /^'(.+)'!B(2[3-7])$/, target: (sheet: string) => `'${sheet}'!B23:B27`, startRow: 23 },
    { regex: /^'(.+)'!N(2[3-7])$/, target: (sheet: string) => `'${sheet}'!N23:N27`, startRow: 23 },
    { regex: /^'(.+)'!C(29|30|31)$/, target: (sheet: string) => `'${sheet}'!C29:C31`, startRow: 29 },
    { regex: /^'(.+)'!P(29|30|31)$/, target: (sheet: string) => `'${sheet}'!P29:P31`, startRow: 29 },
    { regex: /^'(.+)'!A(1[2-9]|20|21|22|23|24|25|26|27|28|29|30)$/, target: (sheet: string) => `'${sheet}'!A12:A30`, startRow: 12 },
    { regex: /^'(.+)'!G(1[2-9]|20|21|22|23|24|25|26|27|28|29|30)$/, target: (sheet: string) => `'${sheet}'!G12:G30`, startRow: 12 },
    { regex: /^'(.+)'!O(1[2-9]|20|21|22|23|24|25|26|27|28|29|30)$/, target: (sheet: string) => `'${sheet}'!O12:O30`, startRow: 12 },
    { regex: /^'(.+)'!R(1[2-9]|20|21|22|23|24|25|26|27|28|29|30)$/, target: (sheet: string) => `'${sheet}'!R12:R30`, startRow: 12 },
    { regex: /^'(.+)'!A(34|35|36|37|38|39|40|41)$/, target: (sheet: string) => `'${sheet}'!A34:A41`, startRow: 34 },
    { regex: /^'(.+)'!J(34|35|36|37|38|39|40|41)$/, target: (sheet: string) => `'${sheet}'!J34:J41`, startRow: 34 },
    { regex: /^'(.+)'!L(34|35|36|37|38|39|40|41)$/, target: (sheet: string) => `'${sheet}'!L34:L41`, startRow: 34 },
    { regex: /^'(.+)'!D(4[7-9]|5[0-6])$/, target: (sheet: string) => `'${sheet}'!D47:D56`, startRow: 47 },
    { regex: /^'(.+)'!N(4[7-9]|5[0-6])$/, target: (sheet: string) => `'${sheet}'!N47:N56`, startRow: 47 },
  ] as const;

  function updateGroupedValueRanges(range: string, value: string) {
    for (const spec of groupedRangeSpecs) {
      const match = spec.regex.exec(range);
      if (!match) {
        continue;
      }

      const sheetName = match[1] ?? "";
      const rowText = match[2] ?? "";
      const row = Number.parseInt(rowText, 10);
      const targetRange = spec.target(sheetName);
      const nextValues = Array.from(
        { length: row - spec.startRow + 1 },
        (_, index) => valueRanges.get(targetRange)?.[index] ?? [""]
      );
      nextValues[row - spec.startRow] = [value];
      valueRanges.set(targetRange, nextValues);
      return;
    }
  }

  mocks.batchWriteCells.mockImplementation(
    async (
      spreadsheetIdToWrite: string,
      writes: Array<{ range: string; value: string }>
    ) => {
      for (const write of writes) {
        valueRanges.set(write.range, [[write.value]]);
        updateGroupedValueRanges(write.range, write.value);
        if (String(write.value).startsWith("=")) {
          formulaValueRanges.set(write.range, [[write.value]]);
        } else {
          formulaValueRanges.delete(write.range);
        }
      }

      const writtenSpreadsheet = filesById.get(spreadsheetIdToWrite);
      if (writtenSpreadsheet) {
        const updatedSpreadsheet = {
          ...writtenSpreadsheet,
          modifiedTime: "2026-04-21T10:05:00.000Z",
        };
        filesById.set(spreadsheetIdToWrite, updatedSpreadsheet);
        for (const parentId of updatedSpreadsheet.parents ?? []) {
          const siblings = filesByParent.get(parentId) ?? [];
          filesByParent.set(
            parentId,
            siblings.map((file) =>
              file.id === spreadsheetIdToWrite ? updatedSpreadsheet : file
            )
          );
        }
      }
    }
  );
  mocks.exportSheetToPdf.mockResolvedValue(Buffer.from("pdf-bytes"));
  mocks.uploadPdf.mockResolvedValue({
    fileId: "pdf-1",
    webViewLink: "https://drive.google.com/file/d/pdf-1/view",
  });
  mocks.trashDriveFile.mockResolvedValue(undefined);

  return {
    driveClient,
    sheetsClient,
    rootFolderId,
    caseFolderId,
    pdfCompanyFolderId,
    spreadsheetId,
    valueRanges,
    formulaValueRanges,
  };
}

function mockPostWriteSpreadsheetModifiedTimeSequence(
  harness: ReturnType<typeof createDriveHarness>,
  sequence: readonly string[]
) {
  const originalGetImplementation =
    harness.driveClient.files.get.getMockImplementation();
  const writeCountBaseline = mocks.batchWriteCells.mock.calls.length;
  let postWriteReadCount = 0;

  harness.driveClient.files.get.mockImplementation(async (...args) => {
    if (!originalGetImplementation) {
      throw new Error("Missing drive get implementation");
    }

    const response = await originalGetImplementation(...args);
    const [request] = args as Array<{ fileId?: string }>;
    if (
      request?.fileId === harness.spreadsheetId &&
      mocks.batchWriteCells.mock.calls.length > writeCountBaseline
    ) {
      const modifiedTime =
        sequence[Math.min(postWriteReadCount, sequence.length - 1)] ??
        response.data?.modifiedTime;
      postWriteReadCount += 1;
      return {
        data: {
          ...response.data,
          modifiedTime,
        },
      };
    }

    return response;
  });
}

function createCaseAppProperties(overrides?: Record<string, string>) {
  return {
    kind: "seguimiento_il",
    schema_version: "1",
    cedula: "1001234567",
    empresa_nit: "900123456",
    empresa_nombre: "Empresa Uno SAS",
    company_type: "no_compensar",
    max_followups: "3",
    max_seguimientos: "3",
    base_sheet_name: BASE_SHEET_NAME,
    folder_id: "case-folder",
    spreadsheet_id: "sheet-1",
    owner_user_id: USER_ID,
    owner_claimed_at: "2026-04-21T10:00:00.000Z",
    ...overrides,
  };
}

describe("bootstrapSeguimientosCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "drive-root");
    vi.stubEnv("GOOGLE_SHEETS_MASTER_ID", "template-master");
    mocks.batchWriteCells.mockResolvedValue(undefined);
    mocks.clearProtectedRanges.mockResolvedValue(undefined);
    mocks.keepOnlySheetsVisible.mockResolvedValue(undefined);
    mocks.getUsuarioRecaByCedula.mockResolvedValue(createUserRow());
    mocks.claimSeguimientosBootstrapLease.mockResolvedValue({
      claimed: true,
      leaseOwner: "request-1",
      leaseExpiresAt: "2026-04-21T10:00:30.000Z",
    });
    mocks.releaseSeguimientosBootstrapLease.mockResolvedValue(undefined);
    mocks.createSeguimientosOverrideGrant.mockImplementation(
      ({ stageId }: { stageId: string }) => ({
        stageId,
        token: `token-${stageId}`,
        expiresAt: "2026-04-21T10:05:00.000Z",
      })
    );
    mocks.inspectSeguimientosOverrideGrant.mockReturnValue("valid");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bootstraps a new no_compensar case with three visible followups", async () => {
    createDriveHarness();

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    expect(result.hydration.caseMeta.companyType).toBe("no_compensar");
    expect(result.hydration.caseMeta.maxFollowups).toBe(3);
    expect(result.hydration.workflow.visibleStageIds).toEqual(["base_process"]);
    expect(mocks.copyTemplate).toHaveBeenCalledOnce();
    expect(mocks.clearProtectedRanges).toHaveBeenCalledOnce();
    expect(mocks.batchWriteCells).toHaveBeenCalledOnce();
    expect(mocks.keepOnlySheetsVisible).toHaveBeenCalled();
  });

  it("bootstraps a new compensar case with six visible followups", async () => {
    createDriveHarness();

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Compensar" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    expect(result.hydration.caseMeta.companyType).toBe("compensar");
    expect(result.hydration.caseMeta.maxFollowups).toBe(6);
    expect(result.hydration.workflow.visibleStageIds).toEqual(["base_process"]);
    expect(mocks.copyTemplate).toHaveBeenCalledOnce();
  });

  it("builds case folder names with the first and last token for three-part names", async () => {
    createDriveHarness();
    mocks.getUsuarioRecaByCedula.mockResolvedValue(
      createUserRow({
        nombre_usuario: "Ana Maria Perez",
      })
    );

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    expect(mocks.copyTemplate).toHaveBeenCalledWith(
      "template-master",
      "Ana Perez - 1001234567",
      "case-folder"
    );
  });

  it("reuses the existing folder and spreadsheet when the case already exists", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    expect(result.hydration.caseMeta.caseId).toBe("sheet-1");
    expect(result.hydration.caseMeta.maxFollowups).toBe(3);
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
    expect(mocks.batchWriteCells).not.toHaveBeenCalled();
  });

  it("claims ownership for an existing ownerless case during bootstrap", async () => {
    const harness = createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties({
        owner_user_id: "",
        owner_claimed_at: "",
      }),
    });

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    expect(harness.driveClient.files.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: "sheet-1",
        requestBody: expect.objectContaining({
          appProperties: expect.objectContaining({
            owner_user_id: USER_ID,
            owner_claimed_at: expect.any(String),
          }),
        }),
      })
    );
  });

  it("returns bootstrap_in_progress when another bootstrap lease is active", async () => {
    createDriveHarness();
    mocks.claimSeguimientosBootstrapLease.mockResolvedValueOnce({
      claimed: false,
      leaseOwner: "other-request",
      leaseExpiresAt: "2026-04-21T10:00:30.000Z",
    });

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "error",
      code: "bootstrap_in_progress",
      message:
        "Ya hay otra preparacion de Seguimientos en curso para esta cedula. Espera unos segundos e intenta de nuevo.",
    });
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
    expect(mocks.releaseSeguimientosBootstrapLease).not.toHaveBeenCalled();
  });

  it("returns google_storage_quota_exceeded when Drive quota blocks case preparation", async () => {
    createDriveHarness();
    mocks.copyTemplate.mockRejectedValueOnce(
      Object.assign(new Error("Google Sheets quota exceeded"), {
        status: 429,
      })
    );

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "error",
      code: "google_storage_quota_exceeded",
      message:
        "Google Drive/Sheets no pudo preparar el caso por limite temporal de cuota. Intenta de nuevo en unos minutos.",
    });
    expect(mocks.releaseSeguimientosBootstrapLease).toHaveBeenCalledOnce();
  });

  it("returns case_bootstrap_storage_failed when Drive preparation fails generically", async () => {
    createDriveHarness();
    mocks.copyTemplate.mockRejectedValueOnce(new Error("drive-down"));

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "error",
      code: "case_bootstrap_storage_failed",
      message: "No se pudo preparar el archivo de Seguimientos en Google Drive.",
    });
    expect(mocks.releaseSeguimientosBootstrapLease).toHaveBeenCalledOnce();
  });

  it("bootstraps normally when the NIT matches exactly one active empresa", async () => {
    createDriveHarness();

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [
          createEmpresa({
            id: "empresa-1",
            nombre_empresa: "Empresa Uno SAS",
            caja_compensacion: "Colsubsidio",
          }),
        ],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }
    expect(result.hydration.empresaSnapshot?.nombre_empresa).toBe(
      "Empresa Uno SAS"
    );
  });

  it("requires disambiguation and preselects the exact empresa_nombre match for duplicate NITs", async () => {
    createDriveHarness();

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [
          createEmpresa({ id: "empresa-1", caja_compensacion: "Compensar" }),
          createEmpresa({
            id: "empresa-2",
            nombre_empresa: "Empresa Dos SAS",
            caja_compensacion: "Compensar",
          }),
        ],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("requires_disambiguation");
    if (result.status !== "requires_disambiguation") {
      return;
    }
    expect(result.options).toHaveLength(2);
    expect(result.preselectedEmpresaId).toBe("empresa-1");
    expect(result).toMatchObject({
      status: "requires_disambiguation",
      cedula: "1001234567",
      nombreVinculado: "Ana Perez",
      nit: "900123456",
      preselectedEmpresaId: "empresa-1",
      options: [
        expect.objectContaining({
          id: "empresa-1",
          nombre_empresa: "Empresa Uno SAS",
          ciudad_empresa: "Bogota",
          sede_empresa: "Principal",
          zona_empresa: "Zona Norte",
        }),
        expect.objectContaining({
          id: "empresa-2",
          nombre_empresa: "Empresa Dos SAS",
        }),
      ],
    });
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
  });

  it("requires disambiguation without preselection when no duplicate NIT name matches exactly", async () => {
    createDriveHarness();
    mocks.getUsuarioRecaByCedula.mockResolvedValue(
      createUserRow({
        empresa_nombre: "Empresa Uno SAS ",
      })
    );

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [
          createEmpresa({ id: "empresa-1", caja_compensacion: "Compensar" }),
          createEmpresa({
            id: "empresa-2",
            nombre_empresa: "Empresa Dos SAS",
            caja_compensacion: "Compensar",
          }),
        ],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      status: "requires_disambiguation",
      nit: "900123456",
    });
    expect(result).not.toHaveProperty("preselectedEmpresaId");
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
  });

  it("requires empresa assignment when the vinculado NIT has no active catalog rows", async () => {
    createDriveHarness();
    mocks.getUsuarioRecaByCedula.mockResolvedValue(
      createUserRow({
        empresa_nit: "900000000",
        empresa_nombre: "Empresa Inactiva SAS",
      })
    );

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [],
        nameResults: [],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "requires_empresa_assignment",
      cedula: "1001234567",
      nombreVinculado: "Ana Perez",
      initialNit: "900000000",
      message:
        "El NIT 900000000 registrado en el vinculado no esta en el catalogo activo. Asigna una empresa valida o cambia el NIT.",
    });
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
  });

  it("returns the existing guidance when the cedula does not exist in usuarios_reca", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue(null);

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "error",
      message: "No se encontraron datos en usuarios RECA para esa cédula.",
    });
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
  });

  it("asks for manual company type resolution when caja_compensacion is empty", async () => {
    createDriveHarness();

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      status: "resolution_required",
      reason: "company_type",
    });
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
  });

  it("returns case_conflict when the existing case metadata points to another empresa", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties({
        empresa_nit: "811000111",
        empresa_nombre: "Empresa Legada SAS",
      }),
    });

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      status: "resolution_required",
      reason: "case_conflict",
    });
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
  });

  it("preserves timeline dates and mirrors the base write into ponderado when saving the ficha inicial", async () => {
    const harness = createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'${BASE_SHEET_NAME}'!D8`]: [["2026-04-20"]],
        [`'${BASE_SHEET_NAME}'!R8`]: [["Presencial"]],
        [`'${BASE_SHEET_NAME}'!C29:C31`]: [["2026-04-21"], [""], [""]],
        [`'${FINAL_SHEET_NAME}'!D11`]: [["Colsubsidio"]],
        [`'${FINAL_SHEET_NAME}'!Q12`]: [["Marta Ruiz"]],
        [`'${FINAL_SHEET_NAME}'!N18`]: [["2026-04-15"]],
      },
    });

    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const baseValues = createEmptySeguimientosBaseValues(empresa);
    baseValues.fecha_visita = "2026-04-22";
    baseValues.modalidad = "Virtual";
    baseValues.contacto_emergencia = "Nuevo contacto";
    baseValues.seguimiento_fechas_1_3 = ["", "", ""];

    const result = await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues,
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    const writes = mocks.batchWriteCells.mock.calls.at(-1)?.[1] as Array<{
      range: string;
      value: string;
    }>;

    expect(writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          range: `'${BASE_SHEET_NAME}'!D8`,
          value: "22/04/2026",
        }),
        expect.objectContaining({
          range: `'${BASE_SHEET_NAME}'!C29`,
          value: "21/04/2026",
        }),
        expect.objectContaining({
          range: `'${FINAL_SHEET_NAME}'!D6`,
          value: "22/04/2026",
        }),
        expect.objectContaining({
          range: `'${FINAL_SHEET_NAME}'!L20`,
          value: "",
        }),
      ])
    );
    expect(
      result.hydration.stageDraftStateByStageId.base_process?.lastSavedToSheetsAt
    ).toBe(result.savedAt);
    expect(result.hydration.baseValues.nombre_vinculado).toBe("Ana Perez");
    expect(result.hydration.baseValues.cedula).toBe("1001234567");
    expect(mocks.keepOnlySheetsVisible).not.toHaveBeenCalled();
    expect(harness.driveClient.files.update).not.toHaveBeenCalled();
  });

  it("saves all dirty followup stages and syncs their dates back into the ficha inicial", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'${BASE_SHEET_NAME}'!C29:C31`]: [["2026-04-21"], [""], [""]],
        [`'${FINAL_SHEET_NAME}'!D11`]: [["Colsubsidio"]],
        [`'${FINAL_SHEET_NAME}'!Q12`]: [["Marta Ruiz"]],
        [`'SEGUIMIENTO PROCESO IL 1'!${"X8"}`]: [["2026-04-21"]],
      },
    });

    const followup1 = createEmptySeguimientosFollowupValues(1);
    followup1.modalidad = "Presencial";
    followup1.fecha_seguimiento = "2026-04-28";
    followup1.tipo_apoyo = "No requiere apoyo.";
    followup1.item_autoevaluacion[0] = "Bien";
    followup1.item_eval_empresa[0] = "Bien";
    followup1.empresa_eval[0] = "Excelente";

    const followup2 = createEmptySeguimientosFollowupValues(2);
    followup2.modalidad = "Virtual";
    followup2.fecha_seguimiento = "2026-05-05";
    followup2.tipo_apoyo = "Requiere apoyo bajo.";
    followup2.item_autoevaluacion[0] = "Bien";
    followup2.item_eval_empresa[0] = "Excelente";
    followup2.empresa_eval[0] = "Bien";

    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });

    const result = await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_2",
      baseValues: buildCompletedBaseValues(empresa),
      followupValuesByIndex: {
        1: followup1,
        2: followup2,
      },
      dirtyStageIds: ["base_process", "followup_1", "followup_2"],
      overrideGrants: [
        {
          stageId: "followup_1",
          token: "token-followup_1",
        },
      ],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    const writes = mocks.batchWriteCells.mock.calls.at(-1)?.[1] as Array<{
      range: string;
      value: string;
    }>;

    expect(writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          range: `'${BASE_SHEET_NAME}'!C29`,
          value: "28/04/2026",
        }),
        expect.objectContaining({
          range: `'${BASE_SHEET_NAME}'!C30`,
          value: "05/05/2026",
        }),
        expect.objectContaining({
          range: `'SEGUIMIENTO PROCESO IL 1'!X8`,
          value: "28/04/2026",
        }),
        expect.objectContaining({
          range: `'SEGUIMIENTO PROCESO IL 2'!X8`,
          value: "05/05/2026",
        }),
      ])
    );
    expect(result.savedStageIds).toEqual([
      "base_process",
      "followup_1",
      "followup_2",
    ]);
  });

  it("rejects saving a protected historical followup without a valid override grant", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const initialSaveResult = await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues: buildCompletedBaseValues(empresa),
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["base_process", "followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(initialSaveResult.status).toBe("ready");

    const followup1 = buildCompletedFollowupValues(1);
    followup1.fecha_seguimiento = "2026-04-29";

    await expect(
      saveSeguimientosDirtyStages({
        caseId: "sheet-1",
        companyType: "no_compensar",
        activeStageId: "followup_1",
        baseValues: createEmptySeguimientosBaseValues(
          createEmpresa({ caja_compensacion: "Colsubsidio" })
        ),
        followupValuesByIndex: {
          1: followup1,
        },
        dirtyStageIds: ["followup_1"],
        overrideGrants: [],
        supabase: createSupabase({
          nitResults: [empresa],
        }) as never,
        userId: USER_ID,
      })
    ).rejects.toMatchObject({
      code: "override_required",
      details: {
        missingOverrideStageIds: ["followup_1"],
      },
    });
  });

  it("reports the exact historical stage still missing override in bundled saves", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });

    const initialSaveResult = await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues: buildCompletedBaseValues(empresa),
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["base_process", "followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(initialSaveResult.status).toBe("ready");

    const editedBaseValues = buildCompletedBaseValues(empresa);
    editedBaseValues.contacto_empresa = "Nuevo contacto";
    const editedFollowup = buildCompletedFollowupValues(1);
    editedFollowup.situacion_encontrada = "Se marco visita fallida.";

    await expect(
      saveSeguimientosDirtyStages({
        caseId: "sheet-1",
        companyType: "no_compensar",
        activeStageId: "followup_1",
        baseValues: editedBaseValues,
        followupValuesByIndex: {
          1: editedFollowup,
        },
        dirtyStageIds: ["base_process", "followup_1"],
        overrideGrants: [
          {
            stageId: "base_process",
            token: "token-base_process",
          },
        ],
        supabase: createSupabase({
          nitResults: [empresa],
        }) as never,
        userId: USER_ID,
      })
    ).rejects.toMatchObject({
      code: "override_required",
      details: {
        missingOverrideStageIds: ["followup_1"],
      },
    });
  });

  it("reports expired overrides when saving a historical ficha inicial", async () => {
    createDriveHarness();

    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const baseValues = buildCompletedBaseValues(empresa);
    const initial = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });
    expect(initial.status).toBe("ready");
    if (initial.status !== "ready") {
      return;
    }

    await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues,
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
      overrideGrant: null,
    });

    mocks.inspectSeguimientosOverrideGrant.mockImplementation(
      ({ stageId }: { stageId: string }) =>
        stageId === "base_process" ? "expired" : "valid"
    );

    await expect(
      saveSeguimientosBaseStage({
        caseId: "sheet-1",
        baseValues: {
          ...baseValues,
          observaciones:
            "Ajuste historico de ficha inicial despues del primer guardado.",
        },
        supabase: createSupabase({
          nitResults: [empresa],
        }) as never,
        userId: USER_ID,
        overrideGrant: {
          stageId: "base_process",
          token: "expired-base-process-grant",
        },
      })
    ).rejects.toMatchObject({
      code: "override_expired",
      details: {
        expiredOverrideStageIds: ["base_process"],
      },
    });
  });

  it("reports missing and expired historical overrides together in bundled saves", async () => {
    createDriveHarness();

    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const baseValues = buildCompletedBaseValues(empresa);
    const followupValues = buildCompletedFollowupValues(1);
    const initial = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });
    expect(initial.status).toBe("ready");
    if (initial.status !== "ready") {
      return;
    }

    await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues,
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
      overrideGrant: null,
    });

    await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues,
      followupValuesByIndex: {
        1: followupValues,
      },
      dirtyStageIds: ["followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    mocks.inspectSeguimientosOverrideGrant.mockImplementation(
      ({ stageId }: { stageId: string }) =>
        stageId === "base_process" ? "expired" : "valid"
    );

    await expect(
      saveSeguimientosDirtyStages({
        caseId: "sheet-1",
        companyType: "no_compensar",
        activeStageId: "followup_1",
        baseValues: {
          ...baseValues,
          observaciones: "Correccion historica de ficha inicial.",
        },
        followupValuesByIndex: {
          1: {
            ...followupValues,
            situacion_encontrada: "Seguimiento historico ajustado.",
          },
        },
        dirtyStageIds: ["base_process", "followup_1"],
        overrideGrants: [
          {
            stageId: "base_process",
            token: "expired-base-process-grant",
          },
        ],
        supabase: createSupabase({
          nitResults: [empresa],
        }) as never,
        userId: USER_ID,
      })
    ).rejects.toMatchObject({
      code: "override_expired",
      details: {
        expiredOverrideStageIds: ["base_process"],
        missingOverrideStageIds: ["followup_1"],
      },
    });
  });

  it("rejects followup saves when the ficha inicial is still incomplete", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });

    const result = await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues: createEmptySeguimientosBaseValues(
        createEmpresa({ caja_compensacion: "Colsubsidio" })
      ),
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "error",
      code: "base_stage_incomplete",
      message:
        "La ficha inicial debe estar completa antes de guardar seguimientos.",
    });
    expect(mocks.batchWriteCells).not.toHaveBeenCalled();
  });

  it("allows followup saves when the same request completes the ficha inicial", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });

    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const result = await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues: buildCompletedBaseValues(empresa),
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["base_process", "followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    expect(mocks.batchWriteCells).toHaveBeenCalled();
  });

  it("grants override tokens for each protected visible stage requested", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });

    const saveResult = await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues: buildCompletedBaseValues(empresa),
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["base_process", "followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(saveResult.status).toBe("ready");

    const result = await grantSeguimientosStageOverride({
      caseId: "sheet-1",
      stageIds: ["base_process", "followup_1"],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "ready",
      grants: [
        {
          stageId: "base_process",
          token: "token-base_process",
          expiresAt: "2026-04-21T10:05:00.000Z",
        },
        {
          stageId: "followup_1",
          token: "token-followup_1",
          expiresAt: "2026-04-21T10:05:00.000Z",
        },
      ],
    });
    expect(mocks.createSeguimientosOverrideGrant).toHaveBeenCalledWith({
      caseId: "sheet-1",
      stageId: "base_process",
      userId: USER_ID,
    });
    expect(mocks.createSeguimientosOverrideGrant).toHaveBeenCalledWith({
      caseId: "sheet-1",
      stageId: "followup_1",
      userId: USER_ID,
    });
  });

  it("returns override_unavailable when the override secret is missing during grant creation", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const baseValues = buildCompletedBaseValues(empresa);

    const saveResult = await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues,
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });
    expect(saveResult.status).toBe("ready");

    mocks.createSeguimientosOverrideGrant.mockImplementation(() => {
      throw new Error("Falta la variable de entorno SEGUIMIENTOS_OVERRIDE_SECRET.");
    });

    await expect(
      grantSeguimientosStageOverride({
        caseId: "sheet-1",
        stageIds: ["base_process"],
        supabase: createSupabase({
          nitResults: [empresa],
        }) as never,
        userId: USER_ID,
      })
    ).rejects.toMatchObject({
      code: "override_unavailable",
      statusCode: 503,
    });
  });

  it("rejects stale ficha inicial saves with case_conflict", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });

    await expect(
      saveSeguimientosBaseStage({
        caseId: "sheet-1",
        baseValues: buildCompletedBaseValues(
          createEmpresa({ caja_compensacion: "Colsubsidio" })
        ),
        supabase: createSupabase({
          nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
        }) as never,
        userId: USER_ID,
        expectedCaseUpdatedAt: "2026-04-21T09:00:00.000Z",
      })
    ).rejects.toMatchObject({
      code: "case_conflict",
      statusCode: 409,
      details: {
        currentCaseUpdatedAt: "2026-04-21T10:00:00.000Z",
      },
    });
  });

  it("returns written_needs_reload when Google writes succeed but rehydration fails afterwards", async () => {
    const harness = createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'${BASE_SHEET_NAME}'!C29:C31`]: [["2026-04-21"], [""], [""]],
      },
    });
    const batchGet = harness.sheetsClient.spreadsheets.values.batchGet as ReturnType<
      typeof vi.fn
    >;
    const originalBatchGetImplementation = batchGet.getMockImplementation();
    const originalBatchWriteImplementation =
      mocks.batchWriteCells.getMockImplementation();
    let failRehydrationReads = false;

    batchGet.mockImplementation(async (...args) => {
      if (failRehydrationReads) {
        throw new Error("Google Sheets quota exceeded");
      }

      if (!originalBatchGetImplementation) {
        throw new Error("Missing batchGet implementation");
      }

      return originalBatchGetImplementation(...args);
    });
    mocks.batchWriteCells.mockImplementation(async (...args) => {
      if (!originalBatchWriteImplementation) {
        throw new Error("Missing batchWriteCells implementation");
      }

      await originalBatchWriteImplementation(...args);
      failRehydrationReads = true;
    });

    const result = await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues: buildCompletedBaseValues(
        createEmpresa({ caja_compensacion: "Colsubsidio" })
      ),
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "written_needs_reload",
      savedAt: expect.any(String),
      savedStageIds: ["base_process"],
      message:
        "Los cambios ya quedaron en Google Sheets. Recarga Seguimientos antes de continuar.",
    });
  });

  it("waits for Drive modifiedTime before returning a ready followup save", async () => {
    const harness = createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'${BASE_SHEET_NAME}'!C29:C31`]: [["2026-04-21"], [""], [""]],
        [`'SEGUIMIENTO PROCESO IL 1'!${"X8"}`]: [["2026-04-21"]],
      },
    });
    mockPostWriteSpreadsheetModifiedTimeSequence(harness, [
      "2026-04-21T10:00:00.000Z",
      "2026-04-21T10:05:00.000Z",
    ]);
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });

    const result = await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues: buildCompletedBaseValues(empresa),
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["base_process", "followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
      expectedCaseUpdatedAt: "2026-04-21T10:00:00.000Z",
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    expect(result.hydration.caseMeta.updatedAt).toBe(
      "2026-04-21T10:05:00.000Z"
    );
  });

  it("returns written_needs_reload when Drive modifiedTime never advances after a followup save", async () => {
    const harness = createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'${BASE_SHEET_NAME}'!C29:C31`]: [["2026-04-21"], [""], [""]],
        [`'SEGUIMIENTO PROCESO IL 1'!${"X8"}`]: [["2026-04-21"]],
      },
    });
    mockPostWriteSpreadsheetModifiedTimeSequence(harness, [
      "2026-04-21T10:00:00.000Z",
      "2026-04-21T10:00:00.000Z",
      "2026-04-21T10:00:00.000Z",
      "2026-04-21T10:00:00.000Z",
    ]);
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });

    const result = await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues: buildCompletedBaseValues(empresa),
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["base_process", "followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
      expectedCaseUpdatedAt: "2026-04-21T10:00:00.000Z",
    });

    expect(result).toEqual({
      status: "written_needs_reload",
      savedAt: expect.any(String),
      savedStageIds: ["base_process", "followup_1"],
      message:
        "Los cambios ya quedaron en Google Sheets. Recarga Seguimientos antes de continuar.",
    });
  });
});

describe("seguimientos final summary and export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "drive-root");
    vi.stubEnv("GOOGLE_DRIVE_PDF_FOLDER_ID", "pdf-root");
    vi.stubEnv("GOOGLE_SHEETS_MASTER_ID", "template-master");
    mocks.clearProtectedRanges.mockResolvedValue(undefined);
    mocks.keepOnlySheetsVisible.mockResolvedValue(undefined);
    mocks.getUsuarioRecaByCedula.mockResolvedValue(createUserRow());
    mocks.claimSeguimientosBootstrapLease.mockResolvedValue({
      claimed: true,
      leaseOwner: "request-1",
      leaseExpiresAt: "2026-04-21T10:00:30.000Z",
    });
    mocks.releaseSeguimientosBootstrapLease.mockResolvedValue(undefined);
    mocks.createSeguimientosOverrideGrant.mockImplementation(
      ({ stageId }: { stageId: string }) => ({
        stageId,
        token: `token-${stageId}`,
        expiresAt: "2026-04-21T10:05:00.000Z",
      })
    );
    mocks.inspectSeguimientosOverrideGrant.mockReturnValue("valid");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hydrates a real final summary from PONDERADO FINAL", async () => {
    const formulaSpec = buildSeguimientosFinalFormulaSpec();
    const formulaValueRanges = Object.fromEntries(
      formulaSpec.formulaCells.map((formulaCell) => [
        `'${FINAL_SHEET_NAME}'!${formulaCell.cell}`,
        [[formulaCell.formula]],
      ])
    );

    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'${FINAL_SHEET_NAME}'!D6`]: [["2026-04-21"]],
        [`'${FINAL_SHEET_NAME}'!Q6`]: [["Presencial"]],
        [`'${FINAL_SHEET_NAME}'!D7`]: [["Empresa Uno SAS"]],
        [`'${FINAL_SHEET_NAME}'!Q7`]: [["Bogota"]],
        [`'${FINAL_SHEET_NAME}'!L20`]: [["Atender llamadas"]],
        [`'${FINAL_SHEET_NAME}'!R20`]: [["Archivar soportes"]],
      },
      formulaValueRanges,
    });

    const hydration = await refreshSeguimientosResultSummary({
      caseId: "sheet-1",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(hydration.status).toBe("ready");
    if (hydration.status !== "ready") {
      return;
    }

    expect(hydration.hydration.summary.formulaIntegrity).toBe("healthy");
    expect(hydration.hydration.summary.fields.fecha_visita).toBe("2026-04-21");
    expect(hydration.hydration.summary.fields.funcion_1).toBe(
      "Atender llamadas"
    );
  });

  it("waits for Drive modifiedTime when refreshing repairs final summary formulas", async () => {
    const harness = createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'${FINAL_SHEET_NAME}'!D6`]: [["2026-04-21"]],
        [`'${FINAL_SHEET_NAME}'!Q6`]: [["Presencial"]],
      },
      formulaValueRanges: {
        [`'${FINAL_SHEET_NAME}'!${REPAIRABLE_FINAL_FORMULA_CELL.cell}`]: [
          ["=BROKEN_FORMULA()"],
        ],
      },
    });
    mockPostWriteSpreadsheetModifiedTimeSequence(harness, [
      "2026-04-21T10:00:00.000Z",
      "2026-04-21T10:05:00.000Z",
    ]);

    const result = await withRepairableFinalFormulaSpec(
      ({ refreshSeguimientosResultSummary: refreshWithRepairableSpec }) =>
        refreshWithRepairableSpec({
          caseId: "sheet-1",
          supabase: createSupabase({
            nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
          }) as never,
          userId: USER_ID,
        })
    );

    expect(
      harness.formulaValueRanges.get(
        `'${FINAL_SHEET_NAME}'!${REPAIRABLE_FINAL_FORMULA_CELL.cell}`
      )
    ).toEqual([[REPAIRABLE_FINAL_FORMULA_CELL.formula]]);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    expect(result.hydration.caseMeta.updatedAt).toBe(
      "2026-04-21T10:05:00.000Z"
    );
    expect(result.hydration.summary.lastRepairedAt).toEqual(expect.any(String));
  });

  it("returns written_needs_reload when repaired final summary formulas do not advance Drive modifiedTime", async () => {
    const harness = createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      formulaValueRanges: {
        [`'${FINAL_SHEET_NAME}'!${REPAIRABLE_FINAL_FORMULA_CELL.cell}`]: [
          ["=BROKEN_FORMULA()"],
        ],
      },
    });
    mockPostWriteSpreadsheetModifiedTimeSequence(harness, [
      "2026-04-21T10:00:00.000Z",
      "2026-04-21T10:00:00.000Z",
      "2026-04-21T10:00:00.000Z",
      "2026-04-21T10:00:00.000Z",
    ]);

    const result = await withRepairableFinalFormulaSpec(
      ({ refreshSeguimientosResultSummary: refreshWithRepairableSpec }) =>
        refreshWithRepairableSpec({
          caseId: "sheet-1",
          supabase: createSupabase({
            nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
          }) as never,
          userId: USER_ID,
        })
    );

    expect(result).toEqual({
      status: "written_needs_reload",
      caseId: "sheet-1",
      message:
        "El consolidado se reparo en Google Sheets. Recarga Seguimientos antes de continuar.",
    });
  });

  it("cleans legacy direct-write formulas from existing bundles during hydration", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'${BASE_SHEET_NAME}'!A16`]: [["#REF!"]],
        [`'${BASE_SHEET_NAME}'!B23:B27`]: [["Atender llamadas"], [""], [""], [""], [""]],
        [`'${FINAL_SHEET_NAME}'!D11`]: [["Colsubsidio"]],
        [`'${FINAL_SHEET_NAME}'!Q12`]: [["Marta Ruiz"]],
        [`'${FINAL_SHEET_NAME}'!N18`]: [["2026-04-21"]],
      },
      formulaValueRanges: {
        [`'${BASE_SHEET_NAME}'!A16`]: [["=('1. PRESENTACION'!A1)"]],
        [`'${FINAL_SHEET_NAME}'!D7`]: [["=('BASE'!D9)"]],
        [`'${FINAL_SHEET_NAME}'!L20`]: [["=('BASE'!B23)"]],
      },
    });

    const result = await bootstrapSeguimientosCase({
      cedula: "1001234567",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    expect(result.hydration.summary.formulaIntegrity).toBe("healthy");
    expect(result.hydration.summary.lastRepairedAt).toBeNull();
    expect(mocks.batchWriteCells).toHaveBeenCalledWith(
      "sheet-1",
      expect.arrayContaining([
        expect.objectContaining({
          range: `'${BASE_SHEET_NAME}'!A16`,
          value: "Ana Perez",
        }),
        expect.objectContaining({
          range: `'${FINAL_SHEET_NAME}'!D7`,
          value: "Empresa Uno SAS",
        }),
        expect.objectContaining({
          range: `'${FINAL_SHEET_NAME}'!L20`,
          value: "Atender llamadas",
        }),
      ])
    );
  });

  it("exports only the selected sheets through a temporary spreadsheet copy", async () => {
    const formulaSpec = buildSeguimientosFinalFormulaSpec();
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const baseValues = buildCompletedBaseValues(empresa);

    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'SEGUIMIENTO PROCESO IL 1'!X8`]: [["2026-04-21"]],
      },
      formulaValueRanges: Object.fromEntries(
        formulaSpec.formulaCells.map((formulaCell) => [
          `'${FINAL_SHEET_NAME}'!${formulaCell.cell}`,
          [[formulaCell.formula]],
        ])
      ),
    });

    await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues,
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    const followup1 = buildCompletedFollowupValues(1);

    await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues,
      followupValuesByIndex: {
        1: followup1,
      },
      dirtyStageIds: ["followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    const result = await exportSeguimientosPdf({
      caseId: "sheet-1",
      optionId: "base_plus_followup_1_plus_final",
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    expect(mocks.copyTemplate).toHaveBeenCalledWith(
      "sheet-1",
      expect.stringContaining("export temporal"),
      "case-folder"
    );
    expect(mocks.keepOnlySheetsVisible).toHaveBeenCalledWith(
      expect.stringMatching(/^temp-sheet-/),
      [BASE_SHEET_NAME, "SEGUIMIENTO PROCESO IL 1", FINAL_SHEET_NAME]
    );
    expect(mocks.exportSheetToPdf).toHaveBeenCalledWith(
      expect.stringMatching(/^temp-sheet-/)
    );
    expect(mocks.uploadPdf).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining("Seguimiento 1 - Consolidado"),
      "pdf-company-folder"
    );
    expect(mocks.trashDriveFile).toHaveBeenCalledWith(
      expect.stringMatching(/^temp-sheet-/)
    );
    expect(result.links.pdfLink).toBe("https://drive.google.com/file/d/pdf-1/view");
  });

  it("does not write to the original spreadsheet when exporting a PDF without final summary", async () => {
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const baseValues = buildCompletedBaseValues(empresa);

    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'SEGUIMIENTO PROCESO IL 1'!X8`]: [["2026-04-21"]],
      },
    });

    await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues,
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });
    await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues,
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    mocks.batchWriteCells.mockClear();
    const result = await exportSeguimientosPdf({
      caseId: "sheet-1",
      optionId: "base_plus_followup_1",
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(result.status).toBe("ready");
    expect(mocks.batchWriteCells).not.toHaveBeenCalledWith(
      "sheet-1",
      expect.anything()
    );
  });

  it("returns written_needs_reload when final-summary PDF export repairs formulas without fresh modifiedTime", async () => {
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const baseValues = buildCompletedBaseValues(empresa);
    const harness = createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'SEGUIMIENTO PROCESO IL 1'!X8`]: [["2026-04-21"]],
      },
      formulaValueRanges: {
        [`'${FINAL_SHEET_NAME}'!${REPAIRABLE_FINAL_FORMULA_CELL.cell}`]: [
          ["=BROKEN_FORMULA()"],
        ],
      },
    });

    await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues,
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });
    await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues,
      followupValuesByIndex: {
        1: buildCompletedFollowupValues(1),
      },
      dirtyStageIds: ["followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    mockPostWriteSpreadsheetModifiedTimeSequence(harness, [
      "2026-04-21T10:05:00.000Z",
      "2026-04-21T10:05:00.000Z",
      "2026-04-21T10:05:00.000Z",
      "2026-04-21T10:05:00.000Z",
    ]);

    const result = await withRepairableFinalFormulaSpec(
      ({ exportSeguimientosPdf: exportWithRepairableSpec }) =>
        exportWithRepairableSpec({
          caseId: "sheet-1",
          optionId: "base_plus_followup_1_plus_final",
          supabase: createSupabase({
            nitResults: [empresa],
          }) as never,
          userId: USER_ID,
        })
    );

    expect(result).toEqual({
      status: "written_needs_reload",
      caseId: "sheet-1",
      message:
        "El consolidado se reparo en Google Sheets. Recarga Seguimientos antes de continuar.",
    });
    expect(mocks.copyTemplate).not.toHaveBeenCalledWith(
      "sheet-1",
      expect.stringContaining("export temporal"),
      "case-folder"
    );
  });

  it("rejects base-only export while the ficha inicial persisted in Google is still incomplete", async () => {
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
    });

    const result = await exportSeguimientosPdf({
      caseId: "sheet-1",
      optionId: "base_only",
      supabase: createSupabase({
        nitResults: [createEmpresa({ caja_compensacion: "Colsubsidio" })],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "error",
      code: "invalid_pdf_option",
      message: "Ficha inicial aun no esta lista",
    });
  });

  it("rejects followup PDF export with actionable missing-field details", async () => {
    const empresa = createEmpresa({ caja_compensacion: "Colsubsidio" });
    const baseValues = buildCompletedBaseValues(empresa);
    createDriveHarness({
      existingFolder: true,
      existingSpreadsheet: true,
      existingSpreadsheetAppProperties: createCaseAppProperties(),
      batchValueRanges: {
        [`'SEGUIMIENTO PROCESO IL 1'!X8`]: [["2026-04-21"]],
      },
    });

    await saveSeguimientosBaseStage({
      caseId: "sheet-1",
      baseValues,
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    const followup1 = buildCompletedFollowupValues(1);
    followup1.modalidad = "";
    followup1.fecha_seguimiento = "";

    await saveSeguimientosDirtyStages({
      caseId: "sheet-1",
      companyType: "no_compensar",
      activeStageId: "followup_1",
      baseValues,
      followupValuesByIndex: {
        1: followup1,
      },
      dirtyStageIds: ["followup_1"],
      overrideGrants: [],
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    mocks.copyTemplate.mockClear();
    mocks.exportSheetToPdf.mockClear();
    mocks.uploadPdf.mockClear();

    const result = await exportSeguimientosPdf({
      caseId: "sheet-1",
      optionId: "base_plus_followup_1",
      supabase: createSupabase({
        nitResults: [empresa],
      }) as never,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: "error",
      code: "invalid_pdf_option",
      message:
        "Falta completar: modalidad, fecha de seguimiento. Vuelve al editor para completar antes de exportar.",
    });
    expect(mocks.copyTemplate).not.toHaveBeenCalled();
    expect(mocks.exportSheetToPdf).not.toHaveBeenCalled();
    expect(mocks.uploadPdf).not.toHaveBeenCalled();
  });
});
