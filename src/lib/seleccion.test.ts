import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSeleccionFailedVisitOferentePatch,
  buildSeleccionFailedVisitPresetFieldGroups,
  createFailedVisitSeleccionOferenteRow,
  getDefaultSeleccionValues,
  isSeleccionOferenteComplete,
  normalizeSeleccionValues,
  SELECCION_OFERENTES_CONFIG,
} from "@/lib/seleccion";
import { applyFailedVisitPreset } from "@/lib/failedVisitPreset";
import { getFailedVisitActionConfig } from "@/lib/failedVisitActionRegistry";
import { seleccionSchema } from "@/lib/validations/seleccion";
import {
  buildValidSeleccionOferenteRow,
  SELECCION_TEST_EMPRESA,
} from "@/lib/testing/seleccionFixtures";

afterEach(() => {
  vi.useRealTimers();
});

const VALID_VISIT_FIELDS = {
  fecha_visita: "2026-04-24",
  modalidad: "Presencial",
} as const;

describe("seleccion normalization", () => {
  it("creates one visible oferente by default", () => {
    const values = getDefaultSeleccionValues(SELECCION_TEST_EMPRESA);

    expect(values.oferentes).toHaveLength(1);
    expect(values.oferentes[0]?.numero).toBe("1");
    expect(values.asistentes).toHaveLength(2);
    expect(SELECCION_OFERENTES_CONFIG.itemLabelSingular).toBe("Oferente");
  });

  it("keeps the card title numeric and exposes nombre + cedula as subtitle summary", () => {
    const row = buildValidSeleccionOferenteRow({
      nombre_oferente: "Ana Perez",
      cedula: "1000061994",
    });

    expect(SELECCION_OFERENTES_CONFIG.getCardTitle?.(row, 0)).toBe("Oferente 1");
    expect(SELECCION_OFERENTES_CONFIG.getCardSubtitle?.(row, 0)).toBe(
      "Ana Perez - 1000061994"
    );
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
          ...VALID_VISIT_FIELDS,
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
          ...VALID_VISIT_FIELDS,
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

  it("derives edad from fecha_nacimiento and normalizes pension type when cuenta_pension is No", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00-05:00"));

    const values = normalizeSeleccionValues(
      {
        oferentes: [
          buildValidSeleccionOferenteRow({
            fecha_nacimiento: "1990-04-16",
            edad: "99",
            cuenta_pension: "No",
            tipo_pension: "Pension invalidez",
          }),
        ],
      },
      SELECCION_TEST_EMPRESA
    );

    expect(values.oferentes[0]?.edad).toBe("35");
    expect(values.oferentes[0]?.tipo_pension).toBe("No aplica");

    const invalidBirthDateValues = normalizeSeleccionValues(
      {
        oferentes: [
          buildValidSeleccionOferenteRow({
            fecha_nacimiento: "",
            edad: "99",
          }),
        ],
      },
      SELECCION_TEST_EMPRESA
    );

    expect(invalidBirthDateValues.oferentes[0]?.edad).toBe("");
  });

  it('accepts "Por definir" as free text in fecha_firma_contrato', () => {
    const result = seleccionSchema.safeParse(
      normalizeSeleccionValues(
        {
          ...VALID_VISIT_FIELDS,
          desarrollo_actividad: "Actividad compartida",
          ajustes_recomendaciones: "Ajuste final",
          nota: "",
          asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
          oferentes: [
            buildValidSeleccionOferenteRow({
              fecha_firma_contrato: "Por definir",
            }),
          ],
        },
        SELECCION_TEST_EMPRESA
      )
    );

    expect(result.success).toBe(true);
  });

  it('rejects "No aplica" as tipo_pension when cuenta_pension is Si', () => {
    const result = seleccionSchema.safeParse(
      normalizeSeleccionValues(
        {
          ...VALID_VISIT_FIELDS,
          desarrollo_actividad: "Actividad compartida",
          ajustes_recomendaciones: "Ajuste final",
          nota: "",
          asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
          oferentes: [
            buildValidSeleccionOferenteRow({
              cuenta_pension: "Si",
              tipo_pension: "No aplica",
            }),
          ],
        },
        SELECCION_TEST_EMPRESA
      )
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["oferentes", 0, "tipo_pension"],
            message:
              "Selecciona un tipo de pension valido cuando cuenta con pension",
          }),
        ])
      );
    }
  });

  it("allows failed visit without meaningful oferentes and keeps narratives required", () => {
    const config = getFailedVisitActionConfig("seleccion");
    if (!config) {
      throw new Error("Missing seleccion failed visit config");
    }

    const result = seleccionSchema.safeParse(
      normalizeSeleccionValues(
        applyFailedVisitPreset(
        {
          ...getDefaultSeleccionValues(SELECCION_TEST_EMPRESA),
          ...VALID_VISIT_FIELDS,
          failed_visit_applied_at: new Date().toISOString(),
            desarrollo_actividad: "Visita fallida reportada",
            ajustes_recomendaciones: "Se reprogramara el proceso",
            asistentes: [
              { nombre: "Profesional RECA", cargo: "Profesional RECA" },
              { nombre: "", cargo: "" },
            ],
          },
          config.presetConfig
        ),
        SELECCION_TEST_EMPRESA
      )
    );

    expect(result.success).toBe(true);
  });

  it("applies failed visit presets to meaningful oferentes without touching identity fields", () => {
    const row = buildValidSeleccionOferenteRow({
      medicamentos_nota: "",
      dinero_nota: "",
    });

    const groups = buildSeleccionFailedVisitPresetFieldGroups([row]);
    const values = applyFailedVisitPreset(
      {
        ...getDefaultSeleccionValues(SELECCION_TEST_EMPRESA),
        ...VALID_VISIT_FIELDS,
        failed_visit_applied_at: new Date().toISOString(),
        desarrollo_actividad: "Visita fallida reportada",
        ajustes_recomendaciones: "Se reprogramara el proceso",
        nota: "",
        oferentes: [row],
      },
      {
        enabled: true,
        excludedPaths: [],
        fieldGroups: [
          {
            value: "No aplica",
            paths: ["nota"],
          },
          ...groups,
        ],
      }
    );

    expect(values.nota).toBe("No aplica");
    expect(values.oferentes[0]?.discapacidad).toBe("No aplica");
    expect(values.oferentes[0]?.medicamentos_nota).toBe("No aplica");
    expect(values.oferentes[0]?.dinero_nota).toBe("No aplica");
    expect(values.oferentes[0]?.nombre_oferente).toBe("Ana Perez");
    expect(values.oferentes[0]?.cedula).toBe("123456");
  });

  it("creates failed-visit rows with compatible fields preset and identity blank", () => {
    const row = createFailedVisitSeleccionOferenteRow(1);

    expect(row.numero).toBe("2");
    expect(row.discapacidad).toBe("No aplica");
    expect(row.medicamentos_nivel_apoyo).toBe("No aplica.");
    expect(row.medicamentos_nota).toBe("No aplica");
    expect(row.nombre_oferente).toBe("");
    expect(row.cedula).toBe("");
  });

  it("does not overwrite existing compatible values when building a row patch", () => {
    const row = buildValidSeleccionOferenteRow({
      medicamentos_nota: "Nota manual",
      dinero_nota: "",
    });

    const patch = buildSeleccionFailedVisitOferentePatch(row, {
      preserveExistingValues: true,
    });

    expect(patch.medicamentos_nota).toBeUndefined();
    expect(patch.dinero_nota).toBe("No aplica");
    expect(patch.nombre_oferente).toBeUndefined();
  });
});
