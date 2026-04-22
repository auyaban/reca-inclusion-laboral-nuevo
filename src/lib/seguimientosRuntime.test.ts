import { describe, expect, it } from "vitest";
import {
  buildSeguimientosStageDraftStateMap,
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFinalSummary,
  createEmptySeguimientosFollowupValues,
  SEGUIMIENTOS_FINAL_STEP,
  type SeguimientosCaseMeta,
} from "@/lib/seguimientos";
import { buildSeguimientosWorkflow } from "@/lib/seguimientosStages";
import {
  SEGUIMIENTOS_CASE_SCHEMA_VERSION,
  buildSeguimientosDraftData,
  buildSeguimientosHydrationFromDraftData,
  getSeguimientosStageIdFromStep,
  getSeguimientosStepFromStageId,
  parseSeguimientosDraftData,
  type SeguimientosCaseHydration,
} from "@/lib/seguimientosRuntime";

function createEmpresa() {
  return {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno SAS",
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
}

function createCaseMeta(): SeguimientosCaseMeta {
  return {
    caseId: "sheet-1",
    cedula: "1001234567",
    nombreVinculado: "Ana Perez",
    empresaNit: "900123456",
    empresaNombre: "Empresa Uno SAS",
    companyType: "no_compensar",
    maxFollowups: 3,
    driveFolderId: "folder-1",
    spreadsheetId: "sheet-1",
    spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-1/edit",
    folderName: "Ana Perez - 1001234567",
    baseSheetName: "9. SEGUIMIENTO AL PROCESO DE INCLUSION LABORAL",
    profesionalAsignado: "Marta Ruiz",
    cajaCompensacion: "Colsubsidio",
    createdAt: "2026-04-21T10:00:00.000Z",
    updatedAt: "2026-04-21T10:05:00.000Z",
  };
}

function createHydration(): SeguimientosCaseHydration {
  const empresa = createEmpresa();
  const caseMeta = createCaseMeta();
  const baseValues = createEmptySeguimientosBaseValues(empresa);
  baseValues.nombre_vinculado = "Ana Perez";
  baseValues.cedula = "1001234567";
  baseValues.tipo_contrato = "Termino fijo";
  baseValues.seguimiento_fechas_1_3[0] = "2026-04-21";

  const followup1 = createEmptySeguimientosFollowupValues(1);
  followup1.fecha_seguimiento = "2026-04-21";
  followup1.tipo_apoyo = "No requiere apoyo.";
  followup1.situacion_encontrada = "Sin novedades";
  followup1.estrategias_ajustes = "Mantener acompanamiento";
  followup1.item_autoevaluacion[0] = "Bien";
  followup1.item_eval_empresa[0] = "Bien";
  followup1.empresa_eval[0] = "Excelente";
  followup1.asistentes[0] = {
    nombre: "Marta Ruiz",
    cargo: "Profesional RECA",
  };

  const workflow = buildSeguimientosWorkflow({
    companyType: caseMeta.companyType,
    baseValues,
    followups: {
      1: followup1,
    },
    activeStageId: "followup_2",
  });

  return {
    schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION,
    caseMeta,
    empresaSnapshot: empresa,
    personPrefill: {
      cedula_usuario: "1001234567",
      nombre_usuario: "Ana Perez",
      discapacidad_usuario: "Auditiva",
      discapacidad_detalle: "",
      certificado_discapacidad: "Si",
      certificado_porcentaje: "45",
      telefono_oferente: "3000000000",
      correo_oferente: "ana@example.com",
      cargo_oferente: "Auxiliar administrativo",
      contacto_emergencia: "Mario Perez",
      parentesco: "Hermano",
      telefono_emergencia: "3010000000",
      fecha_firma_contrato: "2026-04-21",
      tipo_contrato: "Termino fijo",
      fecha_fin: "2026-12-21",
      empresa_nit: "900123456",
      empresa_nombre: "Empresa Uno SAS",
    },
    stageDraftStateByStageId: buildSeguimientosStageDraftStateMap(
      caseMeta.companyType
    ),
    baseValues,
    persistedBaseValues: baseValues,
    followupValuesByIndex: {
      1: followup1,
    },
    persistedFollowupValuesByIndex: {
      1: followup1,
    },
    summary: createEmptySeguimientosFinalSummary(),
    workflow,
    suggestedStageId: workflow.suggestedStageId,
  };
}

describe("seguimientosRuntime", () => {
  it("maps draft steps to stable stage ids and clamps hidden followups", () => {
    expect(getSeguimientosStepFromStageId("base_process")).toBe(0);
    expect(getSeguimientosStepFromStageId("followup_3")).toBe(3);
    expect(getSeguimientosStepFromStageId("final_result")).toBe(
      SEGUIMIENTOS_FINAL_STEP
    );

    expect(getSeguimientosStageIdFromStep(0, 3)).toBe("base_process");
    expect(getSeguimientosStageIdFromStep(2, 3)).toBe("followup_2");
    expect(getSeguimientosStageIdFromStep(6, 3)).toBe("followup_3");
    expect(getSeguimientosStageIdFromStep(SEGUIMIENTOS_FINAL_STEP, 3)).toBe(
      "final_result"
    );
  });

  it("builds and restores a draft snapshot preserving case context and active stage", () => {
    const hydration = createHydration();
    const draft = buildSeguimientosDraftData(hydration, {
      activeStageId: "followup_2",
    });
    const parsed = parseSeguimientosDraftData(draft);

    expect(parsed).not.toBeNull();
    expect(parsed?.caseMeta.caseId).toBe("sheet-1");
    expect(parsed?.activeStageId).toBe("followup_2");

    const restored = buildSeguimientosHydrationFromDraftData(parsed!);

    expect(restored.caseMeta.caseId).toBe("sheet-1");
    expect(restored.stageDraftStateByStageId.base_process).toBeDefined();
    expect(restored.workflow.activeStageId).toBe("followup_2");
    expect(restored.workflow.visibleStageIds).toEqual([
      "base_process",
      "followup_1",
      "followup_2",
      "followup_3",
      "final_result",
    ]);
    expect(restored.suggestedStageId).toBe("base_process");
  });

  it("rejects malformed draft payloads without case metadata", () => {
    expect(parseSeguimientosDraftData(null)).toBeNull();
    expect(parseSeguimientosDraftData({})).toBeNull();
    expect(
      parseSeguimientosDraftData({
        schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION,
        base: {},
        workflow: {},
      })
    ).toBeNull();
  });

  it("backfills empty stage draft state maps when restoring older snapshots", () => {
    const hydration = createHydration();
    const legacyDraft = {
      ...buildSeguimientosDraftData(hydration),
      stageDraftStateByStageId: undefined,
    };

    const parsed = parseSeguimientosDraftData(legacyDraft);

    expect(parsed?.stageDraftStateByStageId.base_process).toEqual(
      expect.objectContaining({
        lastSavedToSheetsAt: null,
      })
    );
    expect(parsed?.summary).toEqual(
      expect.objectContaining({
        exportReady: false,
        lastRepairedAt: null,
      })
    );
  });

  it("rebuilds workflow from legacy snapshots and normalizes followup string keys", () => {
    const hydration = createHydration();
    const legacyDraft = {
      ...buildSeguimientosDraftData(hydration),
      workflow: {
        activeStageId: "followup_1",
      },
      activeStageId: "followup_9",
      followups: {
        "1": hydration.followupValuesByIndex[1],
        "9": createEmptySeguimientosFollowupValues(1),
      },
    };

    const parsed = parseSeguimientosDraftData(legacyDraft);

    expect(parsed).not.toBeNull();
    expect(parsed?.activeStageId).toBe("base_process");
    expect(parsed?.workflow.visibleStageIds).toEqual([
      "base_process",
      "followup_1",
      "followup_2",
      "followup_3",
      "final_result",
    ]);
    expect(parsed?.followups[1]).toBeDefined();
    expect((parsed?.followups as Record<string, unknown>)["9"]).toBeUndefined();
  });

  it("rejects draft snapshots from a newer schema version", () => {
    const hydration = createHydration();
    const draft = {
      ...buildSeguimientosDraftData(hydration),
      schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION + 1,
    };

    expect(parseSeguimientosDraftData(draft)).toBeNull();
  });
});
