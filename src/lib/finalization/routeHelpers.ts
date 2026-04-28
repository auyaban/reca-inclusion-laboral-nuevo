import type { FinalizationProfiler } from "@/lib/finalization/profiler";
import {
  deriveEffectiveFinalizationMutation,
} from "@/lib/finalization/finalizationSpreadsheet";
import {
  hasReachedFinalizationExternalStage,
  markFinalizationExternalArtifactsFooterMarkerWritten,
  markFinalizationExternalArtifactsMutationApplied,
  markFinalizationExternalArtifactsStructureInsertionsApplied,
  markFinalizationExternalArtifactsTextReview,
  type FinalizationExternalArtifacts,
  type FinalizationExternalStage,
} from "@/lib/finalization/requests";
import {
  reviewFinalizationText,
  type TextReviewCacheArtifact,
  type TextReviewResult,
} from "@/lib/finalization/textReview";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import {
  applyFormSheetCellWrites,
  applyFormSheetStructureInsertions,
  buildFooterMutationMarkers,
  type FormSheetMutation,
  inspectFooterActaWrites,
  writeFooterActaMarker,
} from "@/lib/google/sheets";
import { withGoogleRetry } from "@/lib/finalization/googleRetry";
import { isRecord } from "@/lib/finalization/valueUtils";
import type { Empresa } from "@/lib/store/empresaStore";
import type { EmpresaPayload } from "@/lib/validations/finalization";

export interface FinalizationSection1Data {
  fecha_visita: string;
  modalidad: string;
  nombre_empresa: string;
  ciudad_empresa: string;
  direccion_empresa: string;
  nit_empresa: string;
  correo_1: string;
  telefono_empresa: string;
  contacto_empresa: string;
  cargo: string;
  caja_compensacion: string;
  sede_empresa: string;
  asesor: string;
  profesional_asignado: string;
  correo_profesional: string;
  correo_asesor: string;
}

type FinalizationCompanySource = {
  nombre_empresa: string;
  ciudad_empresa?: string | null;
  direccion_empresa?: string | null;
  correo_1?: string | null;
  telefono_empresa?: string | null;
  contacto_empresa?: string | null;
  cargo?: string | null;
  caja_compensacion?: string | null;
  sede_empresa?: string | null;
  zona_empresa?: string | null;
  asesor?: string | null;
  profesional_asignado?: string | null;
  correo_profesional?: string | null;
  correo_asesor?: string | null;
};

type FinalizationFormSection1Data = {
  fecha_visita: string;
  modalidad: string;
  nit_empresa: string;
};

export function buildSection1Data(
  empresa: FinalizationCompanySource,
  formData: FinalizationFormSection1Data
): FinalizationSection1Data {
  return {
    fecha_visita: formData.fecha_visita,
    modalidad: formData.modalidad,
    nombre_empresa: empresa.nombre_empresa,
    ciudad_empresa: empresa.ciudad_empresa ?? "",
    direccion_empresa: empresa.direccion_empresa ?? "",
    nit_empresa: formData.nit_empresa,
    correo_1: empresa.correo_1 ?? "",
    telefono_empresa: empresa.telefono_empresa ?? "",
    contacto_empresa: empresa.contacto_empresa ?? "",
    cargo: empresa.cargo ?? "",
    caja_compensacion: empresa.caja_compensacion ?? "",
    sede_empresa: getEmpresaSedeCompensarValue(empresa),
    asesor: empresa.asesor ?? "",
    profesional_asignado: empresa.profesional_asignado ?? "",
    correo_profesional: empresa.correo_profesional ?? "",
    correo_asesor: empresa.correo_asesor ?? "",
  };
}

export function toEmpresaRecord(empresa: EmpresaPayload): Empresa {
  return {
    id: empresa.id,
    nombre_empresa: empresa.nombre_empresa,
    nit_empresa: empresa.nit_empresa ?? null,
    direccion_empresa: empresa.direccion_empresa ?? null,
    ciudad_empresa: empresa.ciudad_empresa ?? null,
    sede_empresa: empresa.sede_empresa ?? null,
    zona_empresa: empresa.zona_empresa ?? null,
    correo_1: empresa.correo_1 ?? null,
    contacto_empresa: empresa.contacto_empresa ?? null,
    telefono_empresa: empresa.telefono_empresa ?? null,
    cargo: empresa.cargo ?? null,
    profesional_asignado: empresa.profesional_asignado ?? null,
    correo_profesional: empresa.correo_profesional ?? null,
    asesor: empresa.asesor ?? null,
    correo_asesor: empresa.correo_asesor ?? null,
    caja_compensacion: empresa.caja_compensacion ?? null,
  };
}

export function createGoogleStepRunner(options: {
  markStage: (stage: string) => Promise<void>;
  profiler: Pick<FinalizationProfiler, "mark">;
}) {
  // Usa retry con backoff para operaciones Google idempotentes.
  async function runGoogleStep<T>(
    stage: string,
    operation: () => Promise<T>,
    successLabel = stage
  ) {
    await options.markStage(stage);
    const result = await withGoogleRetry(operation, {
      onRetry(retryCount) {
        options.profiler.mark(`google.retry:${stage}:${retryCount}`);
      },
    });
    options.profiler.mark(successLabel);
    return result;
  }

  // Sin retry: para operaciones best-effort o no idempotentes.
  async function runGoogleStepWithoutRetry<T>(
    stage: string,
    operation: () => Promise<T>,
    successLabel = stage
  ) {
    await options.markStage(stage);
    const result = await operation();
    options.profiler.mark(successLabel);
    return result;
  }

  return {
    runGoogleStep,
    runGoogleStepWithoutRetry,
  };
}

export function createCachedFinalizationTextReview<TValue>(options: {
  formSlug: string;
  accessToken?: string | null;
  value: TValue;
  initialArtifacts?: FinalizationExternalArtifacts | Record<string, unknown> | null;
  profiler?: Pick<FinalizationProfiler, "mark">;
  source: string;
}) {
  let textReview: TextReviewResult<TValue> | null = null;
  const cacheArtifact = extractRouteTextReviewCacheArtifact(
    options.initialArtifacts
  );
  const textReviewPromise = reviewFinalizationText({
    formSlug: options.formSlug,
    accessToken: options.accessToken ?? "",
    value: options.value,
    cacheArtifact,
  });

  return async function resolveTextReview() {
    if (!textReview) {
      textReview = await textReviewPromise;
      if (textReview.cacheHit) {
        options.profiler?.mark("text_review.cache_hit");
      } else {
        options.profiler?.mark("text_review.cache_miss");
        options.profiler?.mark(`text_review.${textReview.status}`);
      }

      if (textReview.status === "failed") {
        console.warn(`[${options.source}] failed`, {
          reason: textReview.reason,
          cacheHit: textReview.cacheHit === true,
        });
      }
    }

    return textReview;
  };
}

function extractRouteTextReviewCacheArtifact(
  value: FinalizationExternalArtifacts | Record<string, unknown> | null | undefined
): TextReviewCacheArtifact | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate =
    "textReview" in value
      ? (value as Record<string, unknown>).textReview
      : value;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const artifact = candidate as TextReviewCacheArtifact;
  if (
    artifact.version !== 1 ||
    typeof artifact.formSlug !== "string" ||
    typeof artifact.inputHash !== "string" ||
    (typeof artifact.model !== "string" && artifact.model !== null) ||
    (artifact.transport !== "direct" && artifact.transport !== "edge") ||
    !["reviewed", "skipped", "failed"].includes(artifact.status) ||
    !Array.isArray(artifact.reviewedItems)
  ) {
    return null;
  }

  return artifact;
}

export async function persistTextReviewCacheForArtifacts<TValue>(options: {
  textReview: TextReviewResult<TValue>;
  artifacts: FinalizationExternalArtifacts;
  currentExternalStage: FinalizationExternalStage | null;
  persistArtifacts: (
    stage: FinalizationExternalStage,
    artifacts: FinalizationExternalArtifacts
  ) => Promise<void>;
  profiler?: Pick<FinalizationProfiler, "mark">;
  source: string;
}) {
  if (
    options.textReview.cacheHit ||
    !options.textReview.cacheArtifact ||
    options.artifacts.textReview?.inputHash ===
      options.textReview.cacheArtifact.inputHash ||
    hasReachedFinalizationExternalStage(
      options.currentExternalStage,
      "spreadsheet.apply_mutation_done"
    )
  ) {
    return options.artifacts;
  }

  const nextArtifacts = markFinalizationExternalArtifactsTextReview(
    options.artifacts,
    options.textReview.cacheArtifact
  );
  const stage = options.currentExternalStage ?? "spreadsheet.prepared";

  try {
    await options.persistArtifacts(stage, nextArtifacts);
    options.profiler?.mark("text_review.cache_persisted");
    return nextArtifacts;
  } catch (error) {
    options.profiler?.mark("text_review.cache_persist_failed");
    console.error(`[${options.source}] cache_persist_failed`, {
      error,
    });
    return options.artifacts;
  }
}

type FooterStructureState =
  | "not_started"
  | "marker_written"
  | "structure_inserted"
  | "ambiguous";

function hasStructuralInsertions(mutation: FormSheetMutation) {
  return (
    (mutation.rowInsertions?.length ?? 0) > 0 ||
    (mutation.templateBlockInsertions?.length ?? 0) > 0 ||
    (mutation.hiddenRows?.length ?? 0) > 0
  );
}

function resolveFooterStructureState(options: {
  artifacts: FinalizationExternalArtifacts;
  inspectedFooters: Awaited<ReturnType<typeof inspectFooterActaWrites>>;
}) {
  if (options.inspectedFooters.length === 0) {
    return "not_started" as FooterStructureState;
  }

  const markersBySheet = new Map(
    options.artifacts.footerMutationMarkers.map((marker) => [
      marker.sheetName,
      marker,
    ])
  );

  let sharedState: FooterStructureState | null = null;

  for (const footerWrite of options.inspectedFooters) {
    const marker = markersBySheet.get(footerWrite.sheetName);
    if (!marker) {
      return "ambiguous";
    }

    let currentState: FooterStructureState;
    if (!footerWrite.applied && footerWrite.rowIndex === marker.initialRowIndex) {
      currentState = "not_started";
    } else if (
      footerWrite.applied &&
      footerWrite.rowIndex === marker.initialRowIndex
    ) {
      currentState = "marker_written";
    } else if (
      footerWrite.applied &&
      footerWrite.rowIndex === marker.expectedFinalRowIndex
    ) {
      currentState = "structure_inserted";
    } else {
      currentState = "ambiguous";
    }

    if (!sharedState) {
      sharedState = currentState;
      continue;
    }

    if (sharedState !== currentState) {
      return "ambiguous";
    }
  }

  return sharedState ?? "not_started";
}

export async function ensureFinalizationSheetMutationApplied(options: {
  resumeFromPersistedArtifacts: boolean;
  currentExternalStage: FinalizationExternalStage | null;
  artifacts: FinalizationExternalArtifacts;
  mutation: FormSheetMutation;
  onSheetStep?: (label: string) => void;
  runGoogleStep: <T>(
    stage: string,
    operation: () => Promise<T>,
    successLabel?: string
  ) => Promise<T>;
  persistArtifacts: (
    stage: FinalizationExternalStage,
    artifacts: FinalizationExternalArtifacts
  ) => Promise<void>;
  profiler?: Pick<FinalizationProfiler, "mark">;
}) {
  if (
    hasReachedFinalizationExternalStage(
      options.currentExternalStage,
      "spreadsheet.apply_mutation_done"
    )
  ) {
    return {
      artifacts: options.artifacts,
      externalStage: options.currentExternalStage ?? "spreadsheet.apply_mutation_done",
      mutationApplied: true,
    };
  }

  const effectiveMutation = deriveEffectiveFinalizationMutation({
    mutation: options.mutation,
    spreadsheetResourceMode: options.artifacts.spreadsheetResourceMode,
    effectiveSheetReplacements: options.artifacts.effectiveSheetReplacements,
  });

  let nextArtifacts = options.artifacts;
  let currentExternalStage = options.currentExternalStage ?? "spreadsheet.prepared";
  const structureRequired = hasStructuralInsertions(effectiveMutation);
  let footerStructureState: FooterStructureState | null = null;

  if (structureRequired && nextArtifacts.footerActaRefs.length === 0) {
    throw new Error(
      "La mutacion estructural del spreadsheet requiere footer ACTA ID para poder reanudarse de forma segura."
    );
  }

  if (nextArtifacts.footerActaRefs.length > 0) {
    const inspectedFooters = await options.runGoogleStep(
      "spreadsheet.inspect_mutation_marker",
      () =>
        inspectFooterActaWrites(
          nextArtifacts.spreadsheetId,
          nextArtifacts.footerActaRefs
        ),
      "spreadsheet.inspect_mutation_marker_done"
    );

    if (nextArtifacts.footerMutationMarkers.length === 0) {
      const hasAppliedFooter = inspectedFooters.some((footerWrite) => footerWrite.applied);
      if (options.resumeFromPersistedArtifacts && hasAppliedFooter) {
        throw new Error(
          "No se puede reanudar la mutacion del spreadsheet porque faltan los markers estructurales del footer."
        );
      }

      nextArtifacts = {
        ...nextArtifacts,
        footerMutationMarkers: buildFooterMutationMarkers({
          footerWrites: inspectedFooters,
          footerActaRefs: nextArtifacts.footerActaRefs,
          mutation: effectiveMutation,
        }),
      };
      await options.persistArtifacts("spreadsheet.prepared", nextArtifacts);
      currentExternalStage = "spreadsheet.prepared";
    }

    footerStructureState = resolveFooterStructureState({
      artifacts: nextArtifacts,
      inspectedFooters,
    });

    if (footerStructureState === "ambiguous") {
      throw new Error(
        "No se pudo determinar si la estructura de Google Sheets ya fue insertada; se detiene la finalizacion para evitar duplicaciones."
      );
    }

    if (!hasReachedFinalizationExternalStage(currentExternalStage, "spreadsheet.footer_marker_written")) {
      if (footerStructureState === "not_started") {
        await options.runGoogleStep(
          "spreadsheet.write_footer_marker",
          () => writeFooterActaMarker(nextArtifacts.spreadsheetId, inspectedFooters),
          "spreadsheet.write_footer_marker_done"
        );
        footerStructureState = "marker_written";
      }

      if (footerStructureState === "marker_written") {
        nextArtifacts =
          markFinalizationExternalArtifactsFooterMarkerWritten(nextArtifacts);
        await options.persistArtifacts(
          "spreadsheet.footer_marker_written",
          nextArtifacts
        );
        currentExternalStage = "spreadsheet.footer_marker_written";
      } else if (footerStructureState === "structure_inserted") {
        nextArtifacts =
          markFinalizationExternalArtifactsFooterMarkerWritten(nextArtifacts);
        nextArtifacts =
          markFinalizationExternalArtifactsStructureInsertionsApplied(nextArtifacts);
        await options.persistArtifacts(
          "spreadsheet.structure_insertions_done",
          nextArtifacts
        );
        currentExternalStage = "spreadsheet.structure_insertions_done";
      }
    }
  }

  if (
    structureRequired &&
    hasReachedFinalizationExternalStage(
      currentExternalStage,
      "spreadsheet.structure_insertions_done"
    ) &&
    !hasReachedFinalizationExternalStage(
      currentExternalStage,
      "spreadsheet.apply_mutation_done"
    ) &&
    footerStructureState !== "structure_inserted"
  ) {
    throw new Error(
      "El spreadsheet reporta una etapa estructural inconsistente y no se puede reanudar sin riesgo de duplicacion."
    );
  }

  if (
    structureRequired &&
    hasReachedFinalizationExternalStage(
      currentExternalStage,
      "spreadsheet.footer_marker_written"
    ) &&
    !hasReachedFinalizationExternalStage(
      currentExternalStage,
      "spreadsheet.structure_insertions_done"
    )
  ) {
    if (footerStructureState === "structure_inserted") {
      nextArtifacts =
        markFinalizationExternalArtifactsStructureInsertionsApplied(nextArtifacts);
      await options.persistArtifacts(
        "spreadsheet.structure_insertions_done",
        nextArtifacts
      );
      currentExternalStage = "spreadsheet.structure_insertions_done";
    } else if (footerStructureState !== "marker_written") {
      throw new Error(
        "No se pudo validar el progreso estructural del spreadsheet antes de reanudar inserciones."
      );
    }
  }

  if (
    structureRequired &&
    !hasReachedFinalizationExternalStage(
      currentExternalStage,
      "spreadsheet.structure_insertions_done"
    )
  ) {
    await options.runGoogleStep(
      "spreadsheet.apply_structure_insertions",
      () =>
        applyFormSheetStructureInsertions(
          nextArtifacts.spreadsheetId,
          effectiveMutation,
          { onStep: options.onSheetStep }
        ),
      "spreadsheet.apply_structure_insertions_done"
    );
    nextArtifacts =
      markFinalizationExternalArtifactsStructureInsertionsApplied(nextArtifacts);
    await options.persistArtifacts(
      "spreadsheet.structure_insertions_done",
      nextArtifacts
    );
    currentExternalStage = "spreadsheet.structure_insertions_done";
  }

  await options.runGoogleStep(
    "spreadsheet.apply_mutation",
    () =>
      applyFormSheetCellWrites(nextArtifacts.spreadsheetId, effectiveMutation, {
        onStep: options.onSheetStep,
      }),
    "spreadsheet.apply_mutation_done"
  );

  nextArtifacts = markFinalizationExternalArtifactsMutationApplied(nextArtifacts);
  await options.persistArtifacts("spreadsheet.apply_mutation_done", nextArtifacts);

  return {
    artifacts: nextArtifacts,
    externalStage: "spreadsheet.apply_mutation_done" as const,
    mutationApplied: true,
  };
}

export type NormalizationAuditChangeType =
  | "trim"
  | "default"
  | "canonicalization"
  | "derived_recomputed";

export type NormalizationAuditEntry = {
  path: string;
  type: NormalizationAuditChangeType;
};

function isBlankPrimitive(value: unknown) {
  return (
    value == null ||
    (typeof value === "string" && value.trim().length === 0)
  );
}

function collapseSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function classifyNormalizationChange(
  path: string,
  before: unknown,
  after: unknown
): NormalizationAuditChangeType {
  if (path.endsWith("total_tiempo") || path === "sumatoria_horas") {
    return "derived_recomputed";
  }

  if (isBlankPrimitive(before) && !isBlankPrimitive(after)) {
    return "default";
  }

  if (typeof before === "string" && typeof after === "string") {
    if (after === before.trim() || after === collapseSpaces(before)) {
      return "trim";
    }
  }

  return "canonicalization";
}

function collectNormalizationAuditEntries(
  before: unknown,
  after: unknown,
  path: string,
  bucket: NormalizationAuditEntry[],
  maxEntries: number
) {
  if (bucket.length >= maxEntries || Object.is(before, after)) {
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLength = Math.max(before.length, after.length);
    for (let index = 0; index < maxLength; index += 1) {
      collectNormalizationAuditEntries(
        before[index],
        after[index],
        path ? `${path}.${index}` : String(index),
        bucket,
        maxEntries
      );
      if (bucket.length >= maxEntries) {
        return;
      }
    }
    return;
  }

  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      collectNormalizationAuditEntries(
        before[key],
        after[key],
        path ? `${path}.${key}` : key,
        bucket,
        maxEntries
      );
      if (bucket.length >= maxEntries) {
        return;
      }
    }
    return;
  }

  bucket.push({
    path,
    type: classifyNormalizationChange(path, before, after),
  });
}

export function buildNormalizationAudit(
  before: unknown,
  after: unknown,
  maxEntries = 50
) {
  const changes: NormalizationAuditEntry[] = [];
  collectNormalizationAuditEntries(before, after, "", changes, maxEntries);
  return {
    changeCount: changes.length,
    changes,
    truncated: changes.length >= maxEntries,
  };
}

export function logNormalizationAudit(options: {
  formSlug: string;
  before: unknown;
  after: unknown;
  source: string;
}) {
  const audit = buildNormalizationAudit(options.before, options.after);
  if (audit.changeCount === 0) {
    return;
  }

  console.info(`[${options.source}] normalization_applied`, {
    formSlug: options.formSlug,
    changeCount: audit.changeCount,
    truncated: audit.truncated,
    changes: audit.changes,
  });
}
