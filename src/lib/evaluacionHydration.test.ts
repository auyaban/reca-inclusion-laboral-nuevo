import { describe, expect, it } from "vitest";
import { hydrateEvaluacionDraft } from "@/lib/evaluacionHydration";
import { ASESOR_AGENCIA_CARGO } from "@/lib/asistentes";
import { EVALUACION_SECTION_5_ITEMS } from "@/lib/evaluacionSections";

function createEmpresa() {
  return {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno",
    nit_empresa: "9001",
    direccion_empresa: "Calle 1",
    ciudad_empresa: "Bogota",
    sede_empresa: "Sede Norte",
    zona_empresa: "Zona Centro",
    correo_1: "empresa@example.com",
    contacto_empresa: "Ana Contacto",
    telefono_empresa: "3000000",
    cargo: "Lider SST",
    profesional_asignado: "Laura Profesional",
    correo_profesional: null,
    asesor: "Pedro Asesor",
    correo_asesor: null,
    caja_compensacion: "Compensar",
  };
}

describe("hydrateEvaluacionDraft", () => {
  it("hydrates v2 section-scoped flat caches into the normalized web contract", () => {
    const values = hydrateEvaluacionDraft(
      {
        section_1: {
          fecha_visita: "2026-04-16",
          modalidad: "Mixto",
          nit_empresa: "9001",
        },
        section_2_1: {
          transporte_publico_accesible: "Sí",
          transporte_publico_observaciones: "Hay ruta accesible",
          senales_podotactiles_accesible: "Parcial",
          senales_podotactiles:
            "Presencia de señales podotáctiles continuas y en buen estado.",
        },
        section_4: {
          nivel_accesibilidad: "Medio",
          descripcion: "legacy",
        },
        section_5: {
          discapacidad_fisica: "Aplica",
          discapacidad_fisica_nota: "legacy",
          discapacidad_fisica_ajustes: "legacy",
        },
        section_6: {
          observaciones_generales: "Observaciones generales",
        },
        section_7: {
          cargos_compatibles: "Operario de apoyo",
        },
        section_8: [
          { nombre: "Laura Profesional", cargo: "Profesional RECA" },
          { nombre: "Invitada", cargo: "Talento humano" },
          { nombre: "Pedro asesor", cargo: "Asesor Agencia" },
        ],
      },
      createEmpresa()
    );

    expect(values.modalidad).toBe("Mixta");
    expect(values.nombre_empresa).toBe("Empresa Uno");
    expect(values.section_2_1.transporte_publico).toEqual({
      accesible: "Si",
      respuesta: "",
      secundaria: "",
      terciaria: "",
      cuaternaria: "",
      quinary: "",
      observaciones: "Hay ruta accesible",
      detalle: "",
    });
    expect(values.section_2_1.senales_podotactiles.accesible).toBe("Parcial");
    expect(values.section_4.descripcion).not.toBe("legacy");
    expect(values.section_5.discapacidad_fisica.nota).toBe(
      EVALUACION_SECTION_5_ITEMS[0]?.codes
    );
    expect(values.section_5.discapacidad_fisica.ajustes).toBe(
      EVALUACION_SECTION_5_ITEMS[0]?.ajustes
    );
    expect(values.observaciones_generales).toBe("Observaciones generales");
    expect(values.cargos_compatibles).toBe("Operario de apoyo");
    expect(values.asistentes).toEqual([
      { nombre: "Laura Profesional", cargo: "Profesional RECA" },
      { nombre: "Invitada", cargo: "Talento humano" },
      { nombre: "Pedro Asesor", cargo: ASESOR_AGENCIA_CARGO },
    ]);
  });

  it("hydrates v3 nested payloads while padding missing defaults", () => {
    const values = hydrateEvaluacionDraft(
      {
        fecha_visita: "2026-04-16",
        modalidad: "Virtual",
        nit_empresa: "9001",
        section_2_6: {
          ajustes_razonables_psicosocial: {
            accesible: "No",
            respuesta:
              "No es posible flexibilizar los niveles de ruido que tenga en su puesto de trabajo.",
            detalle: "Depende del area",
          },
        },
        observaciones_generales: "Observaciones",
        cargos_compatibles: "Operario",
        asistentes: [{ nombre: "Invitada", cargo: "Talento humano" }],
      },
      createEmpresa()
    );

    expect(values.section_2_6.ajustes_razonables_psicosocial.accesible).toBe("No");
    expect(values.section_2_6.ajustes_razonables_psicosocial.detalle).toBe(
      "Depende del area"
    );
    expect(values.section_2_1.transporte_publico.accesible).toBe("");
    expect(values.asistentes).toEqual([
      { nombre: "Laura Profesional", cargo: "" },
      { nombre: "Invitada", cargo: "Talento humano" },
      { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
    ]);
  });

  it("hydrates v1 root-flat question caches and accepts the quinaria alias", () => {
    const values = hydrateEvaluacionDraft(
      {
        fecha_visita: "2026-04-16",
        modalidad: "Presencial",
        nit_empresa: "9001",
        bano_discapacidad_fisica_accesible: "No",
        bano_discapacidad_fisica:
          "No cuenta con barras de agarre en ambos lados de la unidad sanitaria.",
        bano_discapacidad_fisica_cuaternaria:
          "Cuenta con timbre de emergencia situado al lado del sanitario.",
        bano_discapacidad_fisica_quinaria:
          "Los accesorios NO interfieren con las barras de apoyo.",
        observaciones_generales: "Observaciones",
        cargos_compatibles: "Operario",
      },
      createEmpresa()
    );

    expect(values.section_2_3.bano_discapacidad_fisica).toMatchObject({
      accesible: "No",
      respuesta:
        "No cuenta con barras de agarre en ambos lados de la unidad sanitaria.",
      cuaternaria:
        "Cuenta con timbre de emergencia situado al lado del sanitario.",
      quinary: "Los accesorios NO interfieren con las barras de apoyo.",
    });
  });
});
