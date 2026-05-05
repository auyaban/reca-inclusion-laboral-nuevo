import { describe, expect, it } from "vitest";
import {
  EVALUACION_BLOCKED_SECTION_IDS,
  EVALUACION_BASE_ASISTENTES_ROWS,
  EVALUACION_COMPAT_SECTION_TO_STEP,
  EVALUACION_CONTENT_SECTION_ORDER,
  EVALUACION_COMPANY_FIELD_DESCRIPTORS,
  EVALUACION_DERIVED_FIELD_PATHS,
  EVALUACION_FIELD_REGISTRY,
  EVALUACION_INPUT_FIELD_PATHS,
  EVALUACION_ACTIVE_RUNTIME_SECTION_IDS,
  getEvaluacionSectionIdForStep,
  INITIAL_EVALUACION_COLLAPSED_SECTIONS,
  EVALUACION_MASTER_DRIFTS,
  EVALUACION_MAX_ASISTENTES,
  EVALUACION_MIN_SIGNIFICANT_ATTENDEES,
  EVALUACION_NAV_ITEMS,
  EVALUACION_NAV_SECTION_2_GROUP_ID,
  EVALUACION_QUESTION_DESCRIPTORS,
  EVALUACION_QUESTION_SECTION_IDS,
  EVALUACION_QUESTION_TYPE_COUNTS,
  EVALUACION_SECTION_ORDER,
  EVALUACION_SECTION_5_ITEMS,
  areEvaluacionQuestionSectionsComplete,
  isEvaluacionQuestionSectionComplete,
  isEvaluacionSection4Complete,
  isEvaluacionSection5Complete,
} from "@/lib/evaluacionSections";

describe("evaluacionSections", () => {
  it("preserves the descriptor coverage agreed for F1", () => {
    expect(EVALUACION_COMPANY_FIELD_DESCRIPTORS).toHaveLength(14);
    expect(EVALUACION_QUESTION_DESCRIPTORS).toHaveLength(91);
    expect(EVALUACION_SECTION_5_ITEMS).toHaveLength(9);
    expect(EVALUACION_BASE_ASISTENTES_ROWS).toBe(2);
    expect(EVALUACION_MIN_SIGNIFICANT_ATTENDEES).toBe(2);
    expect(EVALUACION_MAX_ASISTENTES).toBe(10);
    expect(EVALUACION_QUESTION_TYPE_COUNTS).toEqual({
      accesible_con_observaciones: 24,
      lista: 34,
      lista_doble: 7,
      lista_triple: 5,
      lista_multiple: 15,
      texto: 6,
    });
  });

  it("keeps every contract field mapped or explicitly dynamic", () => {
    expect(EVALUACION_FIELD_REGISTRY.length).toBeGreaterThan(0);

    EVALUACION_FIELD_REGISTRY.forEach((entry) => {
      expect(entry.sheetCell ?? entry.sheetDynamicTarget).toBeTruthy();
    });
  });

  it("documents the master drifts closed in F1", () => {
    expect(EVALUACION_MASTER_DRIFTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "a18_google_maps",
          classification: "static_copy",
        }),
        expect.objectContaining({
          id: "w61_w69_unmapped_dropdowns",
          classification: "deferred_blocker",
        }),
        expect.objectContaining({
          id: "sheet_2_1_fotos",
          classification: "auxiliary_sheet",
        }),
      ])
    );
  });

  it("separates manual inputs from derived fields", () => {
    expect(EVALUACION_INPUT_FIELD_PATHS).toContain("section_4.nivel_accesibilidad");
    expect(EVALUACION_INPUT_FIELD_PATHS).toContain(
      "section_5.discapacidad_fisica.aplica"
    );
    expect(EVALUACION_INPUT_FIELD_PATHS).not.toContain("section_4.descripcion");
    expect(EVALUACION_INPUT_FIELD_PATHS).not.toContain(
      "section_5.discapacidad_fisica.ajustes"
    );
    expect(EVALUACION_DERIVED_FIELD_PATHS).toContain("section_4.descripcion");
    expect(EVALUACION_DERIVED_FIELD_PATHS).toContain(
      "section_5.discapacidad_fisica.ajustes"
    );
  });

  it("exposes the runtime section contract for F4", () => {
    expect(EVALUACION_CONTENT_SECTION_ORDER).toEqual(
      EVALUACION_SECTION_ORDER.filter((sectionId) => sectionId !== "company")
    );
    expect(EVALUACION_ACTIVE_RUNTIME_SECTION_IDS).toEqual([
      "section_2_1",
      "section_2_2",
      "section_2_3",
      "section_2_4",
      "section_2_5",
      "section_2_6",
      "section_3",
      "section_4",
      "section_5",
      "section_6",
      "section_7",
      "section_8",
    ]);
    expect(EVALUACION_BLOCKED_SECTION_IDS).toEqual([]);
    expect(EVALUACION_COMPAT_SECTION_TO_STEP.section_5).toBe(8);
    expect(EVALUACION_COMPAT_SECTION_TO_STEP.section_6).toBe(9);
    expect(getEvaluacionSectionIdForStep(8)).toBe("section_5");
    expect(getEvaluacionSectionIdForStep(9)).toBe("section_6");
    expect(INITIAL_EVALUACION_COLLAPSED_SECTIONS).toEqual({
      company: false,
      section_2_1: false,
      section_2_2: false,
      section_2_3: false,
      section_2_4: false,
      section_2_5: false,
      section_2_6: false,
      section_3: false,
      section_4: false,
      section_5: false,
      section_6: false,
      section_7: false,
      section_8: false,
    });
  });

  it("defines the grouped navigation contract for section 2", () => {
    expect(EVALUACION_NAV_ITEMS).toEqual(
      expect.arrayContaining([
      expect.objectContaining({
        type: "section",
        id: "company",
      }),
      expect.objectContaining({
        type: "group",
        id: EVALUACION_NAV_SECTION_2_GROUP_ID,
        label: "Sección 2",
        shortLabel: "2",
        children: [
          "section_2_1",
          "section_2_2",
          "section_2_3",
          "section_2_4",
          "section_2_5",
          "section_2_6",
        ],
      }),
      expect.objectContaining({
        type: "section",
        id: "section_3",
      }),
      expect.objectContaining({
        type: "section",
        id: "section_8",
      }),
      ])
    );
  });

  it("computes completeness for question sections and section 4", () => {
    const filledSections = Object.fromEntries(
      EVALUACION_QUESTION_SECTION_IDS.map((sectionId) => [
        sectionId,
        Object.fromEntries(
          EVALUACION_QUESTION_DESCRIPTORS.filter(
            (question) => question.sectionId === sectionId
          ).map((question) => [
            question.id,
            Object.fromEntries(
              question.fields.map((field) => [
                field.key,
                field.options[0] ?? `${question.id}:${field.key}`,
              ])
            ),
          ])
        ),
      ])
    ) as Parameters<typeof areEvaluacionQuestionSectionsComplete>[0];

    expect(
      isEvaluacionQuestionSectionComplete(
        "section_2_1",
        filledSections.section_2_1
      )
    ).toBe(true);
    expect(areEvaluacionQuestionSectionsComplete(filledSections)).toBe(true);
    filledSections.section_2_1.transporte_publico.observaciones = "";
    expect(
      isEvaluacionQuestionSectionComplete(
        "section_2_1",
        filledSections.section_2_1
      )
    ).toBe(false);
    expect(
      isEvaluacionSection4Complete({
        nivel_accesibilidad: "Medio",
        descripcion: "Descripcion derivada",
        questionSectionsComplete: true,
      })
    ).toBe(true);
    expect(
      isEvaluacionSection4Complete({
        nivel_accesibilidad: "Medio",
        descripcion: "Descripcion derivada",
        questionSectionsComplete: false,
      })
    ).toBe(false);
    expect(
      isEvaluacionSection4Complete({
        nivel_accesibilidad: "Medio",
        nivelSugeridoAccesibilidad: "Bajo",
        descripcion: "Descripcion derivada",
        questionSectionsComplete: true,
      })
    ).toBe(false);
    expect(
      isEvaluacionSection4Complete({
        nivel_accesibilidad: "Medio",
        nivelSugeridoAccesibilidad: "Bajo",
        justificacion_nivel_accesibilidad: "El contexto operativo lo soporta.",
        descripcion: "Descripcion derivada",
        questionSectionsComplete: true,
      })
    ).toBe(true);
  });

  it("computes completeness for section 5 from the apply decision and the free-text nota of each item", () => {
    const filled = { aplica: "Aplica", nota: "Nota libre" };
    const filledNoAplica = { aplica: "No aplica", nota: "Nota libre" };

    expect(
      isEvaluacionSection5Complete({
        discapacidad_fisica: filled,
        discapacidad_fisica_usr: filledNoAplica,
        discapacidad_auditiva: filled,
        discapacidad_visual: filledNoAplica,
        discapacidad_intelectual: filled,
        trastorno_espectro_autista: filledNoAplica,
        discapacidad_psicosocial: filled,
        discapacidad_visual_baja_vision: filledNoAplica,
        discapacidad_auditiva_reducida: filled,
      })
    ).toBe(true);

    // Solo `aplica` ya no alcanza: la nota libre del profesional tambien
    // cuenta para considerar la fila completa.
    expect(
      isEvaluacionSection5Complete({
        discapacidad_fisica: { aplica: "Aplica" },
      })
    ).toBe(false);
    expect(
      isEvaluacionSection5Complete({
        discapacidad_fisica: { aplica: "Aplica", nota: "" },
      })
    ).toBe(false);
  });
});
