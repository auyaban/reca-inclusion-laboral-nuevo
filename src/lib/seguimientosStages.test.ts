import { describe, expect, it } from "vitest";
import {
  buildSeguimientosBaseProgress,
  buildSeguimientosFollowupProgress,
  buildSeguimientosWorkflow,
  isSeguimientosBaseConfirmable,
  isSeguimientosFailedVisitFollowupExportReady,
  listSeguimientosPdfOptions,
  shouldProtectStageByDefault,
  SEGUIMIENTOS_BASE_STAGE_RULE,
  SEGUIMIENTOS_BASE_WRITABLE_FIELDS,
  syncBaseTimelineWithFollowup,
  SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
} from "@/lib/seguimientosStages";
import {
  SEGUIMIENTOS_BASE_STAGE_ID,
  SEGUIMIENTOS_FINAL_STAGE_ID,
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFollowupValues,
  createSeguimientosFollowupCopySeed,
  normalizeSeguimientosBaseValues,
  type SeguimientosFollowupIndex,
  type SeguimientosFollowupValues,
} from "@/lib/seguimientos";

function setValueAtPath(target: Record<string, unknown>, path: string, value: string) {
  const segments = path.split(".");
  let current: unknown = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isLastSegment = index === segments.length - 1;

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(segment, 10);
      if (!Number.isInteger(arrayIndex)) {
        throw new Error(`Invalid array path: ${path}`);
      }

      if (isLastSegment) {
        current[arrayIndex] = value;
        return;
      }

      current = current[arrayIndex];
      continue;
    }

    if (!current || typeof current !== "object") {
      throw new Error(`Invalid path: ${path}`);
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
  const values = normalizeSeguimientosBaseValues(createEmptySeguimientosBaseValues());
  const mutableValues = values as unknown as Record<string, unknown>;

  [
    ...SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
    ...SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  ].forEach((path) => {
    const nextValue =
      path === "modalidad"
        ? "Presencial"
        : path === "fecha_visita"
          ? "2026-04-21"
          : path === "fecha_inicio_contrato"
            ? "2026-04-17"
            : path === "fecha_fin_contrato"
              ? "2026-12-21"
              : path === "fecha_firma_contrato"
                ? "2026-04-17"
                : "Listo";
    setValueAtPath(mutableValues, path, nextValue);
  });

  mutableValues.nombre_empresa = "Compania Demo";
  mutableValues.nit_empresa = "900123456";
  return values;
}

function buildMinimumConfirmableBaseValues() {
  const values = normalizeSeguimientosBaseValues(createEmptySeguimientosBaseValues());

  values.fecha_visita = "2026-04-21";
  values.modalidad = "Presencial";
  values.nombre_vinculado = "Ana Perez";
  values.cedula = "1001234567";
  values.cargo_vinculado = "Auxiliar administrativo";
  values.discapacidad = "Auditiva";
  values.tipo_contrato = "Termino fijo";
  values.apoyos_ajustes = "Apoyo visual y acompanamiento inicial.";
  values.funciones_1_5[0] = "Registrar informacion basica del proceso.";

  return values;
}

function buildCompletedFollowupValues(index: SeguimientosFollowupIndex) {
  const values = createEmptySeguimientosFollowupValues(index);
  const mutableValues = values as unknown as Record<string, unknown>;

  [
    ...SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
    ...SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  ].forEach((path) => {
    const nextValue =
      path === "modalidad"
        ? "Presencial"
        : path === "tipo_apoyo"
          ? "Requiere apoyo bajo."
          : path === "fecha_seguimiento"
            ? `2026-04-0${index}`
            : "Ok";
    setValueAtPath(mutableValues, path, nextValue);
  });

  return values;
}

function buildInProgressFollowupValues(index: SeguimientosFollowupIndex) {
  const values = createEmptySeguimientosFollowupValues(index);
  values.modalidad = "Presencial";
  return values;
}

function buildMinimumConfirmableFollowupValues(index: SeguimientosFollowupIndex) {
  const values = createEmptySeguimientosFollowupValues(index);

  values.modalidad = "Presencial";
  values.fecha_seguimiento = `2026-04-0${index}`;
  values.tipo_apoyo = "Requiere apoyo bajo.";
  values.item_autoevaluacion[0] = "Bien";
  values.item_eval_empresa[0] = "Bien";
  values.empresa_eval[0] = "Bien";
  values.situacion_encontrada = "Seguimiento inicial sin novedades.";
  values.estrategias_ajustes = "Mantener acompanamiento.";

  return values;
}

function buildFailedVisitFollowupValues(index: SeguimientosFollowupIndex) {
  const values = createEmptySeguimientosFollowupValues(index);
  const mutableValues = values as unknown as Record<string, unknown>;

  values.modalidad = "Presencial";
  values.fecha_seguimiento = `2026-04-1${index}`;

  [
    ...Array.from({ length: 19 }, (_, fieldIndex) => `item_observaciones.${fieldIndex}`),
    ...Array.from({ length: 19 }, (_, fieldIndex) => `item_autoevaluacion.${fieldIndex}`),
    ...Array.from({ length: 19 }, (_, fieldIndex) => `item_eval_empresa.${fieldIndex}`),
    ...Array.from({ length: 8 }, (_, fieldIndex) => `empresa_observacion.${fieldIndex}`),
    ...Array.from({ length: 8 }, (_, fieldIndex) => `empresa_eval.${fieldIndex}`),
  ].forEach((path) => {
    setValueAtPath(mutableValues, path, "No aplica");
  });

  return values;
}

describe("seguimientos stage contracts", () => {
  it("tracks the critical fallback fields as writable on the base stage", () => {
    expect(SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS).toEqual(
      expect.arrayContaining(["cargo_vinculado", "discapacidad"])
    );
    expect(SEGUIMIENTOS_BASE_WRITABLE_FIELDS).toEqual(
      expect.arrayContaining(["cargo_vinculado", "discapacidad"])
    );
  });

  it("suggests the base stage while the ficha inicial is still incomplete", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
    });

    expect(workflow.suggestedStageId).toBe(SEGUIMIENTOS_BASE_STAGE_ID);
    expect(workflow.maxFollowups).toBe(3);
    expect(workflow.visibleStageIds).toEqual(["base_process"]);
  });

  it("moves the suggestion to the first incomplete followup once the ficha inicial is complete", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "compensar",
      baseValues: buildCompletedBaseValues(),
    });

    expect(workflow.suggestedStageId).toBe("followup_1");
    expect(workflow.maxFollowups).toBe(6);
    expect(workflow.visibleStageIds).toEqual(["base_process", "followup_1"]);
  });

  it("treats a minimum-complete base below the 90 percent threshold as confirmable but not completed", () => {
    const progress = buildSeguimientosBaseProgress(buildMinimumConfirmableBaseValues());

    expect(progress.coveragePercent).toBeLessThan(90);
    expect(progress.meetsMinimumRequirements).toBe(true);
    expect(progress.hasMeaningfulContent).toBe(true);
    expect(progress.isCompleted).toBe(false);
    expect(isSeguimientosBaseConfirmable(progress)).toBe(true);
  });

  it("requires both minimum fields and meaningful content before base is confirmable", () => {
    expect(
      isSeguimientosBaseConfirmable({
        meetsMinimumRequirements: false,
        hasMeaningfulContent: true,
      })
    ).toBe(false);
    expect(
      isSeguimientosBaseConfirmable({
        meetsMinimumRequirements: true,
        hasMeaningfulContent: false,
      })
    ).toBe(false);
    expect(
      isSeguimientosBaseConfirmable({
        meetsMinimumRequirements: false,
        hasMeaningfulContent: false,
      })
    ).toBe(false);
  });

  it("opens Seguimiento 1 in the workflow when the base is confirmable below the 90 percent threshold", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: buildMinimumConfirmableBaseValues(),
      persistedBaseValues: createEmptySeguimientosBaseValues(),
      activeStageId: "base_process",
    });
    const baseState = workflow.stageStates.find(
      (stage) => stage.stageId === "base_process"
    );

    expect(baseState?.progress.isCompleted).toBe(false);
    expect(workflow.suggestedStageId).toBe("followup_1");
    expect(workflow.activeStageId).toBe("base_process");
    expect(workflow.visibleStageIds).toEqual(["base_process", "followup_1"]);
    expect(workflow.completedStageIds).not.toContain("base_process");
    expect(baseState?.helperText).toBe(
      "Ficha confirmada. Puedes seguir editandola o completarla mas tarde."
    );
  });

  it("protects the persisted base once it is confirmable even below the 90 percent threshold", () => {
    const persistedProgress = buildSeguimientosBaseProgress(
      buildMinimumConfirmableBaseValues()
    );

    expect(persistedProgress.isCompleted).toBe(false);
    expect(
      shouldProtectStageByDefault({
        rule: SEGUIMIENTOS_BASE_STAGE_RULE,
        persistedProgress,
        overrideUnlockedStageIds: [],
      })
    ).toBe(true);
  });

  it("protects a persisted confirmable base in the workflow and updates helper text", () => {
    const baseValues = buildMinimumConfirmableBaseValues();
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues,
      persistedBaseValues: baseValues,
      activeStageId: "base_process",
    });
    const baseState = workflow.stageStates.find(
      (stage) => stage.stageId === "base_process"
    );

    expect(baseState?.progress.isCompleted).toBe(false);
    expect(baseState?.isProtectedByDefault).toBe(true);
    expect(baseState?.isEditable).toBe(false);
    expect(baseState?.helperText).toBe(
      "Ficha confirmada y protegida. Reabre para editar."
    );
  });

  it("keeps followup protection tied to completion, not minimum confirmable content", () => {
    const baseValues = buildCompletedBaseValues();
    const followupValues = buildMinimumConfirmableFollowupValues(1);
    const followupProgress = buildSeguimientosFollowupProgress(followupValues, 1);
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues,
      persistedBaseValues: baseValues,
      followups: {
        1: followupValues,
      },
      persistedFollowups: {
        1: followupValues,
      },
      activeStageId: "followup_1",
    });
    const followup1 = workflow.stageStates.find(
      (stage) => stage.stageId === "followup_1"
    );

    expect(followupProgress.meetsMinimumRequirements).toBe(true);
    expect(followupProgress.hasMeaningfulContent).toBe(true);
    expect(followupProgress.isCompleted).toBe(false);
    expect(followup1?.isProtectedByDefault).toBe(false);
    expect(followup1?.isEditable).toBe(true);
  });

  it("allows override to unlock a protected confirmable base", () => {
    const baseValues = buildMinimumConfirmableBaseValues();
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues,
      persistedBaseValues: baseValues,
      activeStageId: "base_process",
      overrideUnlockedStageIds: ["base_process"],
    });
    const baseState = workflow.stageStates.find(
      (stage) => stage.stageId === "base_process"
    );

    expect(baseState?.isProtectedByDefault).toBe(false);
    expect(baseState?.overrideActive).toBe(true);
    expect(baseState?.isEditable).toBe(true);
  });

  it("protects historical completed stages by default but keeps the suggested stage editable", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: buildCompletedBaseValues(),
      persistedBaseValues: buildCompletedBaseValues(),
      followups: {
        1: buildCompletedFollowupValues(1),
      },
      persistedFollowups: {
        1: buildCompletedFollowupValues(1),
      },
    });

    const followup1 = workflow.stageStates.find(
      (stage) => stage.stageId === "followup_1"
    );
    const followup2 = workflow.stageStates.find(
      (stage) => stage.stageId === "followup_2"
    );

    expect(workflow.suggestedStageId).toBe("followup_2");
    expect(followup1?.isProtectedByDefault).toBe(true);
    expect(followup1?.isEditable).toBe(false);
    expect(followup2?.isSuggested).toBe(true);
    expect(followup2?.isEditable).toBe(true);
  });

  it("allows override to unlock a historical stage without changing the suggested stage", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: buildCompletedBaseValues(),
      persistedBaseValues: buildCompletedBaseValues(),
      followups: {
        1: buildCompletedFollowupValues(1),
      },
      persistedFollowups: {
        1: buildCompletedFollowupValues(1),
      },
      overrideUnlockedStageIds: ["followup_1"],
    });

    const followup1 = workflow.stageStates.find(
      (stage) => stage.stageId === "followup_1"
    );

    expect(workflow.suggestedStageId).toBe("followup_2");
    expect(followup1?.isProtectedByDefault).toBe(false);
    expect(followup1?.overrideActive).toBe(true);
    expect(followup1?.isEditable).toBe(true);
  });

  it("does not protect a followup with only local content when the persisted stage is still empty", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: createEmptySeguimientosBaseValues(),
      persistedBaseValues: createEmptySeguimientosBaseValues(),
      followups: {
        1: buildInProgressFollowupValues(1),
      },
      persistedFollowups: {
        1: createEmptySeguimientosFollowupValues(1),
      },
      activeStageId: "followup_1",
    });

    const followup1 = workflow.stageStates.find(
      (stage) => stage.stageId === "followup_1"
    );

    expect(followup1?.status).toBe("in_progress");
    expect(followup1?.isProtectedByDefault).toBe(false);
    expect(followup1?.isEditable).toBe(true);
  });

  it("keeps Resultado final visible once at least one persisted followup is completed", () => {
    const baseValues = buildCompletedBaseValues();
    const followup1 = buildCompletedFollowupValues(1);
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues,
      persistedBaseValues: baseValues,
      followups: {
        1: followup1,
      },
      persistedFollowups: {
        1: followup1,
      },
      activeStageId: "followup_1",
    });

    expect(workflow.suggestedStageId).toBe("followup_2");
    expect(workflow.visibleStageIds).toEqual([
      "base_process",
      "followup_1",
      "followup_2",
      SEGUIMIENTOS_FINAL_STAGE_ID,
    ]);
    expect(
      workflow.stageStates.find(
        (stage) => stage.stageId === SEGUIMIENTOS_FINAL_STAGE_ID
      )?.isSuggested
    ).toBe(false);
  });

  it("does not unlock Resultado final from local-only followup completion", () => {
    const baseValues = buildCompletedBaseValues();
    const followup1 = buildCompletedFollowupValues(1);
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues,
      persistedBaseValues: baseValues,
      followups: {
        1: followup1,
      },
      persistedFollowups: {
        1: createEmptySeguimientosFollowupValues(1),
      },
      activeStageId: SEGUIMIENTOS_FINAL_STAGE_ID,
    });

    expect(workflow.suggestedStageId).toBe("followup_2");
    expect(workflow.visibleStageIds).toEqual([
      "base_process",
      "followup_1",
      "followup_2",
    ]);
    expect(workflow.activeStageId).toBe("followup_2");
  });

  it("marks only the followup stages as compatible with failed visit presets", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: buildCompletedBaseValues(),
    });

    expect(
      workflow.stageStates.find((stage) => stage.stageId === "base_process")
        ?.supportsFailedVisitPreset
    ).toBe(false);
    expect(
      workflow.stageStates.find((stage) => stage.stageId === "followup_1")
        ?.supportsFailedVisitPreset
    ).toBe(true);
    expect(
      workflow.stageStates.find((stage) => stage.stageId === "final_result")
        ?.supportsFailedVisitPreset
    ).toBe(false);
  });

  it("syncs the saved followup date back into the base timeline", () => {
    const baseValues = buildCompletedBaseValues();
    const followupValues = buildCompletedFollowupValues(4);
    const nextBase = syncBaseTimelineWithFollowup(baseValues, 4, followupValues);

    expect(nextBase.seguimiento_fechas_1_3).toEqual(["", "", ""]);
    expect(nextBase.seguimiento_fechas_4_6).toEqual(["2026-04-04", "", ""]);
  });

  it("builds a full PDF catalog with visible and blocked variants", () => {
    const options = listSeguimientosPdfOptions({
      companyType: "no_compensar",
      baseValues: buildCompletedBaseValues(),
      followups: {
        1: buildCompletedFollowupValues(1),
        2: {
          ...createEmptySeguimientosFollowupValues(2),
          modalidad: "Presencial",
          fecha_seguimiento: "2026-04-15",
        } satisfies Partial<SeguimientosFollowupValues>,
      },
      summary: {
        exportReady: true,
      },
    });

    expect(options).toEqual(
      expect.arrayContaining([
        {
          id: "base_only",
          label: "Solo ficha inicial",
          includesBase: true,
          fechaSeguimiento: null,
          includeFinalSummary: false,
          enabled: true,
          disabledReason: null,
        },
        {
          id: "base_plus_followup_1",
          label: "Ficha inicial + Seguimiento 1",
          includesBase: true,
          followupIndex: 1,
          fechaSeguimiento: "2026-04-01",
          includeFinalSummary: false,
          enabled: true,
          disabledReason: null,
        },
        {
          id: "base_plus_followup_1_plus_final",
          label: "Ficha inicial + Seguimiento 1 + Consolidado",
          includesBase: true,
          followupIndex: 1,
          fechaSeguimiento: "2026-04-01",
          includeFinalSummary: true,
          enabled: true,
          disabledReason: null,
        },
        {
          id: "base_plus_followup_2",
          label: "Ficha inicial + Seguimiento 2",
          includesBase: true,
          followupIndex: 2,
          fechaSeguimiento: "2026-04-15",
          includeFinalSummary: false,
          enabled: false,
          disabledReason:
            "Falta completar: tipo de apoyo, autoevaluacion, evaluacion empresa, evaluacion del entorno, situacion encontrada, estrategias y ajustes. Vuelve al editor para completar antes de exportar.",
          missingFieldPaths: [
            "tipo_apoyo",
            "item_autoevaluacion.0",
            "item_eval_empresa.0",
            "empresa_eval.0",
            "situacion_encontrada",
            "estrategias_ajustes",
          ],
        },
        {
          id: "base_plus_followup_3",
          label: "Ficha inicial + Seguimiento 3",
          includesBase: true,
          followupIndex: 3,
          fechaSeguimiento: null,
          includeFinalSummary: false,
          enabled: false,
          disabledReason: "Seguimiento 3 aun no esta guardado",
        },
      ])
    );
    expect(options).toHaveLength(7);
  });

  it("explains missing followup minimum fields in blocked PDF options", () => {
    const partialFollowup = buildCompletedFollowupValues(1);
    partialFollowup.modalidad = "";
    partialFollowup.fecha_seguimiento = "";

    const options = listSeguimientosPdfOptions({
      companyType: "no_compensar",
      baseValues: buildCompletedBaseValues(),
      followups: {
        1: partialFollowup,
      },
      summary: {
        exportReady: true,
      },
    });

    expect(options.find((option) => option.id === "base_plus_followup_1")).toEqual(
      expect.objectContaining({
        enabled: false,
        disabledReason:
          "Falta completar: modalidad, fecha de seguimiento. Vuelve al editor para completar antes de exportar.",
        missingFieldPaths: ["modalidad", "fecha_seguimiento"],
      })
    );
  });

  it("uses the base timeline date fallback when checking followup PDF readiness", () => {
    const baseValues = buildCompletedBaseValues();
    baseValues.seguimiento_fechas_1_3[0] = "2026-04-30";
    const followupValues = buildCompletedFollowupValues(1);
    followupValues.fecha_seguimiento = "";

    const options = listSeguimientosPdfOptions({
      companyType: "no_compensar",
      baseValues,
      followups: {
        1: followupValues,
      },
      summary: {
        exportReady: true,
      },
    });

    expect(options.find((option) => option.id === "base_plus_followup_1")).toEqual(
      expect.objectContaining({
        enabled: true,
        disabledReason: null,
        fechaSeguimiento: "2026-04-30",
      })
    );
    expect(
      options.find((option) => option.id === "base_plus_followup_1")
    ).not.toHaveProperty("missingFieldPaths");
  });

  it("keeps variants visible and differentiates why they are blocked", () => {
    const incompleteBaseOptions = listSeguimientosPdfOptions({
      companyType: "no_compensar",
      baseValues: createEmptySeguimientosBaseValues(),
      followups: {
        1: buildCompletedFollowupValues(1),
      },
      summary: {
        exportReady: true,
      },
    });

    expect(
      incompleteBaseOptions.find((option) => option.id === "base_only")
    ).toEqual(
      expect.objectContaining({
        enabled: false,
        disabledReason: "Ficha inicial aun no esta lista",
      })
    );
    expect(
      incompleteBaseOptions.find((option) => option.id === "base_plus_followup_1")
    ).toEqual(
      expect.objectContaining({
        enabled: false,
        disabledReason: "Ficha inicial aun no esta lista",
      })
    );

    const completedBaseOptions = listSeguimientosPdfOptions({
      companyType: "no_compensar",
      baseValues: buildCompletedBaseValues(),
      followups: {
        1: buildCompletedFollowupValues(1),
      },
      summary: {
        exportReady: false,
      },
    });

    expect(
      completedBaseOptions.find(
        (option) => option.id === "base_plus_followup_1_plus_final"
      )
    ).toEqual(
      expect.objectContaining({
        enabled: false,
        disabledReason: "El consolidado final aun no esta completo",
      })
    );
  });

  it("treats a persisted failed visit as export-ready for ficha + seguimiento", () => {
    const baseValues = buildCompletedBaseValues();
    const failedVisitValues = buildFailedVisitFollowupValues(1);

    expect(
      isSeguimientosFailedVisitFollowupExportReady({
        baseValues,
        followupValues: failedVisitValues,
        followupIndex: 1,
      })
    ).toBe(true);

    const options = listSeguimientosPdfOptions({
      companyType: "no_compensar",
      baseValues,
      followups: {
        1: failedVisitValues,
      },
      summary: {
        exportReady: false,
      },
    });

    expect(
      options.find((option) => option.id === "base_plus_followup_1")
    ).toEqual(
      expect.objectContaining({
        enabled: true,
        disabledReason: null,
      })
    );
  });

  it("copies followup operational data forward but clears date and long texts", () => {
    const source = buildCompletedFollowupValues(1);
    source.asistentes[0] = { nombre: "Ana", cargo: "Profesional RECA" };
    source.item_observaciones[0] = "Observacion";
    source.empresa_observacion[0] = "Observacion empresa";
    source.situacion_encontrada = "Novedad";
    source.estrategias_ajustes = "Ajuste";

    const copySeed = createSeguimientosFollowupCopySeed(source, 2);

    expect(copySeed.seguimiento_numero).toBe("2");
    expect(copySeed.fecha_seguimiento).toBe("");
    expect(copySeed.item_autoevaluacion[0]).toBe("Ok");
    expect(copySeed.empresa_eval[0]).toBe("Ok");
    expect(copySeed.asistentes[0]).toEqual({
      nombre: "Ana",
      cargo: "Profesional RECA",
    });
    expect(copySeed.item_observaciones[0]).toBe("");
    expect(copySeed.empresa_observacion[0]).toBe("");
    expect(copySeed.situacion_encontrada).toBe("");
    expect(copySeed.estrategias_ajustes).toBe("");
  });
});
