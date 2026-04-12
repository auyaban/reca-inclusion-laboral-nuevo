import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const listMock = vi.fn();

vi.mock("@/lib/google/auth", () => ({
  getDriveClient: () => ({
    files: {
      create: createMock,
      list: listMock,
    },
  }),
}));

import {
  buildRawPayloadFileName,
  getOrCreateFolder,
  uploadJsonArtifact,
} from "@/lib/google/drive";

beforeEach(() => {
  createMock.mockReset();
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
    ).rejects.toThrow('Google Drive no devolvió "id" al subir JSON "artifact.json".');
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
      })
    );
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
