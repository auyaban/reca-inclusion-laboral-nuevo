import { describe, expect, it } from "vitest";
import {
  applyPresentacionInitialPrewarmSeed,
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

  it("expands initial attendees from the early prewarm estimate", () => {
    const values = applyPresentacionInitialPrewarmSeed(
      getDefaultPresentacionValues(createEmpresa()),
      {
        tipo_visita: "PresentaciÃ³n",
        prewarm_asistentes_estimados: 5,
      }
    );

    expect(values.asistentes).toEqual([
      { nombre: "Profesional RECA", cargo: "" },
      { nombre: "", cargo: "" },
      { nombre: "", cargo: "" },
      { nombre: "", cargo: "" },
      { nombre: "", cargo: "Asesor Agencia" },
    ]);
  });

  it("expands restored attendees when the canonical draft has a higher estimate", () => {
    const values = normalizePresentacionValues(
      {
        prewarm_asistentes_estimados: 5,
        asistentes: [
          { nombre: "Profesional RECA", cargo: "Profesional RECA" },
          { nombre: "", cargo: "Asesor Agencia" },
        ],
      },
      createEmpresa()
    );

    expect(values.asistentes).toHaveLength(5);
    expect(values.asistentes[values.asistentes.length - 1]).toEqual({
      nombre: "",
      cargo: "Asesor Agencia",
    });
  });

  it("keeps actual attendee rows when they exceed the early prewarm estimate", () => {
    const values = normalizePresentacionValues(
      {
        prewarm_asistentes_estimados: 3,
        asistentes: Array.from({ length: 6 }, (_, index) => ({
          nombre: `Asistente ${index + 1}`,
          cargo: index === 5 ? "Asesor Agencia" : "Cargo",
        })),
      },
      createEmpresa()
    );

    expect(values.asistentes).toHaveLength(6);
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

  it("requires blank estimated attendee rows to be completed or removed before finalizing", () => {
    const result = presentacionSchema.safeParse({
      ...getDefaultPresentacionValues(createEmpresa()),
      fecha_visita: "2026-04-24",
      modalidad: "Presencial",
      motivacion: ["Responsabilidad Social Empresarial"],
      acuerdos_observaciones: "Observaciones validas",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "Asistente real", cargo: "Talento humano" },
        { nombre: "", cargo: "" },
        { nombre: "", cargo: "" },
        { nombre: "Asesor Agencia", cargo: "Asesor Agencia" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Completa esta fila o eliminala antes de finalizar.",
          path: ["asistentes", 2, "nombre"],
        }),
        expect.objectContaining({
          message: "Completa esta fila o eliminala antes de finalizar.",
          path: ["asistentes", 3, "nombre"],
        }),
      ])
    );
  });

  it("accepts an overestimated attendee list after unused rows are removed", () => {
    const result = presentacionSchema.safeParse({
      ...getDefaultPresentacionValues(createEmpresa()),
      prewarm_asistentes_estimados: 5,
      fecha_visita: "2026-04-24",
      modalidad: "Presencial",
      motivacion: ["Responsabilidad Social Empresarial"],
      acuerdos_observaciones: "Observaciones validas",
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "Asistente real", cargo: "Talento humano" },
        { nombre: "Asesor Agencia", cargo: "Asesor Agencia" },
      ],
    });

    expect(result.success).toBe(true);
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
