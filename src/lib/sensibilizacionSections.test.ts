import { describe, expect, it } from "vitest";
import {
  getSensibilizacionCompatStepForSection,
  getSensibilizacionSectionIdForStep,
  isSensibilizacionAttendeesSectionComplete,
  isSensibilizacionObservationsSectionComplete,
  isSensibilizacionVisitSectionComplete,
} from "@/lib/sensibilizacionSections";
import { getDefaultSensibilizacionValues } from "@/lib/sensibilizacion";

function createEmpresa() {
  return {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno",
    nit_empresa: "9001",
    direccion_empresa: null,
    ciudad_empresa: null,
    sede_empresa: null,
    zona_empresa: null,
    correo_1: null,
    contacto_empresa: null,
    telefono_empresa: null,
    cargo: null,
    profesional_asignado: "Profesional RECA",
    correo_profesional: null,
    asesor: null,
    correo_asesor: null,
    caja_compensacion: null,
  };
}

describe("sensibilizacion section compatibility", () => {
  it("keeps compatibility with legacy wizard steps", () => {
    expect(getSensibilizacionSectionIdForStep(0)).toBe("visit");
    expect(getSensibilizacionSectionIdForStep(2)).toBe("observations");
    expect(getSensibilizacionSectionIdForStep(4)).toBe("attendees");
    expect(getSensibilizacionCompatStepForSection("visit")).toBe(0);
    expect(getSensibilizacionCompatStepForSection("observations")).toBe(2);
    expect(getSensibilizacionCompatStepForSection("attendees")).toBe(4);
  });

  it("does not count empty attendee placeholders as complete", () => {
    const values = getDefaultSensibilizacionValues(createEmpresa());

    expect(isSensibilizacionAttendeesSectionComplete(values)).toBe(false);
  });

  it("requires visit data to mark the visit section as complete", () => {
    expect(
      isSensibilizacionVisitSectionComplete({
        fecha_visita: "2026-04-13",
        modalidad: "Presencial",
        nit_empresa: "9001",
      })
    ).toBe(true);

    expect(
      isSensibilizacionVisitSectionComplete({
        fecha_visita: "2026-04-13",
        modalidad: "",
        nit_empresa: "9001",
      })
    ).toBe(false);
  });

  it("requires observations content to mark the observations section as complete", () => {
    expect(
      isSensibilizacionObservationsSectionComplete({
        observaciones: "Se realizó la jornada con el equipo de talento humano.",
      })
    ).toBe(true);

    expect(
      isSensibilizacionObservationsSectionComplete({
        observaciones: "   ",
      })
    ).toBe(false);
  });

  it("requires complete meaningful attendees to mark the section as complete", () => {
    const values = getDefaultSensibilizacionValues(createEmpresa());
    values.asistentes = [
      { nombre: "Profesional RECA", cargo: "Profesional RECA" },
      { nombre: "", cargo: "" },
      { nombre: "Invitado", cargo: "Talento humano" },
    ];

    expect(isSensibilizacionAttendeesSectionComplete(values)).toBe(true);
  });

  it("fails completion when a meaningful attendee is missing cargo", () => {
    const values = getDefaultSensibilizacionValues(createEmpresa());
    values.asistentes = [
      { nombre: "Profesional RECA", cargo: "Profesional RECA" },
      { nombre: "Invitado", cargo: "" },
      { nombre: "Otro asistente", cargo: "Talento humano" },
    ];

    expect(isSensibilizacionAttendeesSectionComplete(values)).toBe(false);
  });

  it("accepts one complete attendee when the draft was marked as failed visit", () => {
    const values = getDefaultSensibilizacionValues(createEmpresa());
    values.failed_visit_applied_at = "2026-04-24T12:00:00.000Z";
    values.asistentes = [
      { nombre: "Profesional RECA", cargo: "Profesional RECA" },
      { nombre: "", cargo: "" },
    ];

    expect(isSensibilizacionAttendeesSectionComplete(values)).toBe(true);
  });
});
