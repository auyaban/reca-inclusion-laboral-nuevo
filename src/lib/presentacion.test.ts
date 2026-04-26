import { describe, expect, it } from "vitest";
import {
  getDefaultPresentacionValues,
  normalizePresentacionValues,
} from "@/lib/presentacion";
import {
  presentacionSchema,
} from "@/lib/validations/presentacion";

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

    expect(values.fecha_visita).toBe("");
    expect(values.modalidad).toBe("");
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

  it("keeps the advisor row required in normal mode", () => {
    const result = presentacionSchema.safeParse({
      ...getDefaultPresentacionValues(createEmpresa()),
      fecha_visita: "2026-04-24",
      modalidad: "Presencial",
      motivacion: ["Responsabilidad Social Empresarial"],
      acuerdos_observaciones: "Observaciones validas",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "", cargo: "Asesor Agencia" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.asistentes).toContain(
      "El nombre es requerido"
    );
  });

  it("accepts a single meaningful attendee in failed-visit mode while keeping the advisor row blank", () => {
    const result = presentacionSchema.safeParse({
      ...getDefaultPresentacionValues(createEmpresa()),
      fecha_visita: "2026-04-24",
      modalidad: "Presencial",
      failed_visit_applied_at: "2026-04-24T12:00:00.000Z",
      motivacion: ["Responsabilidad Social Empresarial"],
      acuerdos_observaciones: "Observaciones validas",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "", cargo: "Asesor Agencia" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("keeps agreements required even in failed-visit mode", () => {
    const result = presentacionSchema.safeParse({
      ...getDefaultPresentacionValues(createEmpresa()),
      fecha_visita: "2026-04-24",
      modalidad: "Presencial",
      failed_visit_applied_at: "2026-04-24T12:00:00.000Z",
      motivacion: ["Responsabilidad Social Empresarial"],
      acuerdos_observaciones: "",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "", cargo: "Asesor Agencia" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.acuerdos_observaciones).toContain(
      "Los acuerdos y observaciones son requeridos"
    );
    expect(result.error?.flatten().fieldErrors.asistentes ?? []).not.toContain(
      "El nombre es requerido"
    );
  });
});
