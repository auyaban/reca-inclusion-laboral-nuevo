import { describe, expect, it } from "vitest";

import { normalizeInterpreteLscValues } from "@/lib/interpreteLsc";
import {
  isInterpreteLscAttendeesSectionComplete,
  isInterpreteLscCompanySectionComplete,
  isInterpreteLscInterpretersSectionComplete,
  isInterpreteLscParticipantsSectionComplete,
} from "@/lib/interpreteLscSections";

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

function createBaseValues() {
  return normalizeInterpreteLscValues(
    {
      fecha_visita: "2026-04-22",
      modalidad_interprete: "Presencial",
      modalidad_profesional_reca: "Virtual",
      nit_empresa: "9001",
      oferentes: [
        {
          nombre_oferente: "Ana Perez",
          cedula: "123",
          proceso: "Vinculacion",
        },
      ],
      interpretes: [
        {
          nombre: "Luis Mora",
          hora_inicial: "9",
          hora_final: "10:30",
        },
      ],
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "Invitado", cargo: "Talento humano" },
      ],
    },
    createEmpresa()
  );
}

describe("interpreteLsc sections", () => {
  it("marks the company section complete only when required company fields exist", () => {
    expect(isInterpreteLscCompanySectionComplete(createBaseValues())).toBe(true);
    expect(
      isInterpreteLscCompanySectionComplete({
        ...createBaseValues(),
        nit_empresa: "",
      })
    ).toBe(false);
  });

  it("treats participants as incomplete when the meaningful row is partial", () => {
    expect(
      isInterpreteLscParticipantsSectionComplete({
        ...createBaseValues(),
        oferentes: [{ nombre_oferente: "Ana Perez", cedula: "", proceso: "" }],
      })
    ).toBe(false);
  });

  it("marks interpreters complete when normalized rows already carry calculated totals", () => {
    expect(isInterpreteLscInterpretersSectionComplete(createBaseValues())).toBe(
      true
    );
  });

  it("requires two significant complete attendees", () => {
    expect(isInterpreteLscAttendeesSectionComplete(createBaseValues())).toBe(true);
    expect(
      isInterpreteLscAttendeesSectionComplete({
        ...createBaseValues(),
        asistentes: [
          { nombre: "Profesional RECA", cargo: "Profesional RECA" },
          { nombre: "", cargo: "" },
        ],
      })
    ).toBe(false);
  });
});
