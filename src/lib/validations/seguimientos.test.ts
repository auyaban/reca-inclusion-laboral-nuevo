import { describe, expect, it } from "vitest";
import {
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFollowupValues,
} from "@/lib/seguimientos";
import {
  seguimientosBaseStageSaveSchema,
  seguimientosBaseStageSchema,
  seguimientosFollowupStageSchema,
  seguimientosPdfExportSchema,
  seguimientosStageOverrideSchema,
  seguimientosStagesSaveSchema,
} from "@/lib/validations/seguimientos";

describe("seguimientos base validation", () => {
  it("accepts a normalized ficha inicial payload", () => {
    const values = createEmptySeguimientosBaseValues();
    values.fecha_visita = "2026-04-21";
    values.modalidad = "Presencial";
    values.funciones_1_5[0] = "Atender llamadas";

    const parsed = seguimientosBaseStageSchema.safeParse(values);

    expect(parsed.success).toBe(true);
  });

  it("accepts local date input and keeps fecha fin contrato optional", () => {
    const values = createEmptySeguimientosBaseValues();
    values.fecha_visita = "21/04/2026";
    values.fecha_inicio_contrato = "2/4/2026";
    values.fecha_firma_contrato = "23/4/2026";
    values.fecha_fin_contrato = "";

    const parsed = seguimientosBaseStageSchema.safeParse(values);

    expect(parsed.success).toBe(true);
    expect(parsed.data?.fecha_visita).toBe("2026-04-21");
    expect(parsed.data?.fecha_inicio_contrato).toBe("2026-04-02");
    expect(parsed.data?.fecha_firma_contrato).toBe("2026-04-23");
    expect(parsed.data?.fecha_fin_contrato).toBe("");
  });

  it("rejects malformed timeline arrays and impossible dates", () => {
    const values = createEmptySeguimientosBaseValues();
    const parsed = seguimientosBaseStageSchema.safeParse({
      ...values,
      fecha_visita: "2026-02-31",
      seguimiento_fechas_1_3: ["2026-04-21"],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["fecha_visita"],
        }),
        expect.objectContaining({
          path: ["seguimiento_fechas_1_3"],
        }),
      ])
    );
  });

  it("requires the base stage id for the save contract", () => {
    const values = createEmptySeguimientosBaseValues();
    const parsed = seguimientosBaseStageSaveSchema.safeParse({
      activeStageId: "followup_1",
      baseValues: values,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a normalized followup payload", () => {
    const values = createEmptySeguimientosFollowupValues(1);
    values.modalidad = "Presencial";
    values.fecha_seguimiento = "21/04/2026";
    values.tipo_apoyo = "No requiere apoyo.";
    values.item_autoevaluacion[0] = "Bien";
    values.item_eval_empresa[0] = "Bien";
    values.empresa_eval[0] = "Excelente";

    const parsed = seguimientosFollowupStageSchema.safeParse(values);

    expect(parsed.success).toBe(true);
    expect(parsed.data?.fecha_seguimiento).toBe("2026-04-21");
  });

  it("validates the coordinated save contract", () => {
    const baseValues = createEmptySeguimientosBaseValues();
    const followupValues = createEmptySeguimientosFollowupValues(1);
    followupValues.modalidad = "Presencial";

    const parsed = seguimientosStagesSaveSchema.safeParse({
      activeStageId: "followup_1",
      companyType: "no_compensar",
      baseValues,
      followupValuesByIndex: {
        1: followupValues,
      },
      dirtyStageIds: ["base_process", "followup_1"],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects coordinated saves without dirty stages", () => {
    const parsed = seguimientosStagesSaveSchema.safeParse({
      activeStageId: "followup_1",
      companyType: "no_compensar",
      baseValues: createEmptySeguimientosBaseValues(),
      followupValuesByIndex: {},
      dirtyStageIds: [],
      overrideGrants: [],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain(
      "No hay cambios pendientes"
    );
  });

  it("validates the PDF export contract", () => {
    expect(
      seguimientosPdfExportSchema.safeParse({
        optionId: "base_plus_followup_1_plus_final",
      }).success
    ).toBe(true);
    expect(
      seguimientosPdfExportSchema.safeParse({
        optionId: "",
      }).success
    ).toBe(false);
    expect(
      seguimientosPdfExportSchema.safeParse({
        optionId: "followup_1_only",
      }).success
    ).toBe(false);
  });

  it("validates the stage override contract", () => {
    expect(
      seguimientosStageOverrideSchema.safeParse({
        stageIds: ["followup_1"],
      }).success
    ).toBe(true);
    expect(
      seguimientosStageOverrideSchema.safeParse({
        stageIds: ["final_result"],
      }).success
    ).toBe(false);
  });
});
