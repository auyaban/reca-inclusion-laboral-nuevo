import { describe, expect, it } from "vitest";
import {
  getPresentacionCompatStepForSection,
  getPresentacionSectionIdForStep,
  isPresentacionAgreementsSectionComplete,
  isPresentacionAttendeesSectionComplete,
  isPresentacionMotivationSectionComplete,
  isPresentacionVisitSectionComplete,
} from "@/lib/presentacionSections";

describe("presentacion sections helpers", () => {
  it("maps compat step ids to section ids and falls back to visit", () => {
    expect(getPresentacionSectionIdForStep(0)).toBe("visit");
    expect(getPresentacionSectionIdForStep(1)).toBe("motivation");
    expect(getPresentacionSectionIdForStep(2)).toBe("agreements");
    expect(getPresentacionSectionIdForStep(3)).toBe("attendees");
    expect(getPresentacionSectionIdForStep(99)).toBe("visit");
  });

  it("maps content sections back to compat step ids", () => {
    expect(getPresentacionCompatStepForSection("visit")).toBe(0);
    expect(getPresentacionCompatStepForSection("motivation")).toBe(1);
    expect(getPresentacionCompatStepForSection("agreements")).toBe(2);
    expect(getPresentacionCompatStepForSection("attendees")).toBe(3);
  });

  it("marks visit complete only when all required fields are present", () => {
    expect(
      isPresentacionVisitSectionComplete({
        tipo_visita: "Presentación",
        fecha_visita: "2026-04-14",
        modalidad: "Presencial",
        nit_empresa: "9001",
      })
    ).toBe(true);

    expect(
      isPresentacionVisitSectionComplete({
        tipo_visita: "Presentación",
        fecha_visita: "2026-04-14",
        modalidad: "Presencial",
        nit_empresa: " ",
      })
    ).toBe(false);
  });

  it("marks motivation and agreements complete only with meaningful content", () => {
    expect(
      isPresentacionMotivationSectionComplete({
        motivacion: ["Responsabilidad Social Empresarial"],
      })
    ).toBe(true);
    expect(
      isPresentacionMotivationSectionComplete({
        motivacion: [],
      })
    ).toBe(false);

    expect(
      isPresentacionAgreementsSectionComplete({
        acuerdos_observaciones: "Compromisos definidos",
      })
    ).toBe(true);
    expect(
      isPresentacionAgreementsSectionComplete({
        acuerdos_observaciones: "   ",
      })
    ).toBe(false);
  });

  it("marks attendees complete only when at least two named rows exist", () => {
    expect(
      isPresentacionAttendeesSectionComplete({
        asistentes: [
          { nombre: "Profesional RECA", cargo: "Profesional" },
          { nombre: "Asesor", cargo: "Asesor Agencia" },
        ],
        failed_visit_applied_at: null,
      })
    ).toBe(true);

    expect(
      isPresentacionAttendeesSectionComplete({
        asistentes: [
          { nombre: "Profesional RECA", cargo: "Profesional" },
          { nombre: "", cargo: "Asesor Agencia" },
        ],
        failed_visit_applied_at: null,
      })
    ).toBe(false);
  });

  it("accepts a single meaningful attendee when failed visit keeps the advisor row blank", () => {
    expect(
      isPresentacionAttendeesSectionComplete({
        asistentes: [
          { nombre: "Profesional RECA", cargo: "Profesional" },
          { nombre: "", cargo: "Asesor Agencia" },
        ],
        failed_visit_applied_at: "2026-04-24T12:00:00.000Z",
      })
    ).toBe(true);
  });
});
