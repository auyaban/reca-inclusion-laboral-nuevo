import { describe, expect, it } from "vitest";
import {
  getSensibilizacionCompatStepForSection,
  getSensibilizacionSectionIdForStep,
  isSensibilizacionAttendeesSectionComplete,
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
});
