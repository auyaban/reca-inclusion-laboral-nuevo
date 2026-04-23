import { describe, expect, it } from "vitest";
import { normalizeContratacionValues } from "@/lib/contratacion";
import {
  buildValidSeleccionOferenteRow,
  buildValidSeleccionValues,
} from "@/lib/testing/seleccionFixtures";
import {
  buildUsuariosRecaRowsFromInduccion,
  buildUsuariosRecaRowsFromContratacion,
  buildUsuariosRecaRowsFromSeleccion,
  inferUsuarioRecaDiscapacidadCategoria,
  getContratacionUsuariosRecaModifiedFieldIds,
  getInduccionUsuariosRecaModifiedFieldIds,
  getInterpreteLscUsuariosRecaModifiedFieldIds,
  getSeleccionUsuariosRecaModifiedFieldIds,
  hasContratacionUsuariosRecaReplaceTargetData,
  hasInduccionUsuariosRecaReplaceTargetData,
  hasInterpreteLscUsuariosRecaReplaceTargetData,
  hasSeleccionUsuariosRecaReplaceTargetData,
  isInterpreteLscUsuariosRecaPrefillRowEmpty,
  isInduccionUsuariosRecaPrefillRowEmpty,
  isContratacionUsuariosRecaPrefillRowEmpty,
  mapUsuarioRecaToContratacionPrefill,
  mapUsuarioRecaToInduccionPrefill,
  mapUsuarioRecaToInterpreteLscPrefill,
  mapUsuarioRecaToSeleccionPrefill,
  mapUsuarioRecaToSeguimientoPrefill,
  normalizeCedulaUsuario,
  normalizeUsuarioRecaRecord,
  isSeleccionUsuariosRecaPrefillRowEmpty,
} from "@/lib/usuariosReca";

const EMPRESA = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: "Zona Norte",
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@reca.com",
  caja_compensacion: "Compensar",
} as const;

describe("usuariosReca", () => {
  it("normalizes cédulas to digits only", () => {
    expect(normalizeCedulaUsuario("1.001.234 567")).toBe("1001234567");
  });

  it("normalizes empty strings to null in canonical records", () => {
    expect(
      normalizeUsuarioRecaRecord({
        cedula_usuario: "123",
        nombre_usuario: "  ",
        telefono_oferente: "",
      })
    ).toEqual(
      expect.objectContaining({
        cedula_usuario: "123",
        nombre_usuario: null,
        telefono_oferente: null,
      })
    );
  });

  it("builds selección rows and deduplicates duplicate cédulas keeping the last row", () => {
    const values = buildValidSeleccionValues(EMPRESA);
    values.oferentes = [
      {
        ...values.oferentes[0],
        cedula: "1000061994",
        nombre_oferente: "Ana inicial",
        telefono_oferente: "",
      },
      {
        ...values.oferentes[0],
        cedula: "1000061994",
        nombre_oferente: "Ana final",
        telefono_oferente: "3001112233",
      },
    ];

    const rows = buildUsuariosRecaRowsFromSeleccion(values);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        cedula_usuario: "1000061994",
        nombre_usuario: "Ana final",
        telefono_oferente: "3001112233",
      })
    );
  });

  it("builds contratación rows with empresa data and nullifies blanks", () => {
    const values = normalizeContratacionValues(
      {
        fecha_visita: "2026-04-15",
        modalidad: "Presencial",
        nit_empresa: "900123456",
        desarrollo_actividad: "Actividad compartida",
        ajustes_recomendaciones: "Ajuste final",
        asistentes: [
          { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        ],
        vinculados: [
          {
            numero: "1",
            nombre_oferente: "Ana Perez",
            cedula: "1000061994",
            certificado_porcentaje: "45%",
            discapacidad: "Discapacidad auditiva",
            telefono_oferente: "",
            genero: "Mujer",
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
      EMPRESA as never
    );

    const rows = buildUsuariosRecaRowsFromContratacion(values, {
      nit_empresa: "900123456",
      nombre_empresa: "ACME SAS",
    });

    expect(rows).toEqual([
      expect.objectContaining({
        cedula_usuario: "1000061994",
        nombre_usuario: "Ana Perez",
        genero_usuario: "Mujer",
        telefono_oferente: null,
        certificado_porcentaje: "45",
        empresa_nit: "900123456",
        empresa_nombre: "ACME SAS",
      }),
    ]);
  });

  it("builds induccion rows with the minimum synced field set", () => {
    const rows = buildUsuariosRecaRowsFromInduccion(
      {
        numero: "1",
        nombre_oferente: "Ana Perez",
        cedula: "1000061994",
        telefono_oferente: "3001112233",
        cargo_oferente: "Analista",
      },
      {
        nit_empresa: "900123456",
        nombre_empresa: "ACME SAS",
      }
    );

    expect(rows).toEqual([
      {
        cedula_usuario: "1000061994",
        nombre_usuario: "Ana Perez",
        telefono_oferente: "3001112233",
        cargo_oferente: "Analista",
        empresa_nit: "900123456",
        empresa_nombre: "ACME SAS",
      },
    ]);
  });

  it.each([
    [
      "Discapacidad visual perdida total de la vision",
      "Visual",
    ],
    ["Discapacidad auditiva", "Auditiva"],
    ["Discapacidad fisica", "Física"],
    ["Discapacidad psicosocial", "Psicosocial"],
    ["Discapacidad multiple", "Múltiple"],
    [
      "Trastorno de espectro autista",
      "Intelectual",
    ],
    ["No aplica", null],
  ])(
    "infers discapacidad category for %s",
    (input, expected) => {
      expect(inferUsuarioRecaDiscapacidadCategoria(input)).toBe(expected);
    }
  );

  it("maps usuario RECA data to contratación prefill and detects modified fields", () => {
    const snapshot = normalizeUsuarioRecaRecord({
      cedula_usuario: "1000061994",
      nombre_usuario: "Ana Perez",
      genero_usuario: "mujer",
      telefono_oferente: "3001112233",
      cargo_oferente: "Analista",
      certificado_porcentaje: "45",
      grupo_etnico: "No",
      grupo_etnico_cual: "No aplica",
    });
    expect(snapshot).not.toBeNull();

    const prefill = mapUsuarioRecaToContratacionPrefill(snapshot!);
    expect(prefill).toEqual(
      expect.objectContaining({
        cedula: "1000061994",
        nombre_oferente: "Ana Perez",
        genero: "Mujer",
        telefono_oferente: "3001112233",
        cargo_oferente: "Analista",
        certificado_porcentaje: "45%",
      })
    );

    const normalizedFormRow = normalizeContratacionValues(
      {
        vinculados: [
          {
            ...prefill,
            numero: "1",
            certificado_porcentaje: "45%",
            discapacidad: "",
            genero: "Mujer",
            correo_oferente: "",
            fecha_nacimiento: "",
            edad: "",
            lgtbiq: "",
            grupo_etnico: "No",
            grupo_etnico_cual: "No aplica",
            contacto_emergencia: "",
            parentesco: "",
            telefono_emergencia: "",
            certificado_discapacidad: "",
            lugar_firma_contrato: "",
            fecha_firma_contrato: "",
            tipo_contrato: "",
            fecha_fin: "",
            contrato_lee_nivel_apoyo: "",
            contrato_lee_observacion: "",
            contrato_lee_nota: "",
            contrato_comprendido_nivel_apoyo: "",
            contrato_comprendido_observacion: "",
            contrato_comprendido_nota: "",
            contrato_tipo_nivel_apoyo: "",
            contrato_tipo_observacion: "",
            contrato_tipo_contrato: "",
            contrato_jornada: "",
            contrato_clausulas: "",
            contrato_tipo_nota: "",
            condiciones_salariales_nivel_apoyo: "",
            condiciones_salariales_observacion: "",
            condiciones_salariales_frecuencia_pago: "",
            condiciones_salariales_forma_pago: "",
            condiciones_salariales_nota: "",
            prestaciones_cesantias_nivel_apoyo: "",
            prestaciones_cesantias_observacion: "",
            prestaciones_cesantias_nota: "",
            prestaciones_auxilio_transporte_nivel_apoyo: "",
            prestaciones_auxilio_transporte_observacion: "",
            prestaciones_auxilio_transporte_nota: "",
            prestaciones_prima_nivel_apoyo: "",
            prestaciones_prima_observacion: "",
            prestaciones_prima_nota: "",
            prestaciones_seguridad_social_nivel_apoyo: "",
            prestaciones_seguridad_social_observacion: "",
            prestaciones_seguridad_social_nota: "",
            prestaciones_vacaciones_nivel_apoyo: "",
            prestaciones_vacaciones_observacion: "",
            prestaciones_vacaciones_nota: "",
            prestaciones_auxilios_beneficios_nivel_apoyo: "",
            prestaciones_auxilios_beneficios_observacion: "",
            prestaciones_auxilios_beneficios_nota: "",
            conducto_regular_nivel_apoyo: "",
            conducto_regular_observacion: "",
            descargos_observacion: "",
            tramites_observacion: "",
            permisos_observacion: "",
            conducto_regular_nota: "",
            causales_fin_nivel_apoyo: "",
            causales_fin_observacion: "",
            causales_fin_nota: "",
            rutas_atencion_nivel_apoyo: "",
            rutas_atencion_observacion: "",
            rutas_atencion_nota: "",
          },
        ],
      },
      EMPRESA as never
    ).vinculados[0];

    const modifiedFieldIds = getContratacionUsuariosRecaModifiedFieldIds(
      snapshot!,
      normalizedFormRow
    );

    expect(modifiedFieldIds).toEqual([]);

    const modifiedPhoneFieldIds = getContratacionUsuariosRecaModifiedFieldIds(
      snapshot!,
      {
        ...normalizedFormRow,
        telefono_oferente: "3000000000",
      }
    );

    expect(modifiedPhoneFieldIds).toEqual(["telefono_oferente"]);
    expect(
      hasContratacionUsuariosRecaReplaceTargetData({
        ...normalizeContratacionValues({}, EMPRESA as never).vinculados[0],
        cargo_oferente: "Analista",
      })
    ).toBe(true);
  });

  it("drops ambiguous legacy género values from usuarios RECA records instead of inventing a replacement", () => {
    const snapshot = normalizeUsuarioRecaRecord({
      cedula_usuario: "1000061994",
      genero_usuario: "Binario",
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.genero_usuario).toBeNull();
  });

  it("maps usuario RECA data to induccion prefill and detects modified fields", () => {
    const snapshot = normalizeUsuarioRecaRecord({
      cedula_usuario: "1000061994",
      nombre_usuario: "Ana Perez",
      telefono_oferente: "3001112233",
      cargo_oferente: "Analista",
    });
    expect(snapshot).not.toBeNull();

    const prefill = mapUsuarioRecaToInduccionPrefill(snapshot!);
    expect(prefill).toEqual({
      cedula: "1000061994",
      nombre_oferente: "Ana Perez",
      telefono_oferente: "3001112233",
      cargo_oferente: "Analista",
    });

    expect(
      getInduccionUsuariosRecaModifiedFieldIds(snapshot!, {
        numero: "1",
        ...prefill,
      })
    ).toEqual([]);

    expect(
      getInduccionUsuariosRecaModifiedFieldIds(snapshot!, {
        numero: "1",
        ...prefill,
        cargo_oferente: "Coordinadora",
      })
    ).toEqual(["cargo_oferente"]);
  });

  it("detects replace-target and empty states for induccion rows", () => {
    expect(
      hasInduccionUsuariosRecaReplaceTargetData({
        numero: "1",
        cedula: "1000061994",
        nombre_oferente: "",
        telefono_oferente: "",
        cargo_oferente: "",
      })
    ).toBe(false);

    expect(
      hasInduccionUsuariosRecaReplaceTargetData({
        numero: "1",
        cedula: "1000061994",
        nombre_oferente: "Ana Perez",
        telefono_oferente: "",
        cargo_oferente: "",
      })
    ).toBe(true);

    expect(
      isInduccionUsuariosRecaPrefillRowEmpty({
        numero: "1",
        cedula: "",
        nombre_oferente: "",
        telefono_oferente: "",
        cargo_oferente: "",
      })
    ).toBe(true);

    expect(
      isInduccionUsuariosRecaPrefillRowEmpty({
        numero: "1",
        cedula: "1000061994",
        nombre_oferente: "",
        telefono_oferente: "",
        cargo_oferente: "",
      })
    ).toBe(false);
  });

  it("maps usuario RECA data to interprete LSC prefill and detects modified fields", () => {
    const snapshot = normalizeUsuarioRecaRecord({
      cedula_usuario: "1000061994",
      nombre_usuario: "Ana Perez",
    });

    expect(snapshot).not.toBeNull();

    const prefill = mapUsuarioRecaToInterpreteLscPrefill(snapshot!);
    expect(prefill).toEqual({
      cedula: "1000061994",
      nombre_oferente: "Ana Perez",
    });

    expect(
      getInterpreteLscUsuariosRecaModifiedFieldIds(snapshot!, {
        ...prefill,
        proceso: "",
      })
    ).toEqual([]);

    expect(
      getInterpreteLscUsuariosRecaModifiedFieldIds(snapshot!, {
        ...prefill,
        nombre_oferente: "Ana Perez Rojas",
        proceso: "",
      })
    ).toEqual(["nombre_oferente"]);
  });

  it("detects replace-target and empty states for interprete LSC rows", () => {
    expect(
      hasInterpreteLscUsuariosRecaReplaceTargetData({
        cedula: "1000061994",
        nombre_oferente: "",
        proceso: "",
      })
    ).toBe(false);

    expect(
      hasInterpreteLscUsuariosRecaReplaceTargetData({
        cedula: "1000061994",
        nombre_oferente: "Ana Perez",
        proceso: "",
      })
    ).toBe(true);

    expect(
      isInterpreteLscUsuariosRecaPrefillRowEmpty({
        cedula: "",
        nombre_oferente: "",
        proceso: "",
      })
    ).toBe(true);

    expect(
      isInterpreteLscUsuariosRecaPrefillRowEmpty({
        cedula: "1000061994",
        nombre_oferente: "",
        proceso: "",
      })
    ).toBe(false);
  });

  it("maps usuario RECA data to selección prefill with the agreed field subset", () => {
    const snapshot = normalizeUsuarioRecaRecord({
      cedula_usuario: "1000061994",
      nombre_usuario: "Ana Perez",
      certificado_porcentaje: "45",
      discapacidad_detalle: "Discapacidad auditiva",
      telefono_oferente: "3001112233",
      fecha_nacimiento: "1990-01-01",
      cargo_oferente: "Analista",
      contacto_emergencia: "Mario Perez",
      parentesco: "Hermano",
      telefono_emergencia: "3010000000",
      resultado_certificado: "Aprobado",
      pendiente_otros_oferentes: "No",
      cuenta_pension: "Si",
      tipo_pension: "Pension Invalidez",
    });

    expect(snapshot).not.toBeNull();
    expect(mapUsuarioRecaToSeleccionPrefill(snapshot!)).toEqual(
      expect.objectContaining({
        cedula: "1000061994",
        nombre_oferente: "Ana Perez",
        certificado_porcentaje: "45%",
        discapacidad: "Discapacidad auditiva",
        telefono_oferente: "3001112233",
        fecha_nacimiento: "1990-01-01",
        cargo_oferente: "Analista",
        nombre_contacto_emergencia: "Mario Perez",
        parentesco: "Hermano",
        telefono_emergencia: "3010000000",
        resultado_certificado: "Aprobado",
        pendiente_otros_oferentes: "No",
        cuenta_pension: "Si",
        tipo_pension: "Pension Invalidez",
      })
    );
  });

  it("normalizes legacy local dates before bootstrapping Seguimientos", () => {
    const snapshot = normalizeUsuarioRecaRecord({
      cedula_usuario: "1000061994",
      fecha_firma_contrato: "3/4/2026",
      fecha_fin: "23/4/2026",
    });

    expect(snapshot).not.toBeNull();
    expect(mapUsuarioRecaToSeguimientoPrefill(snapshot!)).toMatchObject({
      fecha_firma_contrato: "2026-04-03",
      fecha_fin: "2026-04-23",
    });
  });

  it("treats certificado_porcentaje values with and without % as equivalent in selección modified fields", () => {
    const snapshot = normalizeUsuarioRecaRecord({
      cedula_usuario: "1000061994",
      nombre_usuario: "Ana Perez",
      certificado_porcentaje: "45",
      discapacidad_detalle: "Discapacidad auditiva",
      telefono_oferente: "3001112233",
      fecha_nacimiento: "1990-01-01",
      cargo_oferente: "Analista",
      contacto_emergencia: "Mario Perez",
      parentesco: "Hermano",
      telefono_emergencia: "3010000000",
      resultado_certificado: "Aprobado",
      pendiente_otros_oferentes: "No",
      cuenta_pension: "No",
      tipo_pension: "No aplica",
    });

    expect(snapshot).not.toBeNull();

    const row = {
      ...buildValidSeleccionOferenteRow(),
      ...mapUsuarioRecaToSeleccionPrefill(snapshot!),
      certificado_porcentaje: "45%",
    };

    expect(getSeleccionUsuariosRecaModifiedFieldIds(snapshot!, row)).toEqual([]);
  });

  it("detects modified selección fields when the current row diverges from the snapshot", () => {
    const snapshot = normalizeUsuarioRecaRecord({
      cedula_usuario: "1000061994",
      nombre_usuario: "Ana Perez",
      telefono_oferente: "3001112233",
      cargo_oferente: "Analista",
    });

    expect(snapshot).not.toBeNull();

    const modifiedFieldIds = getSeleccionUsuariosRecaModifiedFieldIds(
      snapshot!,
      {
        ...buildValidSeleccionOferenteRow(),
        ...mapUsuarioRecaToSeleccionPrefill(snapshot!),
        telefono_oferente: "3000000000",
        cargo_oferente: "Analista senior",
      }
    );

    expect(modifiedFieldIds).toEqual([
      "telefono_oferente",
      "cargo_oferente",
    ]);
  });

  it("detects whether a selección row can be replaced from usuarios RECA and resets snapshot state when empty", () => {
    const emptyRow = buildValidSeleccionValues({
      oferentes: [buildValidSeleccionOferenteRow()],
    }).oferentes[0]!;

    const clearedRow = {
      ...emptyRow,
      cedula: "",
      nombre_oferente: "",
      certificado_porcentaje: "",
      discapacidad: "",
      telefono_oferente: "",
      fecha_nacimiento: "",
      cargo_oferente: "",
      nombre_contacto_emergencia: "",
      parentesco: "",
      telefono_emergencia: "",
      resultado_certificado: "",
      pendiente_otros_oferentes: "",
      cuenta_pension: "",
      tipo_pension: "",
    };

    expect(hasSeleccionUsuariosRecaReplaceTargetData(emptyRow)).toBe(true);
    expect(hasSeleccionUsuariosRecaReplaceTargetData(clearedRow)).toBe(false);
    expect(isSeleccionUsuariosRecaPrefillRowEmpty(clearedRow)).toBe(true);
  });
});

describe("usuariosReca replace target sentinels", () => {
  it("ignores default no aplica sentinels when detecting replace targets in contratacion", () => {
    const emptyRow = normalizeContratacionValues({}, EMPRESA as never).vinculados[0];

    expect(emptyRow.grupo_etnico_cual).toBe("No aplica");
    expect(hasContratacionUsuariosRecaReplaceTargetData(emptyRow)).toBe(false);
    expect(isContratacionUsuariosRecaPrefillRowEmpty(emptyRow)).toBe(true);
  });

  it("ignores tipo_pension = no aplica when seleccion does not affirm pension", () => {
    const rowWithDerivedSentinel = buildValidSeleccionOferenteRow({
      cedula: "",
      nombre_oferente: "",
      certificado_porcentaje: "",
      discapacidad: "",
      telefono_oferente: "",
      fecha_nacimiento: "",
      edad: "",
      cargo_oferente: "",
      nombre_contacto_emergencia: "",
      parentesco: "",
      telefono_emergencia: "",
      resultado_certificado: "",
      pendiente_otros_oferentes: "",
      lugar_firma_contrato: "",
      fecha_firma_contrato: "",
      cuenta_pension: "",
      tipo_pension: "No aplica",
      medicamentos_nivel_apoyo: "",
      medicamentos_conocimiento: "",
      medicamentos_horarios: "",
      medicamentos_nota: "",
      alergias_nivel_apoyo: "",
      alergias_tipo: "",
      alergias_nota: "",
      restriccion_nivel_apoyo: "",
      restriccion_conocimiento: "",
      restriccion_nota: "",
      controles_nivel_apoyo: "",
      controles_asistencia: "",
      controles_frecuencia: "",
      controles_nota: "",
      desplazamiento_nivel_apoyo: "",
      desplazamiento_modo: "",
      desplazamiento_transporte: "",
      desplazamiento_nota: "",
      ubicacion_nivel_apoyo: "",
      ubicacion_ciudad: "",
      ubicacion_aplicaciones: "",
      ubicacion_nota: "",
      dinero_nivel_apoyo: "",
      dinero_reconocimiento: "",
      dinero_manejo: "",
      dinero_medios: "",
      dinero_nota: "",
      presentacion_nivel_apoyo: "",
      presentacion_personal: "",
      presentacion_nota: "",
      comunicacion_escrita_nivel_apoyo: "",
      comunicacion_escrita_apoyo: "",
      comunicacion_escrita_nota: "",
      comunicacion_verbal_nivel_apoyo: "",
      comunicacion_verbal_apoyo: "",
      comunicacion_verbal_nota: "",
      decisiones_nivel_apoyo: "",
      toma_decisiones: "",
      toma_decisiones_nota: "",
      aseo_nivel_apoyo: "",
      alimentacion: "",
      aseo_criar_apoyo: "",
      aseo_comunicacion_apoyo: "",
      aseo_ayudas_apoyo: "",
      aseo_alimentacion: "",
      aseo_movilidad_funcional: "",
      aseo_higiene_aseo: "",
      aseo_nota: "",
      instrumentales_nivel_apoyo: "",
      instrumentales_actividades: "",
      instrumentales_criar_apoyo: "",
      instrumentales_comunicacion_apoyo: "",
      instrumentales_movilidad_apoyo: "",
      instrumentales_finanzas: "",
      instrumentales_cocina_limpieza: "",
      instrumentales_crear_hogar: "",
      instrumentales_salud_cuenta_apoyo: "",
      instrumentales_nota: "",
      actividades_nivel_apoyo: "",
      actividades_apoyo: "",
      actividades_esparcimiento_apoyo: "",
      actividades_esparcimiento_cuenta_apoyo: "",
      actividades_complementarios_apoyo: "",
      actividades_complementarios_cuenta_apoyo: "",
      actividades_subsidios_cuenta_apoyo: "",
      actividades_nota: "",
      discriminacion_nivel_apoyo: "",
      discriminacion: "",
      discriminacion_violencia_apoyo: "",
      discriminacion_violencia_cuenta_apoyo: "",
      discriminacion_vulneracion_apoyo: "",
      discriminacion_vulneracion_cuenta_apoyo: "",
      discriminacion_nota: "",
    });

    expect(hasSeleccionUsuariosRecaReplaceTargetData(rowWithDerivedSentinel)).toBe(
      false
    );
    expect(isSeleccionUsuariosRecaPrefillRowEmpty(rowWithDerivedSentinel)).toBe(
      true
    );
  });
});
