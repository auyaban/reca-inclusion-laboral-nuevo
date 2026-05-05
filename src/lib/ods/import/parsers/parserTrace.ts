export type ParserTrace = {
  file_type: "pdf" | "excel" | "google_sheet" | "google_drive_file";
  participants_extracted_by:
    | "groupal_oferente_chunks"
    | "block_pattern"
    | "inline_pattern"
    | "contract_pattern"
    | "line_pattern"
    | "participant_table"
    | "follow_up_pattern"
    | null;
  patterns_attempted: string[];
  patterns_failed: { name: string; reason: string }[];
};

export function createParserTrace(fileType: ParserTrace["file_type"]): ParserTrace {
  return {
    file_type: fileType,
    participants_extracted_by: null,
    patterns_attempted: [],
    patterns_failed: [],
  };
}

export function recordPatternAttempt(trace: ParserTrace, name: string): void {
  trace.patterns_attempted.push(name);
}

export function recordPatternFailure(trace: ParserTrace, name: string, reason: string): void {
  trace.patterns_failed.push({ name, reason });
}

export function recordParticipantSource(trace: ParserTrace, source: ParserTrace["participants_extracted_by"]): void {
  trace.participants_extracted_by = source;
}
