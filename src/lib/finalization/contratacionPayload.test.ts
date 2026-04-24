import { describe, expect, it } from "vitest";
import { buildContratacionCompletionPayloads } from "@/lib/finalization/contratacionPayload";

describe("buildContratacionCompletionPayloads", () => {
  const section1Data = {
    fecha_visita: "2026-04-15",
    modalidad: "Presencial",
    nombre_empresa: "ACME SAS",
    ciudad_empresa: "Bogota",
    direccion_empresa: "Calle 1 # 2-3",
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
  };

  it("copies desarrollo_actividad into each section_2 row and keeps the full extra_name in individual payloads to match legacy", () => {
    const result = buildContratacionCompletionPayloads({
      actaRef: "A7K29QF2",
      section1Data,
      formData: {
        fecha_visita: "2026-04-15",
        modalidad: "Presencial",
        nit_empresa: "900123456",
        desarrollo_actividad: "Actividad compartida",
        ajustes_recomendaciones: "Ajuste final",
        asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
        vinculados: [
          {
            numero: "1",
            nombre_oferente: "Ana Perez",
            cedula: "123",
            certificado_porcentaje: "45%",
            discapacidad: "Discapacidad auditiva",
            telefono_oferente: "3000000000",
            genero: "Hombre",
            correo_oferente: "ana@correo.com",
            fecha_nacimiento: "1990-01-01",
            edad: "34",
            lgtbiq: "No aplica",
            grupo_etnico: "No",
            grupo_etnico_cual: "No aplica",
            cargo_oferente: "Analista",
            contacto_emergencia: "Mario Perez",
            parentesco: "Hermano",
            telefono_emergencia: "3010000000",
            certificado_discapacidad: "Si",
            lugar_firma_contrato: "Bogota",
            fecha_firma_contrato: "2026-04-15",
            tipo_contrato: "Contrato de trabajo a termino fijo",
            fecha_fin: "2027-04-15",
            contrato_lee_nivel_apoyo: "0. No requiere apoyo.",
            contrato_lee_observacion: "0. No requiere apoyo.",
            contrato_lee_nota: "Sin novedad",
            contrato_comprendido_nivel_apoyo: "0. No requiere apoyo.",
            contrato_comprendido_observacion:
              "0. Comprende con claridad el contrato.",
            contrato_comprendido_nota: "Sin novedad",
            contrato_tipo_nivel_apoyo: "0. No requiere apoyo.",
            contrato_tipo_observacion:
              "0. El vinculado tiene claras las condiciones del tipo de contrato a firmar.",
            contrato_tipo_contrato: "Contrato a termino fijo.",
            contrato_jornada: "Tiempo Completo.",
            contrato_clausulas: "Clausula de confidencialidad.",
            contrato_tipo_nota: "Sin novedad",
            condiciones_salariales_nivel_apoyo: "0. No requiere apoyo.",
            condiciones_salariales_observacion:
              "0. Tiene claras las condiciones salariales asignadas al cargo.",
            condiciones_salariales_frecuencia_pago: "Pago Mensual.",
            condiciones_salariales_forma_pago: "Abono a cuenta bancaria.",
            condiciones_salariales_nota: "Sin novedad",
            prestaciones_cesantias_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_cesantias_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_cesantias_nota: "Sin novedad",
            prestaciones_auxilio_transporte_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_auxilio_transporte_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_auxilio_transporte_nota: "Sin novedad",
            prestaciones_prima_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_prima_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_prima_nota: "Sin novedad",
            prestaciones_seguridad_social_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_seguridad_social_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_seguridad_social_nota: "Sin novedad",
            prestaciones_vacaciones_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_vacaciones_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_vacaciones_nota: "Sin novedad",
            prestaciones_auxilios_beneficios_nivel_apoyo:
              "0. No requiere apoyo.",
            prestaciones_auxilios_beneficios_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_auxilios_beneficios_nota: "Sin novedad",
            conducto_regular_nivel_apoyo: "0. No requiere apoyo.",
            conducto_regular_observacion: "0. Conoce el conducto regular.",
            descargos_observacion:
              "Si conoce que es una diligencia de descargos.",
            tramites_observacion:
              "Conoce como es el proceso para realizar tramites administrativos (certificaciones, afiliaciones, descuentos, desprendibles de nomina).",
            permisos_observacion:
              "Conoce como es el proceso de solicitud de permisos.",
            conducto_regular_nota: "Sin novedad",
            causales_fin_nivel_apoyo: "0. No requiere apoyo.",
            causales_fin_observacion:
              "0. Tiene claro las causales de cancelacion del contrato.",
            causales_fin_nota: "Sin novedad",
            rutas_atencion_nivel_apoyo: "0. No requiere apoyo.",
            rutas_atencion_observacion:
              "0. Tiene claro cuales son las rutas de atencion.",
            rutas_atencion_nota: "Sin novedad",
          },
        ],
      },
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      output: { sheetLink: "https://sheet.example", pdfLink: "https://pdf.example" },
      generatedAt: "2026-04-15T12:00:00.000Z",
      payloadSource: "form_web",
    });

    expect(result.payloadRaw.cache_snapshot.section_2[0]?.desarrollo_actividad).toBe(
      "Actividad compartida"
    );
    expect(result.payloadNormalized.metadata.acta_ref).toBe("A7K29QF2");
    expect(result.payloadNormalized.attachment.document_kind).toBe(
      "inclusive_hiring"
    );
    expect(result.payloadNormalized.parsed_raw.participantes).toEqual([
      {
        nombre_usuario: "Ana Perez",
        cedula_usuario: "123",
        cargo_servicio: "Analista",
      },
    ]);
    expect(
      (result.payloadNormalized.parsed_raw as { extra_name?: string }).extra_name
    ).toBe("Ana Perez");
  });

  it("uses the vinculado count as extra_name for group payloads", () => {
    const result = buildContratacionCompletionPayloads({
      actaRef: "A7K29QF2",
      section1Data,
      formData: {
        fecha_visita: "2026-04-15",
        modalidad: "Presencial",
        nit_empresa: "900123456",
        desarrollo_actividad: "Actividad compartida",
        ajustes_recomendaciones: "Ajuste final",
        asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
        vinculados: [
          {
            numero: "1",
            nombre_oferente: "Ana Perez",
            cedula: "123",
            certificado_porcentaje: "45%",
            discapacidad: "Discapacidad auditiva",
            telefono_oferente: "3000000000",
            genero: "Hombre",
            correo_oferente: "ana@correo.com",
            fecha_nacimiento: "1990-01-01",
            edad: "34",
            lgtbiq: "No aplica",
            grupo_etnico: "No",
            grupo_etnico_cual: "No aplica",
            cargo_oferente: "Analista",
            contacto_emergencia: "Mario Perez",
            parentesco: "Hermano",
            telefono_emergencia: "3010000000",
            certificado_discapacidad: "Si",
            lugar_firma_contrato: "Bogota",
            fecha_firma_contrato: "2026-04-15",
            tipo_contrato: "Contrato de trabajo a termino fijo",
            fecha_fin: "2027-04-15",
            contrato_lee_nivel_apoyo: "0. No requiere apoyo.",
            contrato_lee_observacion: "0. No requiere apoyo.",
            contrato_lee_nota: "Sin novedad",
            contrato_comprendido_nivel_apoyo: "0. No requiere apoyo.",
            contrato_comprendido_observacion:
              "0. Comprende con claridad el contrato.",
            contrato_comprendido_nota: "Sin novedad",
            contrato_tipo_nivel_apoyo: "0. No requiere apoyo.",
            contrato_tipo_observacion:
              "0. El vinculado tiene claras las condiciones del tipo de contrato a firmar.",
            contrato_tipo_contrato: "Contrato a termino fijo.",
            contrato_jornada: "Tiempo Completo.",
            contrato_clausulas: "Clausula de confidencialidad.",
            contrato_tipo_nota: "Sin novedad",
            condiciones_salariales_nivel_apoyo: "0. No requiere apoyo.",
            condiciones_salariales_observacion:
              "0. Tiene claras las condiciones salariales asignadas al cargo.",
            condiciones_salariales_frecuencia_pago: "Pago Mensual.",
            condiciones_salariales_forma_pago: "Abono a cuenta bancaria.",
            condiciones_salariales_nota: "Sin novedad",
            prestaciones_cesantias_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_cesantias_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_cesantias_nota: "Sin novedad",
            prestaciones_auxilio_transporte_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_auxilio_transporte_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_auxilio_transporte_nota: "Sin novedad",
            prestaciones_prima_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_prima_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_prima_nota: "Sin novedad",
            prestaciones_seguridad_social_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_seguridad_social_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_seguridad_social_nota: "Sin novedad",
            prestaciones_vacaciones_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_vacaciones_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_vacaciones_nota: "Sin novedad",
            prestaciones_auxilios_beneficios_nivel_apoyo:
              "0. No requiere apoyo.",
            prestaciones_auxilios_beneficios_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_auxilios_beneficios_nota: "Sin novedad",
            conducto_regular_nivel_apoyo: "0. No requiere apoyo.",
            conducto_regular_observacion: "0. Conoce el conducto regular.",
            descargos_observacion:
              "Si conoce que es una diligencia de descargos.",
            tramites_observacion:
              "Conoce como es el proceso para realizar tramites administrativos (certificaciones, afiliaciones, descuentos, desprendibles de nomina).",
            permisos_observacion:
              "Conoce como es el proceso de solicitud de permisos.",
            conducto_regular_nota: "Sin novedad",
            causales_fin_nivel_apoyo: "0. No requiere apoyo.",
            causales_fin_observacion:
              "0. Tiene claro las causales de cancelacion del contrato.",
            causales_fin_nota: "Sin novedad",
            rutas_atencion_nivel_apoyo: "0. No requiere apoyo.",
            rutas_atencion_observacion:
              "0. Tiene claro cuales son las rutas de atencion.",
            rutas_atencion_nota: "Sin novedad",
          },
          {
            ...{
              numero: "1",
              nombre_oferente: "Ana Perez",
              cedula: "123",
              certificado_porcentaje: "45%",
              discapacidad: "Discapacidad auditiva",
              telefono_oferente: "3000000000",
              genero: "Hombre",
              correo_oferente: "ana@correo.com",
              fecha_nacimiento: "1990-01-01",
              edad: "34",
              lgtbiq: "No aplica",
              grupo_etnico: "No",
              grupo_etnico_cual: "No aplica",
              cargo_oferente: "Analista",
              contacto_emergencia: "Mario Perez",
              parentesco: "Hermano",
              telefono_emergencia: "3010000000",
              certificado_discapacidad: "Si",
              lugar_firma_contrato: "Bogota",
              fecha_firma_contrato: "2026-04-15",
              tipo_contrato: "Contrato de trabajo a termino fijo",
              fecha_fin: "2027-04-15",
              contrato_lee_nivel_apoyo: "0. No requiere apoyo.",
              contrato_lee_observacion: "0. No requiere apoyo.",
              contrato_lee_nota: "Sin novedad",
              contrato_comprendido_nivel_apoyo: "0. No requiere apoyo.",
              contrato_comprendido_observacion:
                "0. Comprende con claridad el contrato.",
              contrato_comprendido_nota: "Sin novedad",
              contrato_tipo_nivel_apoyo: "0. No requiere apoyo.",
              contrato_tipo_observacion:
                "0. El vinculado tiene claras las condiciones del tipo de contrato a firmar.",
              contrato_tipo_contrato: "Contrato a termino fijo.",
              contrato_jornada: "Tiempo Completo.",
              contrato_clausulas: "Clausula de confidencialidad.",
              contrato_tipo_nota: "Sin novedad",
              condiciones_salariales_nivel_apoyo: "0. No requiere apoyo.",
              condiciones_salariales_observacion:
                "0. Tiene claras las condiciones salariales asignadas al cargo.",
              condiciones_salariales_frecuencia_pago: "Pago Mensual.",
              condiciones_salariales_forma_pago: "Abono a cuenta bancaria.",
              condiciones_salariales_nota: "Sin novedad",
              prestaciones_cesantias_nivel_apoyo: "0. No requiere apoyo.",
              prestaciones_cesantias_observacion:
                "0. Conoce los beneficios y la aplicacion.",
              prestaciones_cesantias_nota: "Sin novedad",
              prestaciones_auxilio_transporte_nivel_apoyo: "0. No requiere apoyo.",
              prestaciones_auxilio_transporte_observacion:
                "0. Conoce los beneficios y la aplicacion.",
              prestaciones_auxilio_transporte_nota: "Sin novedad",
              prestaciones_prima_nivel_apoyo: "0. No requiere apoyo.",
              prestaciones_prima_observacion:
                "0. Conoce los beneficios y la aplicacion.",
              prestaciones_prima_nota: "Sin novedad",
              prestaciones_seguridad_social_nivel_apoyo: "0. No requiere apoyo.",
              prestaciones_seguridad_social_observacion:
                "0. Conoce los beneficios y la aplicacion.",
              prestaciones_seguridad_social_nota: "Sin novedad",
              prestaciones_vacaciones_nivel_apoyo: "0. No requiere apoyo.",
              prestaciones_vacaciones_observacion:
                "0. Conoce los beneficios y la aplicacion.",
              prestaciones_vacaciones_nota: "Sin novedad",
              prestaciones_auxilios_beneficios_nivel_apoyo:
                "0. No requiere apoyo.",
              prestaciones_auxilios_beneficios_observacion:
                "0. Conoce los beneficios y la aplicacion.",
              prestaciones_auxilios_beneficios_nota: "Sin novedad",
              conducto_regular_nivel_apoyo: "0. No requiere apoyo.",
              conducto_regular_observacion: "0. Conoce el conducto regular.",
              descargos_observacion:
                "Si conoce que es una diligencia de descargos.",
              tramites_observacion:
                "Conoce como es el proceso para realizar tramites administrativos (certificaciones, afiliaciones, descuentos, desprendibles de nomina).",
              permisos_observacion:
                "Conoce como es el proceso de solicitud de permisos.",
              conducto_regular_nota: "Sin novedad",
              causales_fin_nivel_apoyo: "0. No requiere apoyo.",
              causales_fin_observacion:
                "0. Tiene claro las causales de cancelacion del contrato.",
              causales_fin_nota: "Sin novedad",
              rutas_atencion_nivel_apoyo: "0. No requiere apoyo.",
              rutas_atencion_observacion:
                "0. Tiene claro cuales son las rutas de atencion.",
              rutas_atencion_nota: "Sin novedad",
            },
            numero: "2",
          },
        ],
      },
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      output: { sheetLink: "https://sheet.example", pdfLink: "https://pdf.example" },
      generatedAt: "2026-04-15T12:00:00.000Z",
      payloadSource: "form_web",
    });

    expect(result.payloadNormalized.attachment.document_kind).toBe(
      "inclusive_hiring"
    );
    expect(
      (result.payloadNormalized.parsed_raw as { extra_name?: string }).extra_name
    ).toBe("2");
  });
});
