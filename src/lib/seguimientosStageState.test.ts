import { describe, expect, it } from "vitest";
import {
  buildSeguimientosStageDraftStateMap,
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFollowupValues,
} from "@/lib/seguimientos";
import {
  buildSeguimientosModifiedFieldIdsByStageId,
  copySeguimientosFollowupIntoEmptyFields,
  listSeguimientosDirtyStageIds,
  mergeSeguimientosBaseTimelineFromFollowups,
  resolveSeguimientosPostSaveActiveStageId,
} from "@/lib/seguimientosStageState";

describe("seguimientosStageState", () => {
  it("detects modified writable fields against persisted snapshots", () => {
    const persistedBaseValues = createEmptySeguimientosBaseValues();
    const currentBaseValues = {
      ...persistedBaseValues,
      contacto_emergencia: "Nuevo contacto",
    };
    const persistedFollowup = createEmptySeguimientosFollowupValues(1);
    persistedFollowup.fecha_seguimiento = "2026-04-21";
    const currentFollowup = {
      ...persistedFollowup,
      fecha_seguimiento: "2026-04-22",
      item_observaciones: persistedFollowup.item_observaciones.map((value, index) =>
        index === 0 ? "Observacion actualizada" : value
      ),
    };

    const modified = buildSeguimientosModifiedFieldIdsByStageId({
      companyType: "no_compensar",
      currentBaseValues,
      currentFollowupValuesByIndex: { 1: currentFollowup },
      persistedBaseValues,
      persistedFollowupValuesByIndex: { 1: persistedFollowup },
    });

    expect(modified.base_process).toContain("contacto_emergencia");
    expect(modified.followup_1).toEqual(
      expect.arrayContaining(["fecha_seguimiento", "item_observaciones.0"])
    );
    expect(listSeguimientosDirtyStageIds(modified)).toEqual(
      expect.arrayContaining(["base_process", "followup_1"])
    );
  });

  it("ignores the auto-seeded first assistant row until the user edits it manually", () => {
    const persistedBaseValues = createEmptySeguimientosBaseValues();
    const currentBaseValues = createEmptySeguimientosBaseValues();
    const persistedFollowup = createEmptySeguimientosFollowupValues(2);
    const currentFollowup = createEmptySeguimientosFollowupValues(2);
    currentFollowup.asistentes[0] = {
      nombre: "Laura RECA",
      cargo: "Profesional RECA",
    };
    const stageDraftStateByStageId = buildSeguimientosStageDraftStateMap(
      "no_compensar"
    );
    stageDraftStateByStageId.followup_2 = {
      ...stageDraftStateByStageId.followup_2,
      autoSeededFirstAsistente: {
        nombre: "Laura RECA",
        cargo: "Profesional RECA",
        pendingConfirmation: true,
      },
    };

    const modified = buildSeguimientosModifiedFieldIdsByStageId({
      companyType: "no_compensar",
      currentBaseValues,
      currentFollowupValuesByIndex: { 2: currentFollowup },
      persistedBaseValues,
      persistedFollowupValuesByIndex: { 2: persistedFollowup },
      stageDraftStateByStageId,
    });

    expect(modified.followup_2).not.toContain("asistentes.0.nombre");
    expect(modified.followup_2).not.toContain("asistentes.0.cargo");

    stageDraftStateByStageId.followup_2 = {
      ...stageDraftStateByStageId.followup_2,
      autoSeededFirstAsistente: {
        nombre: "Laura RECA",
        cargo: "Profesional RECA",
        pendingConfirmation: false,
      },
    };

    const modifiedAfterManualEdit = buildSeguimientosModifiedFieldIdsByStageId({
      companyType: "no_compensar",
      currentBaseValues,
      currentFollowupValuesByIndex: { 2: currentFollowup },
      persistedBaseValues,
      persistedFollowupValuesByIndex: { 2: persistedFollowup },
      stageDraftStateByStageId,
    });

    expect(modifiedAfterManualEdit.followup_2).toEqual(
      expect.arrayContaining(["asistentes.0.nombre", "asistentes.0.cargo"])
    );
  });

  it("copies only empty fields from the previous followup", () => {
    const sourceValues = createEmptySeguimientosFollowupValues(1);
    sourceValues.modalidad = "Presencial";
    sourceValues.tipo_apoyo = "Requiere apoyo bajo.";
    sourceValues.item_autoevaluacion[0] = "Bien";
    sourceValues.item_eval_empresa[0] = "Excelente";
    sourceValues.empresa_eval[0] = "Bien";
    sourceValues.item_observaciones[0] = "No debe copiar";
    sourceValues.asistentes[0] = {
      nombre: "Ana",
      cargo: "Profesional RECA",
    };

    const targetValues = createEmptySeguimientosFollowupValues(2);
    targetValues.modalidad = "Virtual";
    targetValues.item_eval_empresa[0] = "Mal";

    const result = copySeguimientosFollowupIntoEmptyFields({
      sourceValues,
      targetValues,
      sourceIndex: 1,
      targetIndex: 2,
    });

    expect(result.modalidad).toBe("Virtual");
    expect(result.tipo_apoyo).toBe("Requiere apoyo bajo.");
    expect(result.item_autoevaluacion[0]).toBe("Bien");
    expect(result.item_eval_empresa[0]).toBe("Mal");
    expect(result.empresa_eval[0]).toBe("Bien");
    expect(result.item_observaciones[0]).toBe("");
    expect(result.asistentes[0]).toEqual({ nombre: "", cargo: "" });
    expect(result.fecha_seguimiento).toBe("");
  });

  it("preserves default copy-forward exclusions when excludePaths is omitted", () => {
    const sourceValues = createEmptySeguimientosFollowupValues(1);
    sourceValues.fecha_seguimiento = "2026-04-21";
    sourceValues.modalidad = "Presencial";
    sourceValues.tipo_apoyo = "Requiere apoyo bajo.";
    sourceValues.item_observaciones[0] = "Observacion interna";
    sourceValues.asistentes[0] = {
      nombre: "Ana",
      cargo: "Profesional RECA",
    };

    const result = copySeguimientosFollowupIntoEmptyFields({
      sourceValues,
      targetValues: createEmptySeguimientosFollowupValues(2),
      sourceIndex: 1,
      targetIndex: 2,
    });

    expect(result.modalidad).toBe("Presencial");
    expect(result.tipo_apoyo).toBe("Requiere apoyo bajo.");
    expect(result.fecha_seguimiento).toBe("");
    expect(result.item_observaciones[0]).toBe("");
    expect(result.asistentes[0]).toEqual({ nombre: "", cargo: "" });
  });

  it("unions explicit excludePaths with the default exact-path exclusions", () => {
    const sourceValues = createEmptySeguimientosFollowupValues(1);
    sourceValues.fecha_seguimiento = "2026-04-21";
    sourceValues.modalidad = "Presencial";
    sourceValues.tipo_apoyo = "Requiere apoyo bajo.";
    sourceValues.item_autoevaluacion[0] = "Excelente";
    sourceValues.item_autoevaluacion[1] = "Bien";
    sourceValues.item_eval_empresa[0] = "Alto";
    sourceValues.empresa_eval[0] = "Medio";
    sourceValues.item_observaciones[0] = "Observacion interna";

    const result = copySeguimientosFollowupIntoEmptyFields({
      sourceValues,
      targetValues: createEmptySeguimientosFollowupValues(2),
      sourceIndex: 1,
      targetIndex: 2,
      excludePaths: new Set(["modalidad", "item_autoevaluacion.0", "empresa_eval.0"]),
    });

    expect(result.modalidad).toBe("");
    expect(result.tipo_apoyo).toBe("Requiere apoyo bajo.");
    expect(result.item_autoevaluacion[0]).toBe("");
    expect(result.item_autoevaluacion[1]).toBe("Bien");
    expect(result.item_eval_empresa[0]).toBe("Alto");
    expect(result.empresa_eval[0]).toBe("");
    expect(result.fecha_seguimiento).toBe("");
    expect(result.item_observaciones[0]).toBe("");
  });

  it("merges base timeline dates from visible followups", () => {
    const baseValues = createEmptySeguimientosBaseValues();
    const followup1 = createEmptySeguimientosFollowupValues(1);
    followup1.fecha_seguimiento = "2026-04-21";
    const followup2 = createEmptySeguimientosFollowupValues(2);
    followup2.fecha_seguimiento = "2026-04-28";
    const followup4 = createEmptySeguimientosFollowupValues(4);
    followup4.fecha_seguimiento = "2026-05-12";

    const result = mergeSeguimientosBaseTimelineFromFollowups({
      baseValues,
      followupValuesByIndex: {
        1: followup1,
        2: followup2,
        4: followup4,
      },
      companyType: "compensar",
    });

    expect(result.seguimiento_fechas_1_3).toEqual(["2026-04-21", "2026-04-28", ""]);
    expect(result.seguimiento_fechas_4_6).toEqual(["2026-05-12", "", ""]);
  });

  it("keeps the user on the corrected stage after saving with override", () => {
    expect(
      resolveSeguimientosPostSaveActiveStageId({
        activeStageId: "followup_2",
        suggestedStageId: "followup_3",
        activeStageOverrideActive: true,
      })
    ).toBe("followup_2");

    expect(
      resolveSeguimientosPostSaveActiveStageId({
        activeStageId: "followup_2",
        suggestedStageId: "followup_3",
        activeStageOverrideActive: false,
      })
    ).toBe("followup_2");

    expect(
      resolveSeguimientosPostSaveActiveStageId({
        activeStageId: "base_process",
        suggestedStageId: "followup_1",
        activeStageOverrideActive: false,
      })
    ).toBe("base_process");
  });
});
