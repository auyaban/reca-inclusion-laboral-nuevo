import { describe, expect, it } from "vitest";
import {
  appendSeleccionAdjustmentHelper,
  appendSeleccionAdjustmentStatements,
  getSeleccionAdjustmentStatementsByIds,
  getSeleccionAdjustmentStatementsByHelperId,
  getSeleccionDisabilityProfilesForValue,
  getSeleccionDisabilityProfilesFromRows,
  getSuggestedSeleccionAdjustmentStatementsByProfiles,
  getUniversalSeleccionAdjustmentStatements,
  groupSeleccionHelpersByCategory,
} from "@/lib/seleccionAdjustmentLibrary";

describe("seleccionAdjustmentLibrary", () => {
  it("groups legacy helpers by visible category", () => {
    const groups = groupSeleccionHelpersByCategory();

    expect(groups.map((group) => group.category.id)).toEqual([
      "base_process",
      "respectful_treatment",
      "interview_accessibility",
      "document_accessibility",
      "selection_tests",
      "family_context",
    ]);
  });

  it("maps selected disabilities to normalized profiles", () => {
    const profiles = getSeleccionDisabilityProfilesFromRows([
      {
        discapacidad: "Discapacidad auditiva",
      },
      {
        discapacidad: "Discapacidad visual baja vision",
      },
      {
        discapacidad: "No aplica",
      },
    ]);

    expect(profiles).toEqual(["auditiva", "visual"]);
  });

  it("detects autismo and disability values with accents", () => {
    expect(getSeleccionDisabilityProfilesForValue("Autismo")).toEqual([
      "autismo",
    ]);
    expect(getSeleccionDisabilityProfilesForValue("Física")).toEqual([
      "fisica",
    ]);
    expect(getSeleccionDisabilityProfilesForValue("Múltiple")).toEqual([
      "multiple",
    ]);
  });

  it("returns disability-specific suggestions without duplicating universals", () => {
    const suggested = getSuggestedSeleccionAdjustmentStatementsByProfiles([
      "auditiva",
    ]);

    expect(suggested.map((statement) => statement.id)).toContain(
      "professional_sign_interpreter"
    );
    expect(suggested.map((statement) => statement.id)).not.toContain(
      "avoid_stigma"
    );
  });

  it("dedupes helper content when the same helper is applied twice", () => {
    const firstInsert = appendSeleccionAdjustmentHelper(
      "",
      "preparacion_proceso"
    );
    const secondInsert = appendSeleccionAdjustmentHelper(
      firstInsert,
      "preparacion_proceso"
    );

    expect(secondInsert).toBe(firstInsert);
  });

  it("dedupes a single statement already included by a helper block", () => {
    const helperBlock = appendSeleccionAdjustmentHelper(
      "",
      "pruebas_seleccion"
    );
    const nextValue = appendSeleccionAdjustmentStatements(helperBlock, [
      "professional_sign_interpreter",
    ]);

    expect(nextValue).toBe(helperBlock);
  });

  it("exposes universal statements as the shared recommendation baseline", () => {
    const universals = getUniversalSeleccionAdjustmentStatements();

    expect(universals.length).toBeGreaterThan(0);
    expect(
      universals.every((statement) => statement.isUniversal === true)
    ).toBe(true);
  });

  it("keeps helper blocks aligned with the canonical statement library", () => {
    const helperStatements =
      getSeleccionAdjustmentStatementsByHelperId("accesibilidad_entrevista");

    expect(helperStatements.map((statement) => statement.id)).toEqual([
      "accessible_interview_space",
      "alternative_communication",
      "extra_processing_time",
      "flexible_interview_format",
      "clear_direct_questions",
      "clear_constructive_feedback",
      "comprehension_check_questions",
    ]);
  });

  it("keeps family boundaries outside of selection tests helper", () => {
    const selectionTestStatements =
      getSeleccionAdjustmentStatementsByHelperId("pruebas_seleccion");
    const familyContextStatements =
      getSeleccionAdjustmentStatementsByHelperId("familia_contexto");

    expect(selectionTestStatements.map((statement) => statement.id)).not.toContain(
      "family_boundaries"
    );
    expect(familyContextStatements.map((statement) => statement.id)).toEqual([
      "family_boundaries",
    ]);
    expect(
      getSeleccionAdjustmentStatementsByIds(["family_boundaries"])[0]?.categoryId
    ).toBe("family_context");
  });
});
