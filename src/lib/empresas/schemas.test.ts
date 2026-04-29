import { describe, expect, it } from "vitest";
import {
  createEmpresaSchema,
  parseEmpresaListParams,
  updateEmpresaSchema,
} from "@/lib/empresas/schemas";

describe("empresa schemas", () => {
  it("normalizes create payloads and applies the default estado", () => {
    const parsed = createEmpresaSchema.parse({
      nombre_empresa: "  ACME SAS  ",
      gestion: "RECA",
      nit_empresa: "",
      profesional_asignado_id: "",
    });

    expect(parsed).toMatchObject({
      nombre_empresa: "Acme Sas",
      gestion: "RECA",
      estado: "En Proceso",
      nit_empresa: null,
      profesional_asignado_id: null,
    });
  });

  it("canonicalizes empresa write payloads before persistence", () => {
    const parsed = createEmpresaSchema.parse({
      nombre_empresa: "  acme   soluciones sas  ",
      nit_empresa: "  900.123.456 - 7  ",
      direccion_empresa: "  calle   80  ",
      ciudad_empresa: "\u200bbogota   norte\u200b",
      sede_empresa: " sede   principal ",
      zona_empresa: " universidad   compensar ",
      contacto_empresa: "  laura   perez  ",
      cargo: " lider   talento humano ",
      responsable_visita: "  sandra   pachon ",
      asesor: "  asesor   compensar ",
      correo_asesor: " ASESOR@COMPENSAR.COM ",
      gestion: "reca",
      estado: " activa ",
      caja_compensacion: " no compensar ",
    });

    expect(parsed).toMatchObject({
      nombre_empresa: "Acme Soluciones Sas",
      nit_empresa: "900123456-7",
      direccion_empresa: "Calle 80",
      ciudad_empresa: "Bogota Norte",
      sede_empresa: "Sede Principal",
      zona_empresa: "Universidad Compensar",
      contacto_empresa: "Laura Perez",
      cargo: "Lider Talento Humano",
      responsable_visita: "Sandra Pachon",
      asesor: "Asesor Compensar",
      correo_asesor: "ASESOR@COMPENSAR.COM",
      gestion: "RECA",
      estado: "Activa",
      caja_compensacion: "No Compensar",
    });
  });

  it("rejects nit values with letters or unsupported symbols", () => {
    const parsed = createEmpresaSchema.safeParse({
      nombre_empresa: "ACME SAS",
      gestion: "RECA",
      nit_empresa: "900-ABC",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.nit_empresa).toContain(
        "El NIT solo puede contener números y un guion."
      );
    }
  });

  it("rejects unknown catalog values instead of inventing a canonical value", () => {
    const parsed = createEmpresaSchema.safeParse({
      nombre_empresa: "ACME SAS",
      gestion: "RECA",
      estado: "SENA",
      caja_compensacion: "Caja desconocida",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.estado).toContain(
        "Selecciona un estado válido."
      );
      expect(parsed.error.flatten().fieldErrors.caja_compensacion).toContain(
        "Selecciona una caja de compensación válida."
      );
    }
  });

  it("validates semicolon contact emails and aligned additional contact names", () => {
    const parsed = createEmpresaSchema.safeParse({
      nombre_empresa: "ACME SAS",
      gestion: "RECA",
      estado: "En Proceso",
      contacto_empresa: "Sandra Pachon;",
      cargo: "Gerente;Analista",
      telefono_empresa: "300;",
      correo_1: "sandra@reca.co;correo-invalido",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.correo_1).toContain(
        "Ingresa correos de contacto válidos."
      );
      expect(parsed.error.flatten().fieldErrors.contacto_empresa).toContain(
        "Cada contacto adicional debe tener nombre."
      );
    }
  });

  it("requires a comment when estado changes", () => {
    const result = updateEmpresaSchema.safeParse({
      nombre_empresa: "ACME SAS",
      gestion: "RECA",
      estado: "Cerrada",
      previous_estado: "Activa",
      comentario: " ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.comentario).toContain(
        "El comentario es obligatorio cuando cambia el estado."
      );
    }
  });

  it("clamps list pagination and ignores unsupported sort fields", () => {
    const parsed = parseEmpresaListParams(
      new URLSearchParams({
        page: "-10",
        pageSize: "999",
        sort: "drop table",
        direction: "sideways",
        q: "  acme  ",
      })
    );

    expect(parsed).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 100,
        sort: "updated_at",
        direction: "desc",
        q: "acme",
      })
    );
  });
});
