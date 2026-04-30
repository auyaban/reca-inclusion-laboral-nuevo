import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocks completos antes de importar el SUT
vi.mock("@/lib/google/auth", () => ({
  getSheetsClient: vi.fn(),
}));
vi.mock("@/lib/google/drive", () => ({
  findDriveFileByName: vi.fn(),
  copyDriveFile: vi.fn(),
}));

import { syncNewOdsRecord } from "./odsSheetSync";
import { getSheetsClient } from "@/lib/google/auth";
import { findDriveFileByName, copyDriveFile } from "@/lib/google/drive";

const mockGetSheetsClient = vi.mocked(getSheetsClient);
const mockFindFile = vi.mocked(findDriveFileByName);
const mockCopyFile = vi.mocked(copyDriveFile);

const VALID_HEADERS = [
  "ID", "PROFESIONAL", "NUEVO CÓDIGO", "EMPRESA", "NIT", "CCF", "FECHA",
  "OFERENTES", "CEDULA", "TIPO DE DISCAPACIDAD", "FECHA INGRESO", "OBSERVACIONES",
  "MODALIDAD", "CLAUSULADA", "GENERO", "TIPO DE CONTRATO", "ASESOR", "SEDE",
  "OBSERVACION AGENCIA", "SEGUIMIENTO", "CARGO", "PERSONAS", "TOTAL HORAS", "MES", "AÑO",
];

function buildSheetsMock(args: {
  inputSheetTitle?: string;
  headers?: unknown[];
  existingRows?: unknown[][];
  updateImpl?: (...args: unknown[]) => void;
}) {
  const updateMock = vi.fn().mockResolvedValue({ data: {} });
  if (args.updateImpl) updateMock.mockImplementation(args.updateImpl as never);
  const sheetsApi = {
    spreadsheets: {
      get: vi.fn().mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: args.inputSheetTitle ?? "ODS_INPUT" } },
            { properties: { title: "ODS_CALCULADA" } },
          ],
        },
      }),
      values: {
        get: vi.fn().mockImplementation(async (params: { range?: string }) => {
          const range = params.range ?? "";
          if (range.includes("!1:1")) {
            return { data: { values: [args.headers ?? VALID_HEADERS] } };
          }
          return { data: { values: args.existingRows ?? [] } };
        }),
        update: updateMock,
        clear: vi.fn().mockResolvedValue({ data: {} }),
      },
    },
  };
  return { sheetsApi, updateMock };
}

const VALID_ENV = {
  GOOGLE_DRIVE_SHARED_FOLDER_ID: "0AObDKzLYf4dYUk9PVA",
  GOOGLE_DRIVE_TEMPLATE_SPREADSHEET_NAME: "ODS_FEB_2026",
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(process.env, VALID_ENV);
});

describe("syncNewOdsRecord", () => {
  it("disabled cuando faltan env vars", async () => {
    delete process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
    const out = await syncNewOdsRecord({ id: "1", mes_servicio: 4, ano_servicio: 2026 });
    expect(out.sync_status).toBe("disabled");
    expect(out.spreadsheet_id).toBeNull();
  });

  it("warning cuando falta id de la ODS", async () => {
    const out = await syncNewOdsRecord({ id: "", mes_servicio: 4, ano_servicio: 2026 });
    expect(out.sync_status).toBe("warning");
    expect(out.sync_target).toBe("ODS_APR_2026");
    expect(out.sync_error).toContain("id");
  });

  it("warning cuando mes/año son inválidos", async () => {
    const out = await syncNewOdsRecord({ id: "1", mes_servicio: 13, ano_servicio: 2026 });
    expect(out.sync_status).toBe("warning");
    expect(out.sync_target).toBeNull();
  });

  it("ok escribe fila cuando spreadsheet ya existe (caso comun)", async () => {
    const { sheetsApi, updateMock } = buildSheetsMock({});
    mockGetSheetsClient.mockReturnValue(sheetsApi as never);
    // findFile retorna la hoja del mes (existe)
    mockFindFile.mockResolvedValue({ id: "spread-apr", name: "ODS_APR_2026" });

    const out = await syncNewOdsRecord({
      id: "uuid-1",
      mes_servicio: 4,
      ano_servicio: 2026,
      nombre_profesional: "Andres",
      codigo_servicio: "86",
      total_personas: 2,
      orden_clausulada: false,
    });

    expect(out.sync_status).toBe("ok");
    expect(out.sync_target).toBe("ODS_APR_2026");
    expect(out.spreadsheet_id).toBe("spread-apr");
    // No copia template porque la hoja ya existe
    expect(mockCopyFile).not.toHaveBeenCalled();
    // Escribió 1 fila con 25 valores
    expect(updateMock).toHaveBeenCalledOnce();
    const updateCall = updateMock.mock.calls[0][0] as {
      requestBody: { values: unknown[][] };
      range: string;
    };
    expect(updateCall.requestBody.values[0]).toHaveLength(25);
    expect(updateCall.requestBody.values[0][0]).toBe("uuid-1");
    expect(updateCall.range).toContain("A2:Y2"); // primera fila vacía
  });

  it("idempotente: si el id ya existe en columna A, no escribe", async () => {
    const { sheetsApi, updateMock } = buildSheetsMock({
      existingRows: [
        ["uuid-existing", "X", "1", "Empresa A"],
        ["uuid-1", "Y", "2", "Empresa B"], // ya está
      ],
    });
    mockGetSheetsClient.mockReturnValue(sheetsApi as never);
    mockFindFile.mockResolvedValue({ id: "spread-apr", name: "ODS_APR_2026" });

    const out = await syncNewOdsRecord({
      id: "uuid-1",
      mes_servicio: 4,
      ano_servicio: 2026,
      total_personas: 0,
      orden_clausulada: false,
    });

    expect(out.sync_status).toBe("ok");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("copia plantilla cuando el spreadsheet del mes no existe", async () => {
    const { sheetsApi, updateMock } = buildSheetsMock({});
    mockGetSheetsClient.mockReturnValue(sheetsApi as never);
    // 1ra llamada: ODS_APR_2026 no existe; 2da: la plantilla ODS_FEB_2026 sí
    mockFindFile
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "template-feb", name: "ODS_FEB_2026" });
    mockCopyFile.mockResolvedValue({ id: "spread-apr-new", name: "ODS_APR_2026" });

    const out = await syncNewOdsRecord({
      id: "uuid-1",
      mes_servicio: 4,
      ano_servicio: 2026,
      total_personas: 0,
      orden_clausulada: false,
    });

    expect(out.sync_status).toBe("ok");
    expect(out.spreadsheet_id).toBe("spread-apr-new");
    expect(mockCopyFile).toHaveBeenCalledOnce();
    expect(mockCopyFile).toHaveBeenCalledWith({
      sourceFileId: "template-feb",
      newName: "ODS_APR_2026",
      parentFolderId: "0AObDKzLYf4dYUk9PVA",
    });
    // Tras copiar, limpia data heredada del template antes de escribir
    expect(sheetsApi.spreadsheets.values.clear).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledOnce();
  });

  it("warning si el spreadsheet del mes no existe Y la plantilla tampoco", async () => {
    const { sheetsApi } = buildSheetsMock({});
    mockGetSheetsClient.mockReturnValue(sheetsApi as never);
    mockFindFile.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const out = await syncNewOdsRecord({
      id: "uuid-1",
      mes_servicio: 4,
      ano_servicio: 2026,
    });

    expect(out.sync_status).toBe("warning");
    expect(out.sync_error).toContain("plantilla");
  });

  it("warning si los headers de la pestaña ODS_INPUT no coinciden", async () => {
    const { sheetsApi } = buildSheetsMock({
      headers: ["ID", "TOTALMENTE", "DIFERENTE"],
    });
    mockGetSheetsClient.mockReturnValue(sheetsApi as never);
    mockFindFile.mockResolvedValue({ id: "spread-apr", name: "ODS_APR_2026" });

    const out = await syncNewOdsRecord({
      id: "uuid-1",
      mes_servicio: 4,
      ano_servicio: 2026,
    });

    expect(out.sync_status).toBe("warning");
    expect(out.sync_error).toContain("Encabezados");
  });

  it("warning con mensaje retryable al recibir HTTP 503 de Google", async () => {
    const { sheetsApi } = buildSheetsMock({});
    sheetsApi.spreadsheets.values.update = vi.fn().mockRejectedValue(
      Object.assign(new Error("backend error"), { code: 503 })
    );
    mockGetSheetsClient.mockReturnValue(sheetsApi as never);
    mockFindFile.mockResolvedValue({ id: "spread-apr", name: "ODS_APR_2026" });

    const out = await syncNewOdsRecord({
      id: "uuid-1",
      mes_servicio: 4,
      ano_servicio: 2026,
      total_personas: 0,
      orden_clausulada: false,
    });

    expect(out.sync_status).toBe("warning");
    expect(out.sync_error).toMatch(/temporalmente no disponible/);
  });

  it("acepta alias 'input' (lowercase) como pestaña", async () => {
    const { sheetsApi } = buildSheetsMock({ inputSheetTitle: "input" });
    mockGetSheetsClient.mockReturnValue(sheetsApi as never);
    mockFindFile.mockResolvedValue({ id: "spread-apr", name: "ODS_APR_2026" });

    const out = await syncNewOdsRecord({
      id: "uuid-1",
      mes_servicio: 4,
      ano_servicio: 2026,
      total_personas: 0,
      orden_clausulada: false,
    });

    expect(out.sync_status).toBe("ok");
  });
});
