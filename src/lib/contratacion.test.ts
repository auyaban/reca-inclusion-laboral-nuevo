import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTRATACION_VINCULADOS_CONFIG,
  getDefaultContratacionValues,
  isContratacionVinculadoComplete,
  normalizeContratacionValues,
  normalizeGrupoEtnicoCual,
} from "@/lib/contratacion";
import { normalizeNullableContractDateText } from "@/lib/personFieldDerivations";
import { contratacionSchema } from "@/lib/validations/contratacion";

const EMPRESA = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: null,
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

const VALID_VINCULADO_INPUT = {
  nombre_oferente: "Ana Perez",
  cedula: "123",
  certificado_porcentaje: "45%",
  discapacidad: "Discapacidad auditiva",
  telefono_oferente: "3000000000",
  genero: "Binario",
  correo_oferente: "ana@correo.com",
  fecha_nacimiento: "1990-01-01",
  edad: "34",
  lgtbiq: "No aplica",
  grupo_etnico: "No",
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
  contrato_comprendido_observacion: "0. Comprende con claridad el contrato.",
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
  prestaciones_prima_observacion: "0. Conoce los beneficios y la aplicacion.",
  prestaciones_prima_nota: "Sin novedad",
  prestaciones_seguridad_social_nivel_apoyo: "0. No requiere apoyo.",
  prestaciones_seguridad_social_observacion:
    "0. Conoce los beneficios y la aplicacion.",
  prestaciones_seguridad_social_nota: "Sin novedad",
  prestaciones_vacaciones_nivel_apoyo: "0. No requiere apoyo.",
  prestaciones_vacaciones_observacion:
    "0. Conoce los beneficios y la aplicacion.",
  prestaciones_vacaciones_nota: "Sin novedad",
  prestaciones_auxilios_beneficios_nivel_apoyo: "0. No requiere apoyo.",
  prestaciones_auxilios_beneficios_observacion:
    "0. Conoce los beneficios y la aplicacion.",
  prestaciones_auxilios_beneficios_nota: "Sin novedad",
  conducto_regular_nivel_apoyo: "0. No requiere apoyo.",
  conducto_regular_observacion: "0. Conoce el conducto regular.",
  descargos_observacion: "Si conoce que es una diligencia de descargos.",
  tramites_observacion:
    "Conoce como es el proceso para realizar tramites administrativos (certificaciones, afiliaciones, descuentos, desprendibles de nomina).",
  permisos_observacion: "Conoce como es el proceso de solicitud de permisos.",
  conducto_regular_nota: "Sin novedad",
  causales_fin_nivel_apoyo: "0. No requiere apoyo.",
  causales_fin_observacion:
    "0. Tiene claro las causales de cancelacion del contrato.",
  causales_fin_nota: "Sin novedad",
  rutas_atencion_nivel_apoyo: "0. No requiere apoyo.",
  rutas_atencion_observacion: "0. Tiene claro cuales son las rutas de atencion.",
  rutas_atencion_nota: "Sin novedad",
} as const;

afterEach(() => {
  vi.useRealTimers();
});

describe("contratacion normalization", () => {
  it("creates one visible vinculado by default", () => {
    const values = getDefaultContratacionValues(EMPRESA);

    expect(values.vinculados).toHaveLength(1);
    expect(values.vinculados[0]?.numero).toBe("1");
    expect(values.asistentes).toHaveLength(2);
    expect(CONTRATACION_VINCULADOS_CONFIG.itemLabelSingular).toBe("Vinculado");
  });

  it("keeps the card title numeric and exposes nombre + cedula as subtitle summary", () => {
    const row = normalizeContratacionValues(
      {
        vinculados: [
          {
            ...VALID_VINCULADO_INPUT,
            nombre_oferente: "Ana Perez",
            cedula: "1000061994",
          },
        ],
      },
      EMPRESA
    ).vinculados[0]!;

    expect(CONTRATACION_VINCULADOS_CONFIG.getCardTitle?.(row, 0)).toBe(
      "Vinculado 1"
    );
    expect(CONTRATACION_VINCULADOS_CONFIG.getCardSubtitle?.(row, 0)).toBe(
      "Ana Perez - 1000061994"
    );
  });

  it("normalizes grupo etnico cual to No aplica when grupo etnico is not Si", () => {
    const values = normalizeContratacionValues(
      {
        vinculados: [
          {
            nombre_oferente: "Ana Perez",
            grupo_etnico: "No",
            grupo_etnico_cual: "",
          },
          {
            nombre_oferente: "Juan Ruiz",
            grupo_etnico: "Si",
            grupo_etnico_cual: "Afocolombiano",
          },
        ],
      },
      EMPRESA
    );

    expect(values.vinculados[0]?.grupo_etnico_cual).toBe("No aplica");
    expect(values.vinculados[1]?.grupo_etnico_cual).toBe("Afocolombiano");
    expect(values.vinculados[0]?.numero).toBe("1");
    expect(values.vinculados[1]?.numero).toBe("2");
  });

  it("preserves No aplica when grupo etnico is Si", () => {
    const values = normalizeContratacionValues(
      {
        vinculados: [
          {
            nombre_oferente: "Ana Perez",
            grupo_etnico: "Si",
            grupo_etnico_cual: "No aplica",
          },
        ],
      },
      EMPRESA
    );

    expect(values.vinculados[0]?.grupo_etnico_cual).toBe("No aplica");
    expect(
      normalizeGrupoEtnicoCual("Si", "No aplica")
    ).toBe("No aplica");
  });

  it("detects when a meaningful vinculado row is complete", () => {
    const row = normalizeContratacionValues(
      {
        vinculados: [VALID_VINCULADO_INPUT],
      },
      EMPRESA
    ).vinculados[0]!;

    expect(isContratacionVinculadoComplete(row)).toBe(true);
  });

  it('accepts "No aplica" in schema when grupo_etnico is Si', () => {
    const result = contratacionSchema.safeParse(
      normalizeContratacionValues(
        {
          desarrollo_actividad: "Actividad compartida",
          ajustes_recomendaciones: "Ajuste final",
          asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
          vinculados: [
            {
              ...VALID_VINCULADO_INPUT,
              grupo_etnico: "Si",
              grupo_etnico_cual: "No aplica",
            },
          ],
        },
        EMPRESA
      )
    );

    expect(result.success).toBe(true);
  });

  it("requires desarrollo_actividad when there is at least one meaningful vinculado", () => {
    const result = contratacionSchema.safeParse(
      normalizeContratacionValues(
        {
          desarrollo_actividad: "",
          ajustes_recomendaciones: "Ajuste final",
          asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
          vinculados: [VALID_VINCULADO_INPUT],
        },
        EMPRESA
      )
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["desarrollo_actividad"],
            message: "El desarrollo de la actividad es requerido",
          }),
        ])
      );
    }
  });

  it("accepts empty note fields inside vinculados", () => {
    const result = contratacionSchema.safeParse(
      normalizeContratacionValues(
        {
          desarrollo_actividad: "Actividad compartida",
          ajustes_recomendaciones: "Ajuste final",
          asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
          vinculados: [
            {
              ...VALID_VINCULADO_INPUT,
              contrato_lee_nota: "",
              condiciones_salariales_nota: "",
            },
          ],
        },
        EMPRESA
      )
    );

    expect(result.success).toBe(true);
  });

  it("derives edad from fecha_nacimiento and preserves empty fecha_fin in form state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00-05:00"));

    const values = normalizeContratacionValues(
      {
        vinculados: [
          {
            ...VALID_VINCULADO_INPUT,
            fecha_nacimiento: "1990-04-16",
            edad: "99",
            fecha_fin: "   ",
          },
        ],
      },
      EMPRESA
    );

    expect(values.vinculados[0]?.edad).toBe("35");
    expect(values.vinculados[0]?.fecha_fin).toBe("");
  });

  it("accepts empty fecha_fin and normalizes it to null in the output helper", () => {
    const result = contratacionSchema.safeParse(
      normalizeContratacionValues(
        {
          desarrollo_actividad: "Actividad compartida",
          ajustes_recomendaciones: "Ajuste final",
          asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
          vinculados: [
            {
              ...VALID_VINCULADO_INPUT,
              fecha_fin: "",
            },
          ],
        },
        EMPRESA
      )
    );

    expect(result.success).toBe(true);
    expect(normalizeNullableContractDateText("   ")).toBeNull();
  });
});
