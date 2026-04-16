import { describe, expect, it } from "vitest";
import {
  getDefaultContratacionValues,
  normalizeContratacionValues,
} from "@/lib/contratacion";
import {
  isContratacionActivitySectionComplete,
  isContratacionAttendeesSectionComplete,
  isContratacionRecommendationsSectionComplete,
  isContratacionVinculadosSectionComplete,
} from "@/lib/contratacionSections";

const EMPRESA = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: null,
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@reca.com",
  caja_compensacion: "Compensar",
} as const;

describe("contratacion section completeness", () => {
  it("requires meaningful vinculados before the activity section can be complete", () => {
    const defaults = getDefaultContratacionValues(EMPRESA);

    expect(isContratacionActivitySectionComplete(defaults)).toBe(false);

    const withRow = normalizeContratacionValues(
      {
        desarrollo_actividad: "Actividad general",
        vinculados: [{ nombre_oferente: "Ana Perez" }],
      },
      EMPRESA
    );

    expect(isContratacionActivitySectionComplete(withRow)).toBe(false);
  });

  it("marks recommendations and attendees according to their own rules", () => {
    expect(
      isContratacionRecommendationsSectionComplete({
        ajustes_recomendaciones: "Ajuste 1",
      })
    ).toBe(true);

    expect(
      isContratacionAttendeesSectionComplete({
        asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      })
    ).toBe(true);
  });

  it("ignores placeholder rows when evaluating vinculados completeness", () => {
    const values = normalizeContratacionValues(
      {
        vinculados: [
          {},
          {
            nombre_oferente: "Ana Perez",
          },
        ],
      },
      EMPRESA
    );

    expect(isContratacionVinculadosSectionComplete(values)).toBe(false);
  });
});
