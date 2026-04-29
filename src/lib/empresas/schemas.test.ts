import { describe, expect, it } from "vitest";
import {
  createEmpresaSchema,
  parseEmpresaListParams,
  updateEmpresaSchema,
} from "@/lib/empresas/schemas";

describe("empresa schemas", () => {
  it("normalizes create payloads before persistence", () => {
    const parsed = createEmpresaSchema.parse({
      nombre_empresa: "  ACME SAS  ",
      gestion: "RECA",
      nit_empresa: "900 123",
      direccion_empresa: "calle 80",
      ciudad_empresa: "bogota",
      sede_empresa: "principal",
      zona_empresa: "chapinero",
      responsable_visita: "sandra pachon",
      contacto_empresa: "sandra pachon",
      cargo: "gerente",
      telefono_empresa: "300 123 4567",
      correo_1: "sandra@reca.co",
      caja_compensacion: "Compensar",
      asesor: "Carlos Ruiz",
      correo_asesor: "carlos@example.com",
      estado: "En Proceso",
      profesional_asignado_id: "7",
    });

    expect(parsed).toMatchObject({
      nombre_empresa: "Acme Sas",
      gestion: "RECA",
      estado: "En Proceso",
      nit_empresa: "900123",
      ciudad_empresa: "Bogotá",
      telefono_empresa: "3001234567",
      profesional_asignado_id: 7,
    });
  });

  it("normalizes known city spelling without inventing ambiguous accents", () => {
    expect(
      createEmpresaSchema.parse({
        nombre_empresa: "ACME SAS",
        gestion: "RECA",
        nit_empresa: "900123",
        direccion_empresa: "Calle 80",
        ciudad_empresa: "  bogota  ",
        sede_empresa: "Principal",
        zona_empresa: "Chapinero",
        responsable_visita: "Sandra Pachon",
        contacto_empresa: "Sandra Pachon",
        cargo: "Gerente",
        telefono_empresa: "3001234567",
        correo_1: "sandra@reca.co",
        caja_compensacion: "Compensar",
        asesor: "Carlos Ruiz",
        correo_asesor: "carlos@example.com",
        estado: "En Proceso",
        profesional_asignado_id: "7",
      }).ciudad_empresa
    ).toBe("Bogotá");

    expect(
      createEmpresaSchema.parse({
        nombre_empresa: "ACME SAS",
        gestion: "RECA",
        nit_empresa: "900123",
        direccion_empresa: "Calle 80",
        ciudad_empresa: "fontibon",
        sede_empresa: "Principal",
        zona_empresa: "Chapinero",
        responsable_visita: "Sandra Pachon",
        contacto_empresa: "Sandra Pachon",
        cargo: "Gerente",
        telefono_empresa: "3001234567",
        correo_1: "sandra@reca.co",
        caja_compensacion: "Compensar",
        asesor: "Carlos Ruiz",
        correo_asesor: "carlos@example.com",
        estado: "En Proceso",
        profesional_asignado_id: "7",
      }).ciudad_empresa
    ).toBe("Fontibón");

    expect(
      createEmpresaSchema.parse({
        nombre_empresa: "ACME SAS",
        gestion: "RECA",
        nit_empresa: "900123",
        direccion_empresa: "Calle 80",
        ciudad_empresa: "  puerto   reca  ",
        sede_empresa: "Principal",
        zona_empresa: "Chapinero",
        responsable_visita: "Sandra Pachon",
        contacto_empresa: "Sandra Pachon",
        cargo: "Gerente",
        telefono_empresa: "3001234567",
        correo_1: "sandra@reca.co",
        caja_compensacion: "Compensar",
        asesor: "Carlos Ruiz",
        correo_asesor: "carlos@example.com",
        estado: "En Proceso",
        profesional_asignado_id: "7",
      }).ciudad_empresa
    ).toBe("Puerto Reca");
  });

  it("requires the operational empresa fields before saving", () => {
    const parsed = createEmpresaSchema.safeParse({
      nombre_empresa: "",
      nit_empresa: "",
      direccion_empresa: "",
      ciudad_empresa: "",
      sede_empresa: "",
      zona_empresa: "",
      responsable_visita: "",
      contacto_empresa: "",
      cargo: "",
      telefono_empresa: "",
      correo_1: "",
      caja_compensacion: "",
      asesor: "",
      correo_asesor: "",
      gestion: "",
      estado: "",
      profesional_asignado_id: "",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      expect(errors.nombre_empresa).toContain("El nombre de la empresa es obligatorio.");
      expect(errors.nit_empresa).toContain("El NIT es obligatorio.");
      expect(errors.direccion_empresa).toContain("La dirección es obligatoria.");
      expect(errors.ciudad_empresa).toContain("La ciudad es obligatoria.");
      expect(errors.sede_empresa).toContain("La sede empresa es obligatoria.");
      expect(errors.zona_empresa).toContain("La Zona Compensar es obligatoria.");
      expect(errors.responsable_visita).toContain(
        "El responsable de visita es obligatorio."
      );
      expect(errors.contacto_empresa).toContain("El primer contacto es obligatorio.");
      expect(errors.cargo).toContain("El cargo del responsable es obligatorio.");
      expect(errors.telefono_empresa).toContain(
        "El teléfono del responsable es obligatorio."
      );
      expect(errors.correo_1).toContain("El correo del responsable es obligatorio.");
      expect(errors.caja_compensacion).toContain(
        "Selecciona una caja de compensación válida."
      );
      expect(errors.asesor).toContain("El asesor es obligatorio.");
      expect(errors.correo_asesor).toContain("El correo asesor es obligatorio.");
      expect(errors.profesional_asignado_id).toContain(
        "Selecciona un profesional asignado."
      );
    }
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
      telefono_empresa: " 300 123 4567 ",
      correo_1: " contacto@empresa.com ",
      responsable_visita: "  sandra   pachon ",
      asesor: "  asesor   compensar ",
      correo_asesor: " ASESOR@COMPENSAR.COM ",
      profesional_asignado_id: "8",
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
      telefono_empresa: "3001234567",
      correo_1: "contacto@empresa.com",
      responsable_visita: "Sandra Pachon",
      asesor: "Asesor Compensar",
      correo_asesor: "ASESOR@COMPENSAR.COM",
      profesional_asignado_id: 8,
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
      direccion_empresa: "Calle 80",
      ciudad_empresa: "Bogota",
      sede_empresa: "Principal",
      zona_empresa: "Chapinero",
      responsable_visita: "Sandra Pachon",
      contacto_empresa: "Sandra Pachon",
      cargo: "Gerente",
      telefono_empresa: "3001234567",
      correo_1: "sandra@reca.co",
      caja_compensacion: "Compensar",
      asesor: "Carlos Ruiz",
      correo_asesor: "carlos@example.com",
      profesional_asignado_id: 7,
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
      nit_empresa: "900123",
      direccion_empresa: "Calle 80",
      ciudad_empresa: "Bogota",
      sede_empresa: "Principal",
      zona_empresa: "Chapinero",
      estado: "SENA",
      caja_compensacion: "Caja desconocida",
      responsable_visita: "Sandra Pachon",
      contacto_empresa: "Sandra Pachon",
      cargo: "Gerente",
      telefono_empresa: "3001234567",
      correo_1: "sandra@reca.co",
      asesor: "Carlos Ruiz",
      correo_asesor: "carlos@example.com",
      profesional_asignado_id: 7,
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
      nit_empresa: "900123",
      direccion_empresa: "Calle 80",
      ciudad_empresa: "Bogota",
      sede_empresa: "Principal",
      zona_empresa: "Chapinero",
      estado: "En Proceso",
      contacto_empresa: "Sandra Pachon;",
      cargo: "Gerente;Analista",
      telefono_empresa: "300;",
      correo_1: "sandra@reca.co;correo-invalido",
      responsable_visita: "Sandra Pachon",
      caja_compensacion: "Compensar",
      asesor: "Carlos Ruiz",
      correo_asesor: "carlos@example.com",
      profesional_asignado_id: 7,
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
      nit_empresa: "900123",
      direccion_empresa: "Calle 80",
      ciudad_empresa: "Bogota",
      sede_empresa: "Principal",
      zona_empresa: "Chapinero",
      estado: "Cerrada",
      previous_estado: "Activa",
      comentario: " ",
      responsable_visita: "Sandra Pachon",
      contacto_empresa: "Sandra Pachon",
      cargo: "Gerente",
      telefono_empresa: "3001234567",
      correo_1: "sandra@reca.co",
      caja_compensacion: "Compensar",
      asesor: "Carlos Ruiz",
      correo_asesor: "carlos@example.com",
      profesional_asignado_id: 7,
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
