import { describe, expect, it } from "vitest";
import {
  getDefaultSensibilizacionValues,
  normalizeSensibilizacionValues,
} from "@/lib/sensibilizacion";
import {
  SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES,
  sensibilizacionSchema,
} from "@/lib/validations/sensibilizacion";

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
      { nombre: "", cargo: "" },
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
      { nombre: "", cargo: "" },
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

  it("rejects attendee rows that have nombre without cargo", () => {
    const result = sensibilizacionSchema.safeParse({
      ...getDefaultSensibilizacionValues(createEmpresa()),
      observaciones: "Observaciones válidas",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "Invitado", cargo: "" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.asistentes).toContain(
      "El cargo es requerido"
    );
  });

  it("rejects attendee rows that have cargo without nombre", () => {
    const result = sensibilizacionSchema.safeParse({
      ...getDefaultSensibilizacionValues(createEmpresa()),
      observaciones: "Observaciones válidas",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "", cargo: "Talento humano" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.asistentes).toContain(
      "El nombre es requerido"
    );
  });

  it("requires at least two significant attendees", () => {
    const result = sensibilizacionSchema.safeParse({
      ...getDefaultSensibilizacionValues(createEmpresa()),
      observaciones: "Observaciones válidas",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "", cargo: "" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.asistentes).toContain(
      `Agrega al menos ${SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES} asistentes significativos.`
    );
  });

  it("accepts two significant attendees even if there are empty placeholders between them", () => {
    const result = sensibilizacionSchema.safeParse({
      ...getDefaultSensibilizacionValues(createEmpresa()),
      observaciones: "Observaciones válidas",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "", cargo: "" },
        { nombre: "Invitado", cargo: "Talento humano" },
      ],
    });

    expect(result.success).toBe(true);
  });
});
