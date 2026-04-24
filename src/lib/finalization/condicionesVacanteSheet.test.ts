import { describe, expect, it } from "vitest";
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import {
  buildCondicionesVacanteSheetMutation,
  CONDICIONES_VACANTE_SHEET_NAME,
} from "@/lib/finalization/condicionesVacanteSheet";

describe("buildCondicionesVacanteSheetMutation", () => {
  it("writes the company advisor to section 1 cell F13", () => {
    const mutation = buildCondicionesVacanteSheetMutation({
      section1Data: {
        fecha_visita: "2026-04-22",
        modalidad: "Presencial",
        nombre_empresa: "ACME SAS",
        ciudad_empresa: "Bogota",
        direccion_empresa: "Calle 1",
        nit_empresa: "900123456",
        correo_1: "contacto@acme.com",
        telefono_empresa: "3000000000",
        contacto_empresa: "Laura Gomez",
        cargo: "Gerente",
        caja_compensacion: "Compensar",
        sede_empresa: "Principal",
        asesor: "Carlos Ruiz",
        profesional_asignado: "Marta Ruiz",
        correo_profesional: "marta@reca.com",
        correo_asesor: "carlos@reca.com",
      },
      formData: normalizeCondicionesVacanteValues({}),
      asistentes: [
        { nombre: "Ana Perez", cargo: "Profesional RECA" },
        { nombre: "Luis Gomez", cargo: "Asesor Agencia" },
      ],
    });

    expect(mutation.writes).toEqual(
      expect.arrayContaining([
        {
          range: `'${CONDICIONES_VACANTE_SHEET_NAME}'!F13`,
          value: "Carlos Ruiz",
        },
      ])
    );
  });
});
