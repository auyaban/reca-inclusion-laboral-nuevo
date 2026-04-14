import { describe, expect, it } from "vitest";
import {
  getDefaultPresentacionValues,
  normalizePresentacionValues,
} from "@/lib/presentacion";

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

describe("presentacion helpers", () => {
  it("builds defaults with RECA + advisor rows", () => {
    const values = getDefaultPresentacionValues(createEmpresa());

    expect(values.asistentes).toEqual([
      { nombre: "Profesional RECA", cargo: "" },
      { nombre: "", cargo: "Asesor Agencia" },
    ]);
  });

  it("restores a second advisor row when the payload only contains one attendee", () => {
    const values = normalizePresentacionValues(
      {
        asistentes: [{ nombre: "Invitado", cargo: "Talento humano" }],
      },
      createEmpresa()
    );

    expect(values.asistentes).toEqual([
      { nombre: "Invitado", cargo: "Talento humano" },
      { nombre: "", cargo: "Asesor Agencia" },
    ]);
  });

  it("normalizes the legacy modalidad alias Mixto to the canonical Mixta value", () => {
    const values = normalizePresentacionValues(
      {
        modalidad: "Mixto",
      },
      createEmpresa()
    );

    expect(values.modalidad).toBe("Mixta");
  });
});
