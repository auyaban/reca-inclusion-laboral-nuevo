import type { Page, Route } from "@playwright/test";
import {
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFinalSummary,
  createEmptySeguimientosFollowupValues,
  buildSeguimientosStageDraftStateMap,
  type SeguimientosBaseValues,
  type SeguimientosCompanyType,
  type SeguimientosFollowupIndex,
  type SeguimientosFollowupValues,
  type SeguimientosStageId,
} from "../../src/lib/seguimientos";
import {
  buildSeguimientosBaseProgress,
  buildSeguimientosWorkflow,
  SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
  syncBaseTimelineWithFollowup,
} from "../../src/lib/seguimientosStages";
import {
  SEGUIMIENTOS_CASE_SCHEMA_VERSION,
  type SeguimientosCaseHydration,
} from "../../src/lib/seguimientosRuntime";

const EMPRESA = {
  id: "empresa-seguimientos-e2e",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: "Zona Norte",
  correo_1: "empresa@example.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Lider SST",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@example.com",
  asesor: "Carlos Perez",
  correo_asesor: "carlos@example.com",
  caja_compensacion: "Compensar",
};

const PERSON_PREFILL = {
  cedula_usuario: "1000061994",
  nombre_usuario: "Ana Perez",
  discapacidad_usuario: "Auditiva",
  discapacidad_detalle: "Discapacidad auditiva",
  certificado_discapacidad: "Si",
  certificado_porcentaje: "45",
  telefono_oferente: "3001112233",
  correo_oferente: "ana@correo.com",
  cargo_oferente: "Analista",
  contacto_emergencia: "Mario Perez",
  parentesco: "Hermano",
  telefono_emergencia: "3010000000",
  fecha_firma_contrato: "2026-04-15",
  tipo_contrato: "Contrato de trabajo a termino fijo",
  fecha_fin: "2027-04-15",
  empresa_nit: "900123456",
  empresa_nombre: "ACME SAS",
};

type MockSeguimientosOptions = {
  companyType?: SeguimientosCompanyType;
  requireCompanyTypeResolution?: boolean;
  baseCompleted?: boolean;
  completedFollowups?: SeguimientosFollowupIndex[];
  failedVisitFollowups?: SeguimientosFollowupIndex[];
  activeStageId?: SeguimientosStageId;
  forceEditableStageId?: SeguimientosStageId;
  exportReady?: boolean;
  saveNeedsReloadOnce?: boolean;
  stagesSaveErrorCode?: "base_stage_incomplete";
  caseLoadErrorCode?: "case_reclaim_required" | "case_access_denied";
  bootstrapErrorCode?:
    | "google_storage_quota_exceeded"
    | "case_bootstrap_storage_failed";
};

type ServerState = {
  companyType: SeguimientosCompanyType;
  baseValues: SeguimientosBaseValues;
  followups: Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>;
  activeStageId?: SeguimientosStageId;
  forceEditableStageId?: SeguimientosStageId;
  exportReady: boolean;
  caseUpdatedAt: string;
};

function setValueAtPath(target: Record<string, unknown>, path: string, value: string) {
  const segments = path.split(".");
  let current: unknown = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isLastSegment = index === segments.length - 1;

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(segment, 10);
      if (isLastSegment) {
        current[arrayIndex] = value;
        return;
      }

      current = current[arrayIndex];
      continue;
    }

    const record = current as Record<string, unknown>;
    if (isLastSegment) {
      record[segment] = value;
      return;
    }

    current = record[segment];
  }
}

function buildCompletedBaseValues() {
  const baseValues = createEmptySeguimientosBaseValues(EMPRESA);
  const mutableBaseValues = baseValues as unknown as Record<string, unknown>;

  [
    ...SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
    ...SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  ].forEach((path) => {
    const value =
      path === "modalidad"
        ? "Presencial"
        : path === "fecha_visita"
          ? "2026-04-21"
          : path === "fecha_inicio_contrato"
            ? "2026-04-15"
            : path === "fecha_fin_contrato"
              ? "2027-04-15"
              : path === "fecha_firma_contrato"
                ? "2026-04-15"
                : "Listo";
    setValueAtPath(
      mutableBaseValues,
      path,
      value
    );
  });

  mutableBaseValues.fecha_visita = "2026-04-21";
  mutableBaseValues.nombre_empresa = EMPRESA.nombre_empresa;
  mutableBaseValues.nit_empresa = EMPRESA.nit_empresa;
  mutableBaseValues.nombre_vinculado = PERSON_PREFILL.nombre_usuario;
  mutableBaseValues.cedula = PERSON_PREFILL.cedula_usuario;
  mutableBaseValues.cargo_vinculado = PERSON_PREFILL.cargo_oferente;
  mutableBaseValues.discapacidad = PERSON_PREFILL.discapacidad_detalle;

  return baseValues;
}

function buildCompletedFollowupValues(index: SeguimientosFollowupIndex) {
  const followupValues = createEmptySeguimientosFollowupValues(index);
  const mutableFollowupValues =
    followupValues as unknown as Record<string, unknown>;

  [
    ...SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
    ...SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  ].forEach((path) => {
    setValueAtPath(
      mutableFollowupValues,
      path,
      path === "modalidad"
        ? "Presencial"
        : path === "tipo_apoyo"
          ? "No requiere apoyo."
          : path.startsWith("item_autoevaluacion") ||
              path.startsWith("item_eval_empresa") ||
              path.startsWith("empresa_eval")
            ? "Bien"
          : path === "fecha_seguimiento"
            ? `2026-04-2${index}`
            : "Ok"
    );
  });

  return followupValues;
}

function buildFailedVisitFollowupValues(index: SeguimientosFollowupIndex) {
  const followupValues = createEmptySeguimientosFollowupValues(index);
  const mutableFollowupValues =
    followupValues as unknown as Record<string, unknown>;

  followupValues.modalidad = "Presencial";
  followupValues.fecha_seguimiento = `2026-04-2${index}`;

  [
    ...Array.from({ length: 19 }, (_, fieldIndex) => `item_observaciones.${fieldIndex}`),
    ...Array.from({ length: 19 }, (_, fieldIndex) => `item_autoevaluacion.${fieldIndex}`),
    ...Array.from({ length: 19 }, (_, fieldIndex) => `item_eval_empresa.${fieldIndex}`),
    ...Array.from({ length: 8 }, (_, fieldIndex) => `empresa_observacion.${fieldIndex}`),
    ...Array.from({ length: 8 }, (_, fieldIndex) => `empresa_eval.${fieldIndex}`),
  ].forEach((path) => {
    setValueAtPath(mutableFollowupValues, path, "No aplica");
  });

  return followupValues;
}

function createServerState(options: MockSeguimientosOptions = {}): ServerState {
  const companyType = options.companyType ?? "no_compensar";
  const baseValues = options.baseCompleted
    ? buildCompletedBaseValues()
    : createEmptySeguimientosBaseValues(EMPRESA);
  const followups: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  > = {};

  for (const followupIndex of (companyType === "compensar"
    ? [1, 2, 3, 4, 5, 6]
    : [1, 2, 3]) as SeguimientosFollowupIndex[]) {
    followups[followupIndex] = options.failedVisitFollowups?.includes(followupIndex)
      ? buildFailedVisitFollowupValues(followupIndex)
      : options.completedFollowups?.includes(followupIndex)
        ? buildCompletedFollowupValues(followupIndex)
        : createEmptySeguimientosFollowupValues(followupIndex);
  }

  return {
    companyType,
    baseValues,
    followups,
    activeStageId: options.activeStageId,
    forceEditableStageId: options.forceEditableStageId,
    exportReady: options.exportReady ?? false,
    caseUpdatedAt: "2026-04-21T10:05:00.000Z",
  };
}

function buildHydrationFromState(state: ServerState): SeguimientosCaseHydration {
  const workflow = buildSeguimientosWorkflow({
    companyType: state.companyType,
    baseValues: state.baseValues,
    followups: state.followups,
    activeStageId: state.forceEditableStageId ?? state.activeStageId,
  });
  if (state.forceEditableStageId) {
    workflow.activeStageId = state.forceEditableStageId;
    workflow.suggestedStageId = state.forceEditableStageId;
    workflow.stageStates = workflow.stageStates.map((stageState) =>
      stageState.stageId === state.forceEditableStageId && stageState.kind !== "final"
        ? {
            ...stageState,
            isEditable: true,
            isProtectedByDefault: false,
            overrideActive: false,
          }
        : stageState
    );
  }

  return {
    schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION,
    caseMeta: {
      caseId: "sheet-seguimientos-e2e",
      cedula: PERSON_PREFILL.cedula_usuario,
      nombreVinculado: PERSON_PREFILL.nombre_usuario,
      empresaNit: EMPRESA.nit_empresa,
      empresaNombre: EMPRESA.nombre_empresa,
      companyType: state.companyType,
      maxFollowups: state.companyType === "compensar" ? 6 : 3,
      driveFolderId: "folder-seguimientos-e2e",
      spreadsheetId: "sheet-seguimientos-e2e",
      spreadsheetUrl:
        "https://docs.google.com/spreadsheets/d/sheet-seguimientos-e2e/edit",
      folderName: "Ana Perez - 1000061994",
      baseSheetName: "9. SEGUIMIENTO AL PROCESO DE INCLUSION LABORAL",
      profesionalAsignado: EMPRESA.profesional_asignado,
      cajaCompensacion:
        state.companyType === "compensar" ? "Compensar" : "Colsubsidio",
      createdAt: "2026-04-21T10:00:00.000Z",
      updatedAt: state.caseUpdatedAt,
    },
    empresaSnapshot: {
      ...EMPRESA,
      caja_compensacion:
        state.companyType === "compensar" ? "Compensar" : "Colsubsidio",
    },
    personPrefill: PERSON_PREFILL,
    stageDraftStateByStageId: buildSeguimientosStageDraftStateMap(state.companyType),
    baseValues: structuredClone(state.baseValues),
    persistedBaseValues: structuredClone(state.baseValues),
    followupValuesByIndex: structuredClone(state.followups),
    persistedFollowupValuesByIndex: structuredClone(state.followups),
    summary: {
      ...createEmptySeguimientosFinalSummary(),
      formulaIntegrity: state.exportReady ? "healthy" : "unknown",
      exportReady: state.exportReady,
      lastVerifiedAt: "2026-04-21T10:10:00.000Z",
      lastComputedAt: "2026-04-21T10:10:00.000Z",
      fields: {
        fecha_visita: state.baseValues.fecha_visita,
        nombre_empresa: EMPRESA.nombre_empresa,
        nombre_vinculado: PERSON_PREFILL.nombre_usuario,
      },
    },
    workflow,
    suggestedStageId: workflow.suggestedStageId,
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockSeguimientosApi(
  page: Page,
  options: MockSeguimientosOptions = {}
) {
  let state = createServerState(options);
  let saveNeedsReloadPending = options.saveNeedsReloadOnce === true;
  let caseUpdateCounter = 0;

  function nextCaseUpdatedAt() {
    caseUpdateCounter += 1;
    return new Date(
      Date.parse("2026-04-21T10:05:00.000Z") + caseUpdateCounter * 60_000
    ).toISOString();
  }

  await page.route("**/api/seguimientos/case/bootstrap", async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as {
      companyTypeOverride?: SeguimientosCompanyType;
    };

    if (options.bootstrapErrorCode) {
      const message =
        options.bootstrapErrorCode === "google_storage_quota_exceeded"
          ? "Google Drive/Sheets no pudo preparar el caso por limite temporal de cuota. Intenta de nuevo en unos minutos."
          : "No se pudo preparar el archivo de Seguimientos en Google Drive.";
      await route.fulfill({
        status:
          options.bootstrapErrorCode === "google_storage_quota_exceeded"
            ? 503
            : 502,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          code: options.bootstrapErrorCode,
          message,
        }),
      });
      return;
    }

    if (options.requireCompanyTypeResolution && !body.companyTypeOverride) {
      await fulfillJson(route, {
        status: "resolution_required",
        reason: "company_type",
        context: {
          empresa_nombre: EMPRESA.nombre_empresa,
        },
      });
      return;
    }

    if (body.companyTypeOverride) {
      state = createServerState({
        ...options,
        companyType: body.companyTypeOverride,
      });
    }

    await fulfillJson(route, {
      status: "ready",
      hydration: buildHydrationFromState(state),
    });
  });

  await page.route("**/api/seguimientos/case/*/stages/override", async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as {
      stageIds?: string[];
    };
    const stageIds = body.stageIds?.length ? body.stageIds : ["followup_1"];

    await fulfillJson(route, {
      status: "ready",
        grants: stageIds.map((stageId) => ({
          stageId,
          token: `grant-${stageId}`,
          expiresAt: "2026-04-22T23:40:00.000Z",
        })),
      });
  });

  await page.route("**/api/seguimientos/case/*", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (
      request.method() !== "GET" ||
      !/\/api\/seguimientos\/case\/[^/]+$/.test(pathname)
    ) {
      await route.fallback();
      return;
    }

    if (options.caseLoadErrorCode) {
      await route.fulfill({
        status:
          options.caseLoadErrorCode === "case_access_denied" ? 403 : 409,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          code: options.caseLoadErrorCode,
          message:
            options.caseLoadErrorCode === "case_access_denied"
              ? "No tienes permisos para abrir o modificar este caso de Seguimientos."
              : "Este caso todavia no tiene ownership asignado. Vuelve a abrirlo por cédula para reclamarlo antes de continuar.",
        }),
      });
      return;
    }

    await fulfillJson(route, {
      status: "ready",
      hydration: buildHydrationFromState(state),
    });
  });

  await page.route("**/api/seguimientos/case/*/stage/base", async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as {
      baseValues: SeguimientosBaseValues;
      activeStageId?: SeguimientosStageId;
      expectedCaseUpdatedAt?: string | null;
    };
    if (
      body.expectedCaseUpdatedAt &&
      body.expectedCaseUpdatedAt !== state.caseUpdatedAt
    ) {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          code: "case_conflict",
          message:
            "Este caso cambio en otra pestaña o sesion. Recargalo antes de guardar.",
          currentCaseUpdatedAt: state.caseUpdatedAt,
        }),
      });
      return;
    }

    state = {
      ...state,
      baseValues: structuredClone(body.baseValues),
      activeStageId: body.activeStageId ?? state.activeStageId,
      caseUpdatedAt: nextCaseUpdatedAt(),
    };

    if (saveNeedsReloadPending) {
      saveNeedsReloadPending = false;
      await fulfillJson(route, {
        status: "written_needs_reload",
        savedAt: "2026-04-21T10:15:00.000Z",
        savedStageIds: ["base_process"],
        message:
          "Los cambios ya quedaron en Google Sheets. Recarga Seguimientos antes de continuar.",
      });
      return;
    }

    await fulfillJson(route, {
      status: "ready",
      hydration: buildHydrationFromState(state),
      savedAt: "2026-04-21T10:15:00.000Z",
    });
  });

  await page.route("**/api/seguimientos/case/*/stages/save", async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as {
      activeStageId?: SeguimientosStageId;
      dirtyStageIds?: string[];
      expectedCaseUpdatedAt?: string | null;
      baseValues: SeguimientosBaseValues;
      followupValuesByIndex: Partial<
        Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
      >;
    };

    if (
      body.expectedCaseUpdatedAt &&
      body.expectedCaseUpdatedAt !== state.caseUpdatedAt
    ) {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          code: "case_conflict",
          message:
            "Este caso cambio en otra pestaña o sesion. Recargalo antes de guardar.",
          currentCaseUpdatedAt: state.caseUpdatedAt,
        }),
      });
      return;
    }

    if (options.stagesSaveErrorCode) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          code: options.stagesSaveErrorCode,
          message:
            "La ficha inicial debe estar completa antes de guardar seguimientos.",
        }),
      });
      return;
    }

    let nextBaseValues = structuredClone(body.baseValues);
    const nextFollowups = structuredClone(state.followups);

    for (const stageId of body.dirtyStageIds ?? []) {
      if (stageId === "base_process") {
        nextBaseValues = structuredClone(body.baseValues);
        continue;
      }

      const followupIndex = Number.parseInt(stageId.replace("followup_", ""), 10) as SeguimientosFollowupIndex;
      const nextFollowup = body.followupValuesByIndex[followupIndex];
      if (!nextFollowup) {
        continue;
      }

      nextFollowups[followupIndex] = structuredClone(nextFollowup);
      nextBaseValues = syncBaseTimelineWithFollowup(
        nextBaseValues,
        followupIndex,
        nextFollowup
      );
    }

    if (
      (body.dirtyStageIds ?? []).some((stageId) => stageId !== "base_process") &&
      !buildSeguimientosBaseProgress(nextBaseValues).isCompleted
    ) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          code: "base_stage_incomplete",
          message:
            "La ficha inicial debe estar completa antes de guardar seguimientos.",
        }),
      });
      return;
    }

    state = {
      ...state,
      baseValues: nextBaseValues,
      followups: nextFollowups,
      activeStageId: body.activeStageId ?? state.activeStageId,
      caseUpdatedAt: nextCaseUpdatedAt(),
    };

    if (saveNeedsReloadPending) {
      saveNeedsReloadPending = false;
      await fulfillJson(route, {
        status: "written_needs_reload",
        savedAt: "2026-04-21T10:20:00.000Z",
        savedStageIds: body.dirtyStageIds ?? [],
        message:
          "Los cambios ya quedaron en Google Sheets. Recarga Seguimientos antes de continuar.",
      });
      return;
    }

    await fulfillJson(route, {
      status: "ready",
      hydration: buildHydrationFromState(state),
      savedAt: "2026-04-21T10:20:00.000Z",
      savedStageIds: body.dirtyStageIds ?? [],
    });
  });

  await page.route("**/api/seguimientos/case/*/result/refresh", async (route) => {
    state = {
      ...state,
      exportReady: true,
    };

    await fulfillJson(route, {
      status: "ready",
      hydration: buildHydrationFromState(state),
      refreshedAt: "2026-04-21T10:25:00.000Z",
    });
  });

  await page.route("**/api/seguimientos/case/*/pdf/export", async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as { optionId?: string };

    await fulfillJson(route, {
      status: "ready",
      hydration: buildHydrationFromState(state),
      links: {
        sheetLink:
          "https://docs.google.com/spreadsheets/d/sheet-seguimientos-e2e/edit",
        pdfLink: "https://drive.google.com/file/d/seguimientos-pdf-e2e/view",
      },
      exportedAt: "2026-04-21T10:30:00.000Z",
      optionId: body.optionId ?? "base_only",
    });
  });
}
