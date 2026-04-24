import { describe, expect, it } from "vitest";
import {
  buildInterpreteLscSectionNavItems,
  buildInterpreteLscSectionStatuses,
  isInterpreteLscAttendeesRowsComplete,
  isInterpreteLscCompanyFieldsComplete,
  isInterpreteLscInterpretersRowsComplete,
  isInterpreteLscParticipantsRowsComplete,
} from "@/lib/interpreteLscSections";

describe("interpreteLscSections granular helpers", () => {
  it("evaluates company completion from primitive fields", () => {
    expect(
      isInterpreteLscCompanyFieldsComplete({
        fechaVisita: "2026-04-24",
        modalidadInterprete: "Presencial",
        modalidadProfesionalReca: "Virtual",
        nitEmpresa: "900123456",
      })
    ).toBe(true);

    expect(
      isInterpreteLscCompanyFieldsComplete({
        fechaVisita: "2026-04-24",
        modalidadInterprete: "Presencial",
        modalidadProfesionalReca: "",
        nitEmpresa: "900123456",
      })
    ).toBe(false);
  });

  it("evaluates participants, interpreters and attendees from row slices only", () => {
    expect(
      isInterpreteLscParticipantsRowsComplete([
        {
          nombre_oferente: "Ana",
          cedula: "123",
          proceso: "Ruta A",
        },
      ])
    ).toBe(true);

    expect(
      isInterpreteLscInterpretersRowsComplete([
        {
          nombre: "Luis",
          hora_inicial: "08:00",
          hora_final: "10:00",
          total_tiempo: "2:00",
        },
      ])
    ).toBe(true);

    expect(
      isInterpreteLscAttendeesRowsComplete([
        { nombre: "Profesional RECA", cargo: "Psicologa" },
        { nombre: "Coordinadora", cargo: "Talento humano" },
      ])
    ).toBe(true);

    expect(
      isInterpreteLscParticipantsRowsComplete([
        {
          nombre_oferente: "Ana",
          cedula: "",
          proceso: "Ruta A",
        },
      ])
    ).toBe(false);
  });

  it("builds section statuses and nav items from primitive completion flags", () => {
    const sectionStatuses = buildInterpreteLscSectionStatuses({
      activeSectionId: "interpreters",
      hasEmpresa: true,
      completion: {
        company: true,
        participants: true,
        interpreters: false,
        attendees: false,
      },
      errorSectionId: "attendees",
    });

    expect(sectionStatuses).toEqual({
      company: "completed",
      participants: "completed",
      interpreters: "active",
      attendees: "error",
    });

    expect(buildInterpreteLscSectionNavItems(sectionStatuses)).toEqual([
      {
        id: "company",
        label: "Empresa y servicio",
        shortLabel: "Empresa",
        status: "completed",
      },
      {
        id: "participants",
        label: "Oferentes / vinculados",
        shortLabel: "Oferentes",
        status: "completed",
      },
      {
        id: "interpreters",
        label: "Interpretes y horas",
        shortLabel: "Interpretes",
        status: "active",
      },
      {
        id: "attendees",
        label: "Asistentes",
        shortLabel: "Asistentes",
        status: "error",
      },
    ]);
  });
});
