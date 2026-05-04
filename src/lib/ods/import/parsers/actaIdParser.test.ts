import { describe, expect, it } from "vitest";
import {
  extractActaIdFromInput,
  extractActaIdFromText,
  extractGoogleArtifactReference,
} from "./actaIdParser";

describe("actaIdParser", () => {
  it.each([
    ["ABC12XYZ", "ABC12XYZ"],
    ["abc12xyz", "ABC12XYZ"],
    ["ACTA ID: ABC12XYZ", "ABC12XYZ"],
    ["https://reca.test/importar?acta_ref=ABC12XYZ", "ABC12XYZ"],
    ["https://reca.test/importar?actaRef=abc12xyz", "ABC12XYZ"],
    ["https://reca.test/importar?actaId=ABC12XYZ&foo=1", "ABC12XYZ"],
  ])("extractActaIdFromInput(%s) -> %s", (input, expected) => {
    expect(extractActaIdFromInput(input)).toBe(expected);
  });

  it("extractActaIdFromInput does not mine arbitrary URL path text", () => {
    expect(extractActaIdFromInput("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view")).toBe("");
  });

  it("extractActaIdFromText keeps PDF footer compatibility", () => {
    expect(extractActaIdFromText("Contenido\nACTA ID: abc12xyz")).toBe("ABC12XYZ");
  });

  it.each([
    [
      "https://drive.google.com/file/d/1DriveFileOpaqueId/view?usp=sharing",
      { kind: "google_drive_file", artifactId: "1DriveFileOpaqueId" },
    ],
    [
      "https://drive.google.com/open?id=1DriveOpenOpaqueId",
      { kind: "google_drive_file", artifactId: "1DriveOpenOpaqueId" },
    ],
    [
      "https://docs.google.com/spreadsheets/d/1SheetOpaqueId/edit#gid=0",
      { kind: "google_sheet", artifactId: "1SheetOpaqueId" },
    ],
  ])("extracts Google artifact reference from %s", (input, expected) => {
    expect(extractGoogleArtifactReference(input)).toMatchObject(expected);
  });
});
