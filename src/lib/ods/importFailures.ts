export type ImportFailureErrorKind = "network" | "permission" | "parser" | "unknown";
export type ImportFailureOrigin = "pdf" | "excel" | "acta_id_directo";
export type ImportFailureFileType = "pdf" | "excel";
export type ImportFailureArtifactKind = "google_drive" | "google_sheet";

export type ImportFailureInputSummary = {
  origin: ImportFailureOrigin;
  file_type?: ImportFailureFileType;
  has_file?: boolean;
  has_direct_input?: boolean;
  input_length?: number;
  acta_ref_length?: number;
  has_artifact?: boolean;
  artifact_kind?: ImportFailureArtifactKind;
};

type BuildImportFailureInputSummaryOptions = {
  fileType?: ImportFailureFileType;
  hasFile?: boolean;
  actaIdOrUrl?: string | null;
  actaRef?: string | null;
  hasArtifact?: boolean;
  artifactKind?: ImportFailureArtifactKind | string | null;
};

export type OdsImportFailureRecordClient = {
  rpc: (
    functionName: "ods_record_import_failure",
    args: {
      p_stage: string;
      p_error_message: string | null;
      p_error_kind: ImportFailureErrorKind;
      p_input_summary: ImportFailureInputSummary;
      p_user_id: string | null;
    }
  ) => PromiseLike<{ data: { id: string; created_at: string } | null; error: unknown }>;
};

export type RecordOdsImportFailureInput = {
  admin: OdsImportFailureRecordClient;
  actorUserId: string | null;
  stage: string;
  error: unknown;
  inputSummary: ImportFailureInputSummary;
};

export type RecordOdsImportFailureResult =
  | { status: "recorded"; id: string; created_at: string }
  | { status: "skipped"; reason: "rpc_failed" };

const MAX_ERROR_MESSAGE_LENGTH = 500;
const ALLOWED_SUMMARY_KEYS = new Set([
  "origin",
  "file_type",
  "has_file",
  "has_direct_input",
  "input_length",
  "acta_ref_length",
  "has_artifact",
  "artifact_kind",
]);
const VALID_ORIGINS = new Set<ImportFailureOrigin>(["pdf", "excel", "acta_id_directo"]);
const VALID_FILE_TYPES = new Set<ImportFailureFileType>(["pdf", "excel"]);
const VALID_ARTIFACT_KINDS = new Set<ImportFailureArtifactKind>(["google_drive", "google_sheet"]);

function errorToString(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || error);
  }
  return String(error);
}

export function sanitizeImportFailureMessage(error: unknown) {
  return errorToString(error)
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b\d{7,}\b/g, "[number]")
    .slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

export function classifyImportFailureKind(error: unknown): ImportFailureErrorKind {
  const message = errorToString(error).toLowerCase();
  const code = String((error as { code?: unknown } | null)?.code || "").toLowerCase();

  if (/\b(42501|permission denied|rls|unauthorized|jwt)\b/.test(`${code} ${message}`)) {
    return "permission";
  }
  if (/(fetch failed|econn|etimedout|enotfound|aborterror|network)/.test(message)) {
    return "network";
  }
  if (/(parser?|parse|pdf|unexpected token)/.test(message)) {
    return "parser";
  }
  return "unknown";
}

function normalizeArtifactKind(value: string | null | undefined): ImportFailureArtifactKind | undefined {
  if (value === "google_drive_file") return "google_drive";
  return VALID_ARTIFACT_KINDS.has(value as ImportFailureArtifactKind)
    ? (value as ImportFailureArtifactKind)
    : undefined;
}

export function buildImportFailureInputSummary({
  fileType,
  hasFile = false,
  actaIdOrUrl,
  actaRef,
  hasArtifact,
  artifactKind,
}: BuildImportFailureInputSummaryOptions): ImportFailureInputSummary {
  const cleanInput = (actaIdOrUrl || "").trim();
  const cleanActaRef = (actaRef || "").trim();
  const origin: ImportFailureOrigin = fileType === "pdf"
    ? "pdf"
    : fileType === "excel"
      ? "excel"
      : "acta_id_directo";

  return validateImportFailureInputSummary({
    origin,
    ...(fileType ? { file_type: fileType } : {}),
    has_file: hasFile,
    has_direct_input: cleanInput.length > 0,
    ...(cleanInput ? { input_length: cleanInput.length } : {}),
    ...(cleanActaRef ? { acta_ref_length: cleanActaRef.length } : {}),
    ...(typeof hasArtifact === "boolean" ? { has_artifact: hasArtifact } : {}),
    ...(normalizeArtifactKind(artifactKind) ? { artifact_kind: normalizeArtifactKind(artifactKind) } : {}),
  });
}

export function validateImportFailureInputSummary(
  summary: Record<string, unknown>
): ImportFailureInputSummary {
  for (const key of Object.keys(summary)) {
    if (!ALLOWED_SUMMARY_KEYS.has(key)) {
      throw new Error(`Campo no permitido en input_summary: ${key}`);
    }
  }

  if (!VALID_ORIGINS.has(summary.origin as ImportFailureOrigin)) {
    throw new Error("origin invalido en input_summary");
  }
  if (summary.file_type != null && !VALID_FILE_TYPES.has(summary.file_type as ImportFailureFileType)) {
    throw new Error("file_type invalido en input_summary");
  }
  if (summary.artifact_kind != null && !VALID_ARTIFACT_KINDS.has(summary.artifact_kind as ImportFailureArtifactKind)) {
    throw new Error("artifact_kind invalido en input_summary");
  }

  return summary as ImportFailureInputSummary;
}

export async function recordOdsImportFailure({
  admin,
  actorUserId,
  stage,
  error,
  inputSummary,
}: RecordOdsImportFailureInput): Promise<RecordOdsImportFailureResult> {
  try {
    const { data, error: rpcError } = await admin.rpc("ods_record_import_failure", {
      p_stage: stage,
      p_error_message: sanitizeImportFailureMessage(error),
      p_error_kind: classifyImportFailureKind(error),
      p_input_summary: validateImportFailureInputSummary(inputSummary),
      p_user_id: actorUserId,
    });

    if (rpcError || !data?.id || !data.created_at) {
      console.warn("[ods/import-failure] rpc_failed");
      return { status: "skipped", reason: "rpc_failed" };
    }

    return { status: "recorded", id: data.id, created_at: data.created_at };
  } catch {
    console.warn("[ods/import-failure] rpc_failed");
    return { status: "skipped", reason: "rpc_failed" };
  }
}
