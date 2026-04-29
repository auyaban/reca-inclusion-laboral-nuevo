import { describe, it, expect } from "vitest";
import { classifyDocument, DOCUMENT_KINDS, getDocumentKindLabel, isOdsCandidate } from "./documentClassifier";

describe("classifyDocument", () => {
  it("classifies interpreter_service", () => {
    const result = classifyDocument({ filename: "Servicio Interprete LSC - Empresa XYZ.pdf" });
    expect(result.document_kind).toBe("interpreter_service");
    expect(result.is_ods_candidate).toBe(true);
  });

  it("classifies interpreter_service with 'interprete' token", () => {
    const result = classifyDocument({ filename: "Acta interprete virtual.pdf" });
    expect(result.document_kind).toBe("interpreter_service");
  });

  it("classifies attendance_support", () => {
    const result = classifyDocument({ filename: "Control de Asistencia - Marzo 2026.pdf" });
    expect(result.document_kind).toBe("attendance_support");
    expect(result.is_ods_candidate).toBe(false);
  });

  it("classifies vacancy_review with 'levantamiento del perfil'", () => {
    const result = classifyDocument({ filename: "Levantamiento del perfil - Empresa ABC.pdf" });
    expect(result.document_kind).toBe("vacancy_review");
  });

  it("classifies vacancy_review with 'condiciones de la vacante'", () => {
    const result = classifyDocument({ filename: "Condiciones de la vacante - Tech Corp.pdf" });
    expect(result.document_kind).toBe("vacancy_review");
  });

  it("classifies program_presentation", () => {
    const result = classifyDocument({ filename: "Presentacion del Programa IL.pdf" });
    expect(result.document_kind).toBe("program_presentation");
  });

  it("classifies accessibility_assessment", () => {
    const result = classifyDocument({ filename: "Evaluacion de Accesibilidad - Sede Norte.pdf" });
    expect(result.document_kind).toBe("accessibility_assessment");
  });

  it("classifies program_reactivation", () => {
    const result = classifyDocument({ filename: "Reactivacion del Programa IL.pdf" });
    expect(result.document_kind).toBe("program_reactivation");
  });

  it("classifies follow_up", () => {
    const result = classifyDocument({ filename: "Seguimiento No. 3 - Empresa XYZ.pdf" });
    expect(result.document_kind).toBe("follow_up");
  });

  it("classifies sensibilizacion", () => {
    const result = classifyDocument({ filename: "Sensibilizacion IL - Compensar.pdf" });
    expect(result.document_kind).toBe("sensibilizacion");
  });

  it("classifies inclusive_selection", () => {
    const result = classifyDocument({ filename: "Seleccion Incluyente - Proceso grupal.pdf" });
    expect(result.document_kind).toBe("inclusive_selection");
  });

  it("classifies inclusive_hiring", () => {
    const result = classifyDocument({ filename: "Contratacion Incluyente - Vinculacion.pdf" });
    expect(result.document_kind).toBe("inclusive_hiring");
  });

  it("classifies operational_induction", () => {
    const result = classifyDocument({ filename: "Induccion Operativa - Nuevo vinculado.pdf" });
    expect(result.document_kind).toBe("operational_induction");
  });

  it("classifies organizational_induction", () => {
    const result = classifyDocument({ filename: "Induccion Organizacional - Onboarding.pdf" });
    expect(result.document_kind).toBe("organizational_induction");
  });

  it("returns process_match when process_hint and score >= 0.5", () => {
    const result = classifyDocument({ filename: "unknown_file.pdf", process_hint: "seleccion_incluyente", process_score: 0.7 });
    expect(result.document_kind).toBe("process_match");
    expect(result.is_ods_candidate).toBe(true);
  });

  it("returns needs_review when no match and no process_hint", () => {
    const result = classifyDocument({ filename: "random_document.pdf" });
    expect(result.document_kind).toBe("needs_review");
    expect(result.is_ods_candidate).toBe(false);
    expect(result.classification_score).toBe(0);
  });

  it("returns needs_review when process_hint but score < 0.5", () => {
    const result = classifyDocument({ filename: "unknown.pdf", process_hint: "algo", process_score: 0.3 });
    expect(result.document_kind).toBe("needs_review");
  });

  it("uses subject for classification", () => {
    const result = classifyDocument({ filename: "acta.pdf", subject: "Servicio Interprete LSC" });
    expect(result.document_kind).toBe("interpreter_service");
  });
});

describe("getDocumentKindLabel", () => {
  it("returns correct label for each kind", () => {
    for (const kind of DOCUMENT_KINDS) {
      const label = getDocumentKindLabel(kind);
      expect(label).toBeTruthy();
      expect(typeof label).toBe("string");
    }
  });
});

describe("isOdsCandidate", () => {
  it("returns true for interpreter_service", () => {
    expect(isOdsCandidate("interpreter_service")).toBe(true);
  });

  it("returns false for attendance_support", () => {
    expect(isOdsCandidate("attendance_support")).toBe(false);
  });

  it("returns false for needs_review", () => {
    expect(isOdsCandidate("needs_review")).toBe(false);
  });

  it("returns true for follow_up", () => {
    expect(isOdsCandidate("follow_up")).toBe(true);
  });
});
