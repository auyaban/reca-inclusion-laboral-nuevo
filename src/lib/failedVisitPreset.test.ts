import { describe, expect, it } from "vitest";
import { applyFailedVisitPreset, listFailedVisitPresetPaths } from "@/lib/failedVisitPreset";
import { createEmptySeguimientosFollowupValues } from "@/lib/seguimientos";
import { buildSeguimientosFollowupProgress } from "@/lib/seguimientosStages";
import {
  SEGUIMIENTOS_FOLLOWUP_FAILED_VISIT_PRESET,
  getSeguimientosFollowupFailedVisitPreset,
} from "@/lib/seguimientosFailedVisitPreset";

describe("failedVisitPreset", () => {
  it("applies only the declared paths and leaves excluded narrative fields untouched", () => {
    const values = createEmptySeguimientosFollowupValues(1);
    values.item_observaciones[0] = "Se visito el puesto";
    values.empresa_observacion[0] = "Observacion empresa";
    values.situacion_encontrada = "No se encontro al vinculado";
    values.estrategias_ajustes = "Reprogramar";

    const result = applyFailedVisitPreset(
      values,
      getSeguimientosFollowupFailedVisitPreset(1)
    );

    expect(result.item_autoevaluacion.every((value) => value === "No aplica")).toBe(
      true
    );
    expect(result.item_eval_empresa.every((value) => value === "No aplica")).toBe(
      true
    );
    expect(result.empresa_eval.every((value) => value === "No aplica")).toBe(true);
    expect(result.item_observaciones.every((value) => value === "No aplica")).toBe(
      true
    );
    expect(
      result.empresa_observacion.every((value) => value === "No aplica")
    ).toBe(true);
    expect(result.situacion_encontrada).toBe("No se encontro al vinculado");
    expect(result.estrategias_ajustes).toBe("Reprogramar");
  });

  it("exposes the exact configured paths for Seguimientos followups", () => {
    const paths = listFailedVisitPresetPaths(
      SEGUIMIENTOS_FOLLOWUP_FAILED_VISIT_PRESET
    );

    expect(paths).toContain("item_autoevaluacion.0");
    expect(paths).toContain("item_eval_empresa.18");
    expect(paths).toContain("empresa_eval.7");
    expect(paths).toContain("item_observaciones.0");
    expect(paths).toContain("empresa_observacion.7");
    expect(paths).not.toContain("situacion_encontrada");
  });

  it("keeps the normal progress builder working after the preset is applied", () => {
    const values = createEmptySeguimientosFollowupValues(1);
    const result = applyFailedVisitPreset(
      values,
      getSeguimientosFollowupFailedVisitPreset(1)
    );
    const progress = buildSeguimientosFollowupProgress(result, 1);

    expect(progress.total).toBeGreaterThan(0);
    expect(progress.filled).toBeGreaterThan(0);
    expect(progress.status).toBe("in_progress");
  });
});
