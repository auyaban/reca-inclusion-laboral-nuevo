import { describe, it, expect } from "vitest";
import { createParserTrace, recordPatternAttempt, recordPatternFailure, recordParticipantSource } from "./parserTrace";

describe("ParserTrace", () => {
  it("creates trace with correct file type", () => {
    const trace = createParserTrace("pdf");
    expect(trace.file_type).toBe("pdf");
    expect(trace.participants_extracted_by).toBeNull();
    expect(trace.patterns_attempted).toEqual([]);
    expect(trace.patterns_failed).toEqual([]);
  });

  it("records pattern attempts", () => {
    const trace = createParserTrace("pdf");
    recordPatternAttempt(trace, "groupal_oferente_chunks");
    expect(trace.patterns_attempted).toContain("groupal_oferente_chunks");
  });

  it("records pattern failures", () => {
    const trace = createParserTrace("pdf");
    recordPatternFailure(trace, "inline_pattern", "No match found");
    expect(trace.patterns_failed).toEqual([{ name: "inline_pattern", reason: "No match found" }]);
  });

  it("records participant source", () => {
    const trace = createParserTrace("pdf");
    recordParticipantSource(trace, "groupal_oferente_chunks");
    expect(trace.participants_extracted_by).toBe("groupal_oferente_chunks");
  });
});
