import { describe, expect, it } from "vitest";
import {
  getDefaultSensibilizacionValues,
  normalizeSensibilizacionValues,
} from "@/lib/sensibilizacion";

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

describe("sensibilizacion helpers", () => {
  it("builds defaults with empresa metadata baked in", () => {
    const values = getDefaultSensibilizacionValues(createEmpresa());

    expect(values.nit_empresa).toBe("9001");
    expect(values.asistentes).toEqual([
      { nombre: "Profesional RECA", cargo: "" },
      { nombre: "", cargo: "Asesor Agencia" },
    ]);
  });

  it("merges restored values over stable defaults", () => {
    const values = normalizeSensibilizacionValues(
      {
        modalidad: "Virtual",
        observaciones: "Seguimiento de compromisos.",
        asistentes: [{ nombre: "Invitado", cargo: "Talento humano" }],
      },
      createEmpresa()
    );

    expect(values.fecha_visita).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(values.modalidad).toBe("Virtual");
    expect(values.nit_empresa).toBe("9001");
    expect(values.observaciones).toBe("Seguimiento de compromisos.");
    expect(values.asistentes).toEqual([
      { nombre: "Invitado", cargo: "Talento humano" },
      { nombre: "", cargo: "Asesor Agencia" },
    ]);
  });

  it("falls back to defaults when restored payload is incomplete", () => {
    const values = normalizeSensibilizacionValues(
      {
        modalidad: "Invalida",
        asistentes: [],
      },
      createEmpresa()
    );

    expect(values.modalidad).toBe("Presencial");
    expect(values.nit_empresa).toBe("9001");
    expect(values.asistentes[0]).toEqual({
      nombre: "Profesional RECA",
      cargo: "",
    });
  });
});
