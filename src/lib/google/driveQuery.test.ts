import { describe, expect, it } from "vitest";
import {
  escapeDriveQueryValue,
  requireDriveFileId,
  requireDriveWebViewLink,
} from "@/lib/google/driveQuery";

describe("escapeDriveQueryValue", () => {
  it("escapa comillas simples y backslashes para queries de Drive", () => {
    expect(escapeDriveQueryValue("O'Brien \\ Carpeta")).toBe(
      "O\\'Brien \\\\ Carpeta"
    );
  });
});

describe("requireDriveFileId", () => {
  it("lanza un error explicito cuando falta el id", () => {
    expect(() => requireDriveFileId(undefined, "listar carpeta existente")).toThrow(
      'Google Drive no devolvió "id" al listar carpeta existente.'
    );
  });

  it("valida tambien links obligatorios", () => {
    expect(() =>
      requireDriveWebViewLink("", "subir PDF final")
    ).toThrow('Google Drive no devolvió "webViewLink" al subir PDF final.');
  });
});
