import { describe, expect, it } from "vitest";
import { buildCondicionesVacanteManualTestValues } from "@/lib/manualTestFill";
import { applyFailedVisitPreset } from "@/lib/failedVisitPreset";
import { getFailedVisitActionConfig } from "@/lib/failedVisitActionRegistry";
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import { condicionesVacanteSchema } from "@/lib/validations/condicionesVacante";
import { SELECCION_TEST_EMPRESA } from "@/lib/testing/seleccionFixtures";

describe("condicionesVacante failed visit", () => {
  it("allows failed visit with one meaningful attendee and no disabilities", () => {
    const config = getFailedVisitActionConfig("condiciones-vacante");
    if (!config) {
      throw new Error("Missing condiciones-vacante failed visit config");
    }

    const baseValues = buildCondicionesVacanteManualTestValues(SELECCION_TEST_EMPRESA);
    const result = condicionesVacanteSchema.safeParse(
      normalizeCondicionesVacanteValues(
        applyFailedVisitPreset(
          {
            ...baseValues,
            failed_visit_applied_at: new Date().toISOString(),
            beneficios_adicionales: "",
            cargo_flexible_genero: "",
            beneficios_mujeres: "",
            nivel_primaria: false,
            nivel_bachiller: false,
            nivel_tecnico_profesional: false,
            nivel_profesional: false,
            nivel_especializacion: false,
            nivel_tecnologo: false,
            especificaciones_formacion: "",
            conocimientos_basicos: "",
            horarios_asignados: "",
            hora_ingreso: "",
            hora_salida: "",
            dias_laborables: "",
            dias_flexibles: "",
            funciones_tareas: "",
            herramientas_equipos: "",
            discapacidades: baseValues.discapacidades.map(() => ({
              discapacidad: "",
              descripcion: "",
            })),
            asistentes: [
              {
                nombre:
                  SELECCION_TEST_EMPRESA.profesional_asignado ?? "Profesional RECA",
                cargo: "Profesional RECA",
              },
              { nombre: "", cargo: "" },
              { nombre: "", cargo: "Asesor Agencia" },
            ],
          },
          config.presetConfig
        ),
        SELECCION_TEST_EMPRESA
      )
    );

    expect(result.success).toBe(true);
  });

  it("keeps observaciones_recomendaciones required in failed visit", () => {
    const config = getFailedVisitActionConfig("condiciones-vacante");
    if (!config) {
      throw new Error("Missing condiciones-vacante failed visit config");
    }

    const baseValues = buildCondicionesVacanteManualTestValues(SELECCION_TEST_EMPRESA);
    const result = condicionesVacanteSchema.safeParse(
      normalizeCondicionesVacanteValues(
        applyFailedVisitPreset(
          {
            ...baseValues,
            failed_visit_applied_at: new Date().toISOString(),
            observaciones_recomendaciones: "",
          },
          config.presetConfig
        ),
        SELECCION_TEST_EMPRESA
      )
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["observaciones_recomendaciones"],
            message: "Este campo es obligatorio",
          }),
        ])
      );
    }
  });
});
