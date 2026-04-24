export const FINALIZATION_PROCESSING_TTL_MS = 360_000;

function incrementCounter(counter, key) {
  counter[key] = (counter[key] ?? 0) + 1;
}

export function buildStaleThresholdIso(
  now = Date.now(),
  olderThanMs = FINALIZATION_PROCESSING_TTL_MS
) {
  const nowMs = now instanceof Date ? now.getTime() : now;
  return new Date(nowMs - olderThanMs).toISOString();
}

export function classifyStaleArtifactStateFromRawExternalArtifacts(
  externalArtifacts
) {
  if (!externalArtifacts || typeof externalArtifacts !== "object") {
    return "none";
  }

  const hasSpreadsheetIdentity =
    typeof externalArtifacts.sheetLink === "string" &&
    externalArtifacts.sheetLink.trim().length > 0 &&
    typeof externalArtifacts.spreadsheetId === "string" &&
    externalArtifacts.spreadsheetId.trim().length > 0 &&
    typeof externalArtifacts.companyFolderId === "string" &&
    externalArtifacts.companyFolderId.trim().length > 0 &&
    typeof externalArtifacts.activeSheetName === "string" &&
    externalArtifacts.activeSheetName.trim().length > 0;

  if (!hasSpreadsheetIdentity) {
    return "none";
  }

  if (
    typeof externalArtifacts.pdfLink === "string" &&
    externalArtifacts.pdfLink.trim().length > 0
  ) {
    return "pdf_ready";
  }

  return "spreadsheet_only";
}

export function buildStaleFinalizationReport(rows, options = {}) {
  const nowMs =
    options.now instanceof Date
      ? options.now.getTime()
      : typeof options.now === "number"
        ? options.now
        : Date.now();
  const ttlMs = options.ttlMs ?? FINALIZATION_PROCESSING_TTL_MS;
  const thresholdIso = buildStaleThresholdIso(nowMs, ttlMs);
  const byFormSlug = {};
  const byStage = {};
  const byExternalStage = {};
  const byArtifactState = {
    none: 0,
    spreadsheet_only: 0,
    pdf_ready: 0,
  };

  const reportRows = rows.map((row) => {
    const artifactState = classifyStaleArtifactStateFromRawExternalArtifacts(
      row.external_artifacts
    );
    incrementCounter(byFormSlug, row.form_slug);
    incrementCounter(byStage, row.stage);
    incrementCounter(byExternalStage, row.external_stage ?? "none");
    byArtifactState[artifactState] += 1;

    return {
      idempotencyKey: row.idempotency_key,
      formSlug: row.form_slug,
      userId: row.user_id,
      stage: row.stage,
      externalStage: row.external_stage,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      ageMs: Math.max(nowMs - Date.parse(row.updated_at), 0),
      artifactState,
      hasExternalArtifacts: row.external_artifacts !== null,
    };
  });

  return {
    generatedAt: new Date(nowMs).toISOString(),
    ttlMs,
    thresholdIso,
    staleCount: reportRows.length,
    byFormSlug,
    byStage,
    byExternalStage,
    byArtifactState,
    rows: reportRows,
  };
}
