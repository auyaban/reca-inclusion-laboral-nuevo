import { describe, it, expect } from "vitest";
import { extractPdfFollowUpNumber, extractNameFromFollowUpFilename, extractFollowUpParticipantFromFilename } from "./followUpPdfParser";

describe("extractPdfFollowUpNumber", () => {
  it("extracts follow-up number", () => {
    const text = "Seguimiento 1: 15/01/2026\nSeguimiento 2: 15/02/2026\nSeguimiento 3: 15/03/2026";
    expect(extractPdfFollowUpNumber(text)).toBe("3");
  });

  it("returns empty when no follow-up dates", () => {
    expect(extractPdfFollowUpNumber("No seguimiento info")).toBe("");
  });
});

describe("extractNameFromFollowUpFilename", () => {
  it("extracts name from follow-up filename", () => {
    const stem = "Seguimiento al Proceso de Inclusion Laboral - Juan Perez - 15_mar_2026";
    expect(extractNameFromFollowUpFilename(stem)).toBe("Juan Perez");
  });

  it("returns empty for non-matching stem", () => {
    expect(extractNameFromFollowUpFilename("random_file")).toBe("");
  });
});

describe("extractFollowUpParticipantFromFilename", () => {
  it("returns empty when not follow-up document", () => {
    const participants = extractFollowUpParticipantFromFilename("random content", "/path/file.pdf");
    expect(participants).toEqual([]);
  });

  it("returns empty when no cedula_phone pattern", () => {
    const text = "seguimiento al proceso de inclusion laboral\nsome content without 17+ digits";
    const participants = extractFollowUpParticipantFromFilename(text, "/path/file.pdf");
    expect(participants).toEqual([]);
  });
});
