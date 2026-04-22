import type { SeguimientosErrorCode } from "@/lib/seguimientosRuntime";

export function getSeguimientosErrorStatusCode(
  code: SeguimientosErrorCode
): number {
  switch (code) {
    case "case_access_denied":
      return 403;
    case "case_reclaim_required":
    case "bootstrap_in_progress":
      return 409;
    case "google_storage_quota_exceeded":
    case "override_unavailable":
      return 503;
    case "case_bootstrap_storage_failed":
      return 502;
    case "case_conflict":
      return 409;
    case "override_required":
    case "override_expired":
    case "base_stage_incomplete":
    case "invalid_pdf_option":
      return 400;
    default:
      return 400;
  }
}

export class SeguimientosServerError extends Error {
  code: SeguimientosErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    code: SeguimientosErrorCode,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SeguimientosServerError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isSeguimientosServerError(
  error: unknown
): error is SeguimientosServerError {
  return error instanceof SeguimientosServerError;
}

export function buildSeguimientosServerErrorPayload(
  error: unknown,
  fallbackMessage: string
) {
  if (isSeguimientosServerError(error)) {
    return {
      statusCode: error.statusCode,
      body: {
        status: "error" as const,
        code: error.code,
        message: error.message,
        ...(error.details ?? {}),
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      status: "error" as const,
      message: fallbackMessage,
    },
  };
}
