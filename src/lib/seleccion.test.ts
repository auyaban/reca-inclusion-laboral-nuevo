import { describe, expect, it } from "vitest";
import {
  getDefaultSeleccionValues,
  isSeleccionOferenteComplete,
  normalizeSeleccionValues,
  SELECCION_OFERENTES_CONFIG,
} from "@/lib/seleccion";
import { seleccionSchema } from "@/lib/validations/seleccion";
import {
  buildValidSeleccionOferenteRow,
  SELECCION_TEST_EMPRESA,
} from "@/lib/testing/seleccionFixtures";

describe("seleccion normalization", () => {
  it("creates one visible oferente by default", () => {
    const values = getDefaultSeleccionValues(SELECCION_TEST_EMPRESA);

    expect(values.oferentes).toHaveLength(1);
    expect(values.oferentes[0]?.numero).toBe("1");
    expect(values.asistentes).toHaveLength(2);
    expect(SELECCION_OFERENTES_CONFIG.itemLabelSingular).toBe("Oferente");
  });

  it("promotes legacy desarrollo_actividad from rows to the root field", () => {
    const values = normalizeSeleccionValues(
      {
        oferentes: [
          {
            ...buildValidSeleccionOferenteRow(),
            desarrollo_actividad: "Actividad heredada",
          },
        ],
      },
      SELECCION_TEST_EMPRESA
    );

    expect(values.desarrollo_actividad).toBe("Actividad heredada");
    expect(values.oferentes[0]).not.toHaveProperty("desarrollo_actividad");
  });

  it("detects when a meaningful oferente row is complete", () => {
    const row = normalizeSeleccionValues(
      {
        oferentes: [buildValidSeleccionOferenteRow()],
      },
      SELECCION_TEST_EMPRESA
    ).oferentes[0]!;

    expect(isSeleccionOferenteComplete(row)).toBe(true);
  });

  it("requires desarrollo_actividad when there is at least one meaningful oferente", () => {
    const result = seleccionSchema.safeParse(
      normalizeSeleccionValues(
        {
          desarrollo_actividad: "",
          oferentes: [buildValidSeleccionOferenteRow()],
        },
        SELECCION_TEST_EMPRESA
      )
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["desarrollo_actividad"],
            message: "El desarrollo de la actividad es requerido",
          }),
        ])
      );
    }
  });

  it("accepts empty notes while keeping recommendations required", () => {
    const result = seleccionSchema.safeParse(
      normalizeSeleccionValues(
        {
          desarrollo_actividad: "Actividad compartida",
          ajustes_recomendaciones: "Ajuste final",
          nota: "",
          asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
          oferentes: [
            buildValidSeleccionOferenteRow({
              medicamentos_nota: "",
              alergias_nota: "",
            }),
          ],
        },
        SELECCION_TEST_EMPRESA
      )
    );

    expect(result.success).toBe(true);
  });
});
