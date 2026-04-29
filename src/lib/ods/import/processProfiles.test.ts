import { describe, it, expect } from "vitest";
import { getProcessProfile, getProfilePriorityLabels, buildProfilePromptContext, buildDetailedExtractionInstructions, clearProfilesCache } from "./processProfiles";

describe("getProcessProfile", () => {
  it("returns profile for program_presentation", () => {
    const profile = getProcessProfile("program_presentation");
    expect(profile).not.toBeNull();
    expect(profile?.document_kind).toBe("program_presentation");
    expect(profile?.keep_sections).toContain("DATOS_GENERALES");
  });

  it("returns profile for program_reactivation", () => {
    const profile = getProcessProfile("program_reactivation");
    expect(profile).not.toBeNull();
    expect(profile?.code).toBe("RE-IL-01-4.2");
  });

  it("returns profile for accessibility_assessment", () => {
    const profile = getProcessProfile("accessibility_assessment");
    expect(profile).not.toBeNull();
    expect(profile?.keep_sections).toContain("DATOS_EMPRESA");
  });

  it("returns profile for vacancy_review", () => {
    const profile = getProcessProfile("vacancy_review");
    expect(profile).not.toBeNull();
    expect(profile?.forbid_fields).toContain("numero_seguimiento");
  });

  it("returns profile for inclusive_selection", () => {
    const profile = getProcessProfile("inclusive_selection");
    expect(profile).not.toBeNull();
    expect(profile?.forbid_fields).toContain("numero_seguimiento");
  });

  it("returns profile for inclusive_hiring", () => {
    const profile = getProcessProfile("inclusive_hiring");
    expect(profile).not.toBeNull();
    expect(profile?.keep_sections).toContain("DATOS_VINCULADO");
  });

  it("returns profile for organizational_induction", () => {
    const profile = getProcessProfile("organizational_induction");
    expect(profile).not.toBeNull();
    expect(profile?.code).toBe("IO-IL");
  });

  it("returns profile for operational_induction", () => {
    const profile = getProcessProfile("operational_induction");
    expect(profile).not.toBeNull();
    expect(profile?.code).toBe("IOP-IL");
  });

  it("returns profile for sensibilizacion", () => {
    const profile = getProcessProfile("sensibilizacion");
    expect(profile).not.toBeNull();
    expect(profile?.code).toBe("SEN-IL");
  });

  it("returns profile for follow_up", () => {
    const profile = getProcessProfile("follow_up");
    expect(profile).not.toBeNull();
    expect(profile?.keep_sections).toContain("FECHAS_SEGUIMIENTO");
  });

  it("returns profile for interpreter_service", () => {
    const profile = getProcessProfile("interpreter_service");
    expect(profile).not.toBeNull();
    expect(profile?.keep_sections).toContain("INTERPRETE");
  });

  it("returns null for unknown kind", () => {
    const profile = getProcessProfile("unknown_kind");
    expect(profile).toBeNull();
  });

  it("returns null for empty string", () => {
    const profile = getProcessProfile("");
    expect(profile).toBeNull();
  });
});

describe("getProfilePriorityLabels", () => {
  it("returns labels for vacancy_review", () => {
    const labels = getProfilePriorityLabels("vacancy_review");
    expect(labels.length).toBeGreaterThan(0);
    expect(labels).toContain("Nombre de la vacante");
  });

  it("returns labels for inclusive_selection", () => {
    const labels = getProfilePriorityLabels("inclusive_selection");
    expect(labels).toContain("Cargo");
  });

  it("returns empty for unknown kind", () => {
    const labels = getProfilePriorityLabels("unknown");
    expect(labels).toEqual([]);
  });
});

describe("buildProfilePromptContext", () => {
  it("returns context for vacancy_review", () => {
    const context = buildProfilePromptContext("vacancy_review");
    expect(context).toContain("document_kind_profile: vacancy_review");
    expect(context).toContain("usar_solo_secciones");
  });

  it("returns empty for unknown kind", () => {
    const context = buildProfilePromptContext("unknown");
    expect(context).toBe("");
  });
});

describe("buildDetailedExtractionInstructions", () => {
  it("returns instructions for vacancy_review", () => {
    const instructions = buildDetailedExtractionInstructions("vacancy_review");
    expect(instructions).toContain("guia_extraccion_especifica");
    expect(instructions).toContain("Revision de condiciones de la vacante");
    expect(instructions).toContain("reglas_duras");
  });

  it("returns instructions for inclusive_selection", () => {
    const instructions = buildDetailedExtractionInstructions("inclusive_selection");
    expect(instructions).toContain("Proceso de seleccion incluyente");
  });

  it("returns instructions for inclusive_hiring", () => {
    const instructions = buildDetailedExtractionInstructions("inclusive_hiring");
    expect(instructions).toContain("Proceso de contratacion incluyente");
  });

  it("returns instructions for follow_up", () => {
    const instructions = buildDetailedExtractionInstructions("follow_up");
    expect(instructions).toContain("Seguimiento al proceso IL");
  });

  it("returns instructions for interpreter_service", () => {
    const instructions = buildDetailedExtractionInstructions("interpreter_service");
    expect(instructions).toContain("Servicio interprete LSC");
  });

  it("returns empty for unknown kind", () => {
    const instructions = buildDetailedExtractionInstructions("unknown");
    expect(instructions).toBe("");
  });
});

describe("clearProfilesCache", () => {
  it("clears the cache", () => {
    getProcessProfile("vacancy_review");
    clearProfilesCache();
    const profile = getProcessProfile("vacancy_review");
    expect(profile).not.toBeNull();
  });
});
