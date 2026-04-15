import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const exportMock = vi.fn();
const listMock = vi.fn();

vi.mock("@/lib/google/auth", () => ({
  getDriveClient: () => ({
    files: {
      create: createMock,
      export: exportMock,
      list: listMock,
    },
  }),
}));

import {
  buildRawPayloadFileName,
  exportSheetToPdf,
  getOrCreateFolder,
  sanitizeFileName,
  uploadJsonArtifact,
  uploadPdf,
} from "@/lib/google/drive";

beforeEach(() => {
  createMock.mockReset();
  exportMock.mockReset();
  listMock.mockReset();
});

describe("buildRawPayloadFileName", () => {
  it("usa fecha Bogota, form_id y registro_id", () => {
    expect(
      buildRawPayloadFileName(
        "2026-04-11T15:00:00.000Z",
        "presentacion_programa",
        "1234-uuid"
      )
    ).toBe("2026-04-11_10-00-00_presentacion_programa_1234-uuid.json");
  });
});

describe("exportSheetToPdf", () => {
  it("exporta el spreadsheet como application/pdf y devuelve un Buffer", async () => {
    exportMock.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3, 4]).buffer,
    });

    const result = await exportSheetToPdf("spreadsheet-123");

    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3, 4]);
    expect(exportMock).toHaveBeenCalledWith(
      {
        fileId: "spreadsheet-123",
        mimeType: "application/pdf",
      },
      { responseType: "arraybuffer" }
    );
  });
});

describe("uploadPdf", () => {
  it("sube el PDF con mime type application/pdf y soportaAllDrives", async () => {
    createMock.mockResolvedValueOnce({
      data: {
        id: "drive-pdf-id",
        webViewLink: "https://drive.example/pdf",
      },
    });

    const result = await uploadPdf(
      Buffer.from("pdf-data"),
      "acta.pdf",
      "folder-456"
    );

    expect(result).toEqual({
      fileId: "drive-pdf-id",
      webViewLink: "https://drive.example/pdf",
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          name: "acta.pdf",
          mimeType: "application/pdf",
          parents: ["folder-456"],
        },
        media: expect.objectContaining({
          mimeType: "application/pdf",
          body: expect.anything(),
        }),
        fields: "id,webViewLink",
        supportsAllDrives: true,
      })
    );
  });

  it("lanza un error explicito si Drive no devuelve id o webViewLink del PDF", async () => {
    createMock.mockResolvedValueOnce({
      data: {
        id: "drive-pdf-id",
        webViewLink: undefined,
      },
    });

    await expect(
      uploadPdf(Buffer.from("pdf-data"), "acta.pdf", "folder-456")
    ).rejects.toThrow(
      'Google Drive no devolvió "webViewLink" al subir PDF "acta.pdf".'
    );
  });
});

describe("uploadJsonArtifact", () => {
  it("sube un JSON arbitrario a Drive con mime type application/json", async () => {
    createMock.mockResolvedValueOnce({
      data: {
        id: "drive-json-id",
        webViewLink: "https://drive.example/json",
      },
    });

    const result = await uploadJsonArtifact(
      { ejemplo: true },
      "artifact.json",
      "folder-123"
    );

    expect(result).toEqual({
      fileId: "drive-json-id",
      webViewLink: "https://drive.example/json",
    });

    expect(createMock).toHaveBeenCalledOnce();
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          name: "artifact.json",
          mimeType: "application/json",
          parents: ["folder-123"],
        },
        media: expect.objectContaining({
          mimeType: "application/json",
        }),
        fields: "id,webViewLink",
        supportsAllDrives: true,
      })
    );
  });

  it("lanza un error explicito si Drive no devuelve id o webViewLink", async () => {
    createMock.mockResolvedValueOnce({
      data: {
        id: undefined,
        webViewLink: undefined,
      },
    });

    await expect(
      uploadJsonArtifact({ ejemplo: true }, "artifact.json", "folder-123")
    ).rejects.toThrow(
      'Google Drive no devolvió "id" al subir JSON "artifact.json".'
    );
  });
});

describe("getOrCreateFolder", () => {
  it("escapa nombres con comilla simple en la query de Drive", async () => {
    listMock.mockResolvedValueOnce({
      data: {
        files: [
          {
            id: "folder-123",
            name: "O'Brien Carpeta",
          },
        ],
      },
    });

    const folderId = await getOrCreateFolder("parent-1", "O'Brien Carpeta");

    expect(folderId).toBe("folder-123");
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({
        q: expect.stringContaining("name = 'O\\'Brien Carpeta'"),
        fields: "files(id,name,createdTime)",
        orderBy: "createdTime asc,name_natural asc",
      })
    );
  });

  it("crea la carpeta cuando no existe en Drive y converge en la carpeta canonica", async () => {
    listMock.mockResolvedValueOnce({
      data: {
        files: [],
      },
    });
    listMock.mockResolvedValueOnce({
      data: {
        files: [
          {
            id: "folder-created",
            name: "Nueva Carpeta",
            createdTime: "2026-04-13T20:00:00.000Z",
          },
        ],
      },
    });
    createMock.mockResolvedValueOnce({
      data: {
        id: "folder-created",
        createdTime: "2026-04-13T20:00:00.000Z",
      },
    });

    const folderId = await getOrCreateFolder("parent-1", "Nueva Carpeta");

    expect(folderId).toBe("folder-created");
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          name: "Nueva Carpeta",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["parent-1"],
        },
        fields: "id,createdTime",
        supportsAllDrives: true,
      })
    );
  });

  it("elige la carpeta mas antigua cuando una peticion concurrente crea un duplicado", async () => {
    listMock.mockResolvedValueOnce({
      data: {
        files: [],
      },
    });
    createMock.mockResolvedValueOnce({
      data: {
        id: "folder-created-second",
        createdTime: "2026-04-13T20:00:01.000Z",
      },
    });
    listMock.mockResolvedValueOnce({
      data: {
        files: [
          {
            id: "folder-created-second",
            name: "Duplicada",
            createdTime: "2026-04-13T20:00:01.000Z",
          },
          {
            id: "folder-created-first",
            name: "Duplicada",
            createdTime: "2026-04-13T20:00:00.000Z",
          },
        ],
      },
    });

    const folderId = await getOrCreateFolder("parent-1", "Duplicada");

    expect(folderId).toBe("folder-created-first");
  });

  it("recupera la carpeta creada por otra peticion si el create falla", async () => {
    listMock.mockResolvedValueOnce({
      data: {
        files: [],
      },
    });
    createMock.mockRejectedValueOnce(new Error("create failed"));
    listMock.mockResolvedValueOnce({
      data: {
        files: [
          {
            id: "folder-concurrent",
            name: "Concurrente",
            createdTime: "2026-04-13T20:00:00.000Z",
          },
        ],
      },
    });

    const folderId = await getOrCreateFolder("parent-1", "Concurrente");

    expect(folderId).toBe("folder-concurrent");
  });

  it("lanza un error si la carpeta existente no trae id", async () => {
    listMock.mockResolvedValueOnce({
      data: {
        files: [
          {
            id: undefined,
            name: "Carpeta",
          },
        ],
      },
    });

    await expect(getOrCreateFolder("parent-1", "Carpeta")).rejects.toThrow(
      'Google Drive no devolvió "id" al buscar carpeta "Carpeta".'
    );
  });
});

describe("sanitizeFileName", () => {
  it("normaliza tildes, remueve caracteres inseguros y trunca a 100 caracteres", () => {
    const unsafeName = ` Presentación / Bogotá : Acta * ${"x".repeat(120)} `;
    const sanitized = sanitizeFileName(unsafeName);

    expect(sanitized).toMatch(/^Presentacion Bogota Acta x+$/);
    expect(sanitized).not.toContain("/");
    expect(sanitized).not.toContain(":");
    expect(sanitized).toHaveLength(100);
  });
});
