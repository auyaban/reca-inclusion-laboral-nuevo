import { z } from "zod";

export const PARSE_ERROR_CODES = [
  "FILE_NOT_FOUND",
  "INVALID_FORMAT",
  "OCR_FAILED",
  "EXTRACTION_ERROR",
  "VALIDATION_ERROR",
  "ENCODING_ERROR",
  "TIMEOUT",
  "UNKNOWN",
] as const;

export const parseErrorCodeSchema = z.enum(PARSE_ERROR_CODES);
export type ParseErrorCode = (typeof PARSE_ERROR_CODES)[number];

export type ParseError = {
  code: ParseErrorCode;
  message: string;
  detail?: string;
  recoverable: boolean;
};

export function createParseError(options: {
  code: ParseErrorCode;
  message: string;
  detail?: string;
  recoverable?: boolean;
}): ParseError {
  return {
    code: options.code,
    message: options.message,
    detail: options.detail,
    recoverable: options.recoverable ?? false,
  };
}

export function isRecoverableError(error: ParseError): boolean {
  return error.recoverable;
}

export function errorSummary(errors: ParseError[]): string {
  if (errors.length === 0) return "Sin errores";
  if (errors.length === 1) return errors[0].message;
  return `${errors.length} errores: ${errors.map((e) => e.code).join(", ")}`;
}
