import { describe, it, expect } from "vitest";
import { suggestServiceFromAnalysis } from "./rulesEngine";
import type { RulesEngineInput, TarifaRow } from "./rulesEngine";

const mockTarifas: TarifaRow[] = [
  { codigo_servicio: "INT-01", referencia_servicio: "REF-INT-01", descripcion_servicio: "Interprete LSC por hora", modalidad_servicio: "Virtual", valor_base: 50000 },
  { codigo_servicio: "INT-02", referencia_servicio: "REF-INT-02", descripcion_servicio: "Interprete LSC 30 minutos", modalidad_servicio: "Presencial", valor_base: 30000 },
  { codigo_servicio: "INT-03", referencia_servicio: "REF-INT-03", descripcion_servicio: "Visita fallida interprete", modalidad_servicio: "Virtual", valor_base: 20000 },
  { codigo_servicio: "VAC-01", referencia_servicio: "REF-VAC-01", descripcion_servicio: "Revision de vacante Virtual", modalidad_servicio: "Virtual", valor_base: 80000 },
  { codigo_servicio: "VAC-02", referencia_servicio: "REF-VAC-02", descripcion_servicio: "Revision de vacante Presencial", modalidad_servicio: "Bogota", valor_base: 100000 },
  { codigo_servicio: "SEN-01", referencia_servicio: "REF-SEN-01", descripcion_servicio: "Sensibilizacion Virtual", modalidad_servicio: "Virtual", valor_base: 60000 },
  { codigo_servicio: "SEN-02", referencia_servicio: "REF-SEN-02", descripcion_servicio: "Sensibilizacion Presencial", modalidad_servicio: "Bogota", valor_base: 80000 },
  { codigo_servicio: "IND-ORG-01", referencia_servicio: "REF-IND-ORG-01", descripcion_servicio: "Induccion organizacional Virtual", modalidad_servicio: "Virtual", valor_base: 70000 },
  { codigo_servicio: "IND-OP-01", referencia_servicio: "REF-IND-OP-01", descripcion_servicio: "Induccion operativa Bogota", modalidad_servicio: "Bogota", valor_base: 90000 },
  { codigo_servicio: "SEL-01", referencia_servicio: "REF-SEL-01", descripcion_servicio: "Seleccion incluyente individual Virtual", modalidad_servicio: "Virtual", valor_base: 120000 },
  { codigo_servicio: "SEL-02", referencia_servicio: "REF-SEL-02", descripcion_servicio: "Seleccion incluyente 2 a 4 Bogota", modalidad_servicio: "Bogota", valor_base: 150000 },
  { codigo_servicio: "CON-01", referencia_servicio: "REF-CON-01", descripcion_servicio: "Contratacion incluyente individual Virtual", modalidad_servicio: "Virtual", valor_base: 130000 },
  { codigo_servicio: "CON-02", referencia_servicio: "REF-CON-02", descripcion_servicio: "Contratacion incluyente 2 a 4 Bogota", modalidad_servicio: "Bogota", valor_base: 160000 },
  { codigo_servicio: "REACT-01", referencia_servicio: "REF-REACT-01", descripcion_servicio: "Reactivacion RECA Virtual", modalidad_servicio: "Virtual", valor_base: 50000 },
  { codigo_servicio: "PROM-01", referencia_servicio: "REF-PROM-01", descripcion_servicio: "Promocion individual RECA Virtual", modalidad_servicio: "Virtual", valor_base: 40000 },
  { codigo_servicio: "SEG-01", referencia_servicio: "REF-SEG-01", descripcion_servicio: "Seguimiento y acompanamiento Virtual", modalidad_servicio: "Virtual", valor_base: 70000 },
  { codigo_servicio: "SEG-02", referencia_servicio: "REF-SEG-02", descripcion_servicio: "Visita adicional seguimiento Virtual", modalidad_servicio: "Virtual", valor_base: 80000 },
  { codigo_servicio: "ACC-01", referencia_servicio: "REF-ACC-01", descripcion_servicio: "Evaluacion de accesibilidad hasta 50 Virtual", modalidad_servicio: "Virtual", valor_base: 110000 },
  { codigo_servicio: "ACC-02", referencia_servicio: "REF-ACC-02", descripcion_servicio: "Evaluacion de accesibilidad hasta 50 Bogota", modalidad_servicio: "Bogota", valor_base: 120000 },
];

function makeInput(overrides: Partial<RulesEngineInput["analysis"]> & { document_kind: string }): RulesEngineInput {
  return {
    analysis: {
      document_kind: overrides.document_kind,
      nit_empresa: overrides.nit_empresa || "",
      modalidad_servicio: overrides.modalidad_servicio || "",
      ...overrides,
    },
    message: { subject: overrides.subject || "" },
    tarifas: mockTarifas,
    companyByNit: () => ({
      nombre_empresa: "Empresa Test",
      nit_empresa: "123456789",
      ciudad_empresa: "Bogota",
      sede_empresa: null,
      zona_empresa: null,
      caja_compensacion: "Compensar",
      correo_profesional: null,
      profesional_asignado: null,
      asesor: null,
    }),
  };
}

describe("suggestServiceFromAnalysis", () => {
  it("returns low confidence for attendance_support", () => {
    const result = suggestServiceFromAnalysis(makeInput({ document_kind: "attendance_support" }));
    expect(result.confidence).toBe("low");
    expect(result.rationale).toContain("El documento fue clasificado como control de asistencia.");
  });

  it("suggests interpreter tarifa from hours", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      sumatoria_horas_interpretes: 1.5,
    }));
    expect(result.codigo_servicio).toBe("INT-01");
    expect(result.confidence).toBe("medium");
  });

  it("suggests interpreter tarifa from legacy lsc_interpretation kind", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "lsc_interpretation",
      modalidad_servicio: "Virtual",
      sumatoria_horas_interpretes: 1.5,
    }));
    expect(result.codigo_servicio).toBe("INT-01");
    expect(result.confidence).toBe("medium");
  });

  it("suggests interpreter tarifa from canonical HH:MM hours", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      sumatoria_horas_interpretes: "1:30",
    }));
    expect(result.codigo_servicio).toBe("INT-01");
    expect(result.confidence).toBe("medium");
  });

  it("suggests interpreter tarifa from legacy sumatoria_horas", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      sumatoria_horas: "4:00",
    }));
    expect(result.codigo_servicio).toBe("INT-01");
    expect(result.confidence).toBe("medium");
  });

  it("suggests interpreter tarifa from legacy sabana hours", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      sabana: { horas: "4:00" },
    }));
    expect(result.codigo_servicio).toBe("INT-01");
    expect(result.confidence).toBe("medium");
  });

  it("prefers canonical interpreter hours over legacy aliases", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      total_horas_interprete: 0.5,
      sumatoria_horas: "4:00",
    }));
    expect(result.codigo_servicio).toBe("INT-02");
  });

  it("falls back to interpreter text when hour alias has invalid shape", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      sumatoria_horas: {},
      subject: "Servicio interprete LSC por hora",
    }));
    expect(result.codigo_servicio).toBe("INT-01");
  });

  it("keeps low fallback for unknown LSC-like document kind", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "lsc_legacy_desconocido",
      modalidad_servicio: "Virtual",
      sumatoria_horas_interpretes: 1.5,
    }));
    expect(result.confidence).toBe("low");
    expect(result.codigo_servicio).toBeUndefined();
  });

  it("suggests visita fallida for interpreter", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      is_fallido: true,
    }));
    expect(result.codigo_servicio).toBe("INT-03");
  });

  it("suggests vacancy review tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "vacancy_review",
      modalidad_servicio: "Virtual",
      nit_empresa: "123456789", // resuelve company → score 3/3 → high
    }));
    expect(result.codigo_servicio).toBe("VAC-01");
    expect(result.confidence).toBe("high");
  });

  it("vacancy review sin empresa resuelta degrada a medium", () => {
    // scoreConfidence: modalidad directa (+1) + participantes proxy 1 (+1) = 2/3 → medium
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "vacancy_review",
      modalidad_servicio: "Virtual",
      // sin nit_empresa → company null
    }));
    expect(result.confidence).toBe("medium");
  });

  it("suggests sensibilizacion tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "sensibilizacion",
      modalidad_servicio: "Virtual",
    }));
    expect(result.codigo_servicio).toBe("SEN-01");
  });

  it("suggests organizational induction tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "organizational_induction",
      modalidad_servicio: "Virtual",
    }));
    expect(result.codigo_servicio).toBe("IND-ORG-01");
  });

  it("suggests operational induction tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "operational_induction",
      modalidad_servicio: "Bogota",
    }));
    expect(result.codigo_servicio).toBe("IND-OP-01");
  });

  it("suggests selection incluyente individual tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "inclusive_selection",
      modalidad_servicio: "Virtual",
      participantes: [],
    }));
    expect(result.codigo_servicio).toBe("SEL-01");
  });

  it("suggests selection incluyente 2-4 tarifa with participants", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "inclusive_selection",
      modalidad_servicio: "Bogota",
      participantes: [{ nombre: "A" }, { nombre: "B" }, { nombre: "C" }],
    }));
    expect(result.codigo_servicio).toBe("SEL-02");
  });

  it("suggests contratacion incluyente tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "inclusive_hiring",
      modalidad_servicio: "Virtual",
      participantes: [],
    }));
    expect(result.codigo_servicio).toBe("CON-01");
  });

  it("suggests contratacion incluyente 2-4 tarifa with participants", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "inclusive_hiring",
      modalidad_servicio: "Bogota",
      participantes: [{ nombre: "A" }, { nombre: "B" }, { nombre: "C" }],
    }));
    expect(result.codigo_servicio).toBe("CON-02");
  });

  it("suggests program reactivation tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "program_reactivation",
      modalidad_servicio: "Virtual",
      gestion_servicio: "RECA",
    }));
    expect(result.codigo_servicio).toBe("REACT-01");
  });

  it("suggests program presentation tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "program_presentation",
      modalidad_servicio: "Virtual",
      gestion_servicio: "RECA",
    }));
    expect(result.codigo_servicio).toBe("PROM-01");
  });

  it("suggests follow_up tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "follow_up",
      modalidad_servicio: "Virtual",
    }));
    expect(result.codigo_servicio).toBe("SEG-01");
  });

  it("suggests visita adicional for special follow_up", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "follow_up",
      modalidad_servicio: "Virtual",
      file_path: "visita adicional seguimiento.pdf",
    }));
    expect(result.codigo_servicio).toBe("SEG-02");
  });

  // Reglas auto-build de comentarios (ports del legacy + extensión LSC)

  it("auto-build observaciones para inclusive_hiring: cargo + vacantes", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "inclusive_hiring",
      modalidad_servicio: "Virtual",
      cargo_objetivo: "Auxiliar de Producción",
      total_vacantes: 5,
    }));
    expect(result.observaciones).toBe("Auxiliar de Producción (5)");
  });

  it("auto-build observaciones para vacancy_review: solo cargo cuando no hay vacantes", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "vacancy_review",
      modalidad_servicio: "Virtual",
      cargo_objetivo: "Asistente administrativo",
    }));
    expect(result.observaciones).toBe("Asistente administrativo");
  });

  it("auto-build seguimiento para follow_up: extrae numero", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "follow_up",
      modalidad_servicio: "Virtual",
      numero_seguimiento: "3",
    }));
    expect(result.seguimiento_servicio).toBe("3");
  });

  it("auto-build seguimiento para follow_up: regex desde file_path", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "follow_up",
      modalidad_servicio: "Virtual",
      file_path: "Seguimiento No. 5 - Empresa.pdf",
    }));
    expect(result.seguimiento_servicio).toBe("5");
  });

  it("auto-build observaciones para interpreter_service (regla 3, no en legacy)", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      nombre_profesional: "Karen Dueñas",
      total_horas_interprete: 1,
    }));
    expect(result.observaciones).toBe("Interprete 1 Karen Dueñas 1 h - Servicio virtual");
  });

  it("auto-build interprete con minutos: 1.5 horas → '1 h 30 mn'", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      nombre_profesional: "Nohora Diaz",
      sumatoria_horas_interpretes: 1.5,
    }));
    expect(result.observaciones).toBe("Interprete 1 Nohora Diaz 1 h 30 mn - Servicio virtual");
  });

  it("auto-build observaciones para legacy lsc_interpretation", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "lsc_interpretation",
      modalidad_servicio: "Virtual",
      nombre_profesional: "Karen Dueñas",
      total_horas_interprete: 1,
    }));
    expect(result.observaciones).toBe("Interprete 1 Karen Dueñas 1 h - Servicio virtual");
  });

  it("auto-build observaciones from legacy sumatoria_horas", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "interpreter_service",
      modalidad_servicio: "Virtual",
      nombre_profesional: "Nohora Diaz",
      sumatoria_horas: "1:30",
    }));
    expect(result.observaciones).toBe("Interprete 1 Nohora Diaz 1 h 30 mn - Servicio virtual");
  });

  it("auto-build observacion_agencia siempre vacio (sin regla auto)", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "inclusive_hiring",
      modalidad_servicio: "Virtual",
      cargo_objetivo: "Algo",
    }));
    expect(result.observacion_agencia).toBe("");
  });

  it("suggests accessibility assessment tarifa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "accessibility_assessment",
      modalidad_servicio: "Virtual",
      tamano_empresa: "hasta 50",
    }));
    expect(result.codigo_servicio).toBe("ACC-01");
  });

  it("suggests accessibility assessment tarifa from legacy evaluacion_accesibilidad kind", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "evaluacion_accesibilidad",
      modalidad_servicio: "Virtual",
      tamano_empresa: "hasta 50",
    }));
    expect(result.codigo_servicio).toBe("ACC-01");
  });

  it("keeps accessibility assessment default size fallback without tamano_empresa", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "evaluacion_accesibilidad",
      modalidad_servicio: "Virtual",
    }));
    expect(result.codigo_servicio).toBe("ACC-01");
    expect(result.confidence).toBe("low");
    expect(result.rationale).toContain("No se detecto tamano de empresa; se aplica valor por defecto hasta 50 trabajadores.");
  });

  it("infers city modality for legacy evaluacion_accesibilidad kind", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "evaluacion_accesibilidad",
      nit_empresa: "123456789",
    }));
    expect(result.codigo_servicio).toBe("ACC-02");
    expect(result.modalidad_servicio).toBe("Bogota");
  });

  it("returns low confidence fallback when no tarifa matches", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "unknown_kind",
      modalidad_servicio: "Virtual",
    }));
    expect(result.confidence).toBe("low");
    expect(result.codigo_servicio).toBeUndefined();
  });

  it("returns fallback with process_hint", () => {
    const result = suggestServiceFromAnalysis(makeInput({
      document_kind: "unknown_kind",
      process_hint: "seleccion_incluyente",
    }));
    expect(result.rationale.some((r) => r.includes("Proceso sugerido"))).toBe(true);
  });
});
