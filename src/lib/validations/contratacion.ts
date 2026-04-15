import { z } from "zod";
import { getMeaningfulAsistentes, normalizeAsistenteLike } from "@/lib/asistentes";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";

export { MODALIDAD_OPTIONS };

export const CONTRATACION_MIN_SIGNIFICANT_VINCULADOS = 1;
export const CONTRATACION_MIN_SIGNIFICANT_ATTENDEES = 1;
export const CONTRATACION_BASE_ATTENDEES_ROWS = 4;
export const CONTRATACION_VINCULADO_BLOCK_HEIGHT = 52;

export const CONTRATACION_DISCAPACIDAD_OPTIONS = [
  "Discapacidad visual perdida total de la vision",
  "Discapacidad visual baja vision",
  "Discapacidad auditiva",
  "Discapacidad auditiva hipoacusia",
  "Trastorno de espectro autista",
  "Discapacidad intelectual",
  "Discapacidad fisica",
  "Discapacidad fisica usuario en silla de ruedas",
  "Discapacidad psicosocial",
  "Discapacidad multiple",
  "No aplica",
] as const;

export const CONTRATACION_GENERO_OPTIONS = [
  "Binario",
  "No binario",
  "Otro",
] as const;

export const CONTRATACION_LGTBIQ_OPTIONS = [
  "Si",
  "No",
  "No aplica",
  "Prefiere no responder",
] as const;

export const CONTRATACION_GRUPO_ETNICO_OPTIONS = [
  "Si",
  "No",
  "No aplica",
  "Prefiere no responder",
] as const;

export const CONTRATACION_GRUPO_ETNICO_CUAL_OPTIONS = [
  "Afocolombiano",
  "Afrodescendiente",
  "Rom o Gitano",
  "Indigena",
  "Palenquero de San Basilio",
  "Otro",
  "No aplica",
  "Mulato",
  "Autorreconocimiento",
  "Pueblo Indigena",
  "Negro",
  "Raizal del Archipielago de San Andres Y Providencia",
] as const;

export const CONTRATACION_CERTIFICADO_DISCAPACIDAD_OPTIONS = [
  "Si",
  "No",
  "No aplica",
] as const;

export const CONTRATACION_TIPO_CONTRATO_FIRMADO_OPTIONS = [
  "Contrato por obra o labor",
  "Contrato de trabajo a termino fijo",
  "Contrato de trabajo a termino indefinido",
  "Contrato de aprendizaje",
  "Contrato temporal",
  "Contrato a termino indefinido con orden clausulada",
  "Contrato a termino fijo a un ano",
  "Contrato a termino fijo a seis meses",
  "Contrato por prestacion de servicios",
] as const;

export const CONTRATACION_TIPO_CONTRATO_OPTIONS = [
  "Contrato a termino indefinido.",
  "Contrato a termino fijo.",
  "Contrato por obra o labor.",
] as const;

export const CONTRATACION_NIVEL_APOYO_OPTIONS = [
  "0. No requiere apoyo.",
  "1. Nivel de apoyo Bajo.",
  "2. Nivel de apoyo medio.",
  "3. Nivel de apoyo alto.",
  "No aplica.",
] as const;

export const CONTRATACION_LECTURA_CONTRATO_OPTIONS = [
  "1. Se acompana en la lectura del contrato.",
  "2. Se apoya en la lectura del contrato.",
  "3. Cuando requiere un apoyo adicional al del gestor (lector de pantalla, interprete LSC u otro).",
  "No aplica.",
  "0. No requiere apoyo.",
] as const;

export const CONTRATACION_COMPRENDE_CONTRATO_OPTIONS = [
  "1. Comprende la informacion, pero no se familiariza con las caracteristicas del contrato.",
  "2. Explicacion de algunas clausulas del contrato.",
  "3. Explicacion total del contrato.",
  "0. Comprende con claridad el contrato.",
] as const;

export const CONTRATACION_TIPO_CONTRATO_OBSERVACION_OPTIONS = [
  "1. El vinculado reconoce el tipo de contrato, pero no comprende sus condiciones.",
  "2. El vinculado requiere aclaracion de algunas de las condiciones del contrato.",
  "3. El vinculado no conoce ninguna de las condiciones del tipo de contrato a firmar.",
  "0. El vinculado tiene claras las condiciones del tipo de contrato a firmar.",
] as const;

export const CONTRATACION_JORNADA_OPTIONS = [
  "Tiempo Completo.",
  "Medio Tiempo.",
  "Por horas.",
] as const;

export const CONTRATACION_CLAUSULAS_OPTIONS = [
  "Clausula de confidencialidad.",
  "Clausulas adicionales.",
] as const;

export const CONTRATACION_CONDICIONES_SALARIALES_OPTIONS = [
  "1. Se aclaran las condiciones salariales asignadas al cargo.",
  "2. Se explica de manera parcial las condiciones salariales asignadas al cargo.",
  "3. Se explica de manera completa las condiciones salariales asignadas al cargo.",
  "0. Tiene claras las condiciones salariales asignadas al cargo.",
] as const;

export const CONTRATACION_FRECUENCIA_PAGO_OPTIONS = [
  "Pago Semanal.",
  "Pago Quincenal.",
  "Pago Mensual.",
] as const;

export const CONTRATACION_FORMA_PAGO_OPTIONS = [
  "Abono a cuenta bancaria.",
  "Nequi o Daviplata.",
  "Efectivo.",
  "Cheque.",
] as const;

export const CONTRATACION_PRESTACIONES_OPTIONS = [
  "1. Conoce, pero es la primera vez que tiene estos beneficios.",
  "2. Requiere mas informacion.",
  "3. Desconoce.",
  "0. Conoce los beneficios y la aplicacion.",
  "No aplica.",
] as const;

export const CONTRATACION_CONDUCTO_REGULAR_OPTIONS = [
  "1. Conoce el conducto por experiencias anteriores.",
  "2. Requiere mas informacion.",
  "3. Desconoce la informacion.",
  "0. Conoce el conducto regular.",
] as const;

export const CONTRATACION_DESCARGOS_OPTIONS = [
  "Si conoce que es una diligencia de descargos.",
  "NO conoce que es una diligencia de descargos.",
] as const;

export const CONTRATACION_TRAMITES_OPTIONS = [
  "Conoce como es el proceso para realizar tramites administrativos (certificaciones, afiliaciones, descuentos, desprendibles de nomina).",
  "NO Conoce como es el proceso para realizar tramites administrativos (certificaciones, afiliaciones, descuentos, desprendibles de nomina).",
] as const;

export const CONTRATACION_PERMISOS_OPTIONS = [
  "Conoce como es el proceso de solicitud de permisos.",
  "NO Conoce como es el proceso de solicitud de permisos.",
] as const;

export const CONTRATACION_CAUSALES_OPTIONS = [
  "1. Tiene claro las causales de cancelacion del contrato por experiencias anteriores.",
  "2. Requiere aclaracion de algunas causales de cancelacion del contrato.",
  "3. Desconoce las causales de cancelacion del contrato.",
  "0. Tiene claro las causales de cancelacion del contrato.",
] as const;

export const CONTRATACION_RUTAS_OPTIONS = [
  "0. Tiene claro cuales son las rutas de atencion.",
  "1. Requiere aclaracion de cuales son las rutas de atencion.",
  "2. Conoce las rutas de atencion, pero no las usa",
  "3. Desconoce las rutas de atencion.",
  "4. No aplica",
] as const;

export const CONTRATACION_VINCULADO_FIELD_LABELS = {
  numero: "No.",
  nombre_oferente: "Nombre del vinculado",
  cedula: "Cedula",
  certificado_porcentaje: "Certificado porcentaje",
  discapacidad: "Discapacidad",
  telefono_oferente: "Telefono del vinculado",
  genero: "Genero",
  correo_oferente: "Correo del vinculado",
  fecha_nacimiento: "Fecha de nacimiento",
  edad: "Edad",
  lgtbiq: "Pertenece a comunidad LGTBIQ+",
  grupo_etnico: "Grupo etnico",
  grupo_etnico_cual: "Grupo etnico cual",
  cargo_oferente: "Cargo del vinculado",
  contacto_emergencia: "Contacto de emergencia",
  parentesco: "Parentesco",
  telefono_emergencia: "Telefono de emergencia",
  certificado_discapacidad: "Cuenta con certificado de discapacidad",
  lugar_firma_contrato: "Lugar firma de contrato",
  fecha_firma_contrato: "Fecha firma de contrato",
  tipo_contrato: "Tipo de contrato firmado",
  fecha_fin: "Fecha fin contrato",
  contrato_lee_nivel_apoyo: "Lectura del contrato nivel de apoyo",
  contrato_lee_observacion: "Lectura del contrato observacion",
  contrato_lee_nota: "Lectura del contrato nota",
  contrato_comprendido_nivel_apoyo:
    "Comprension del contrato nivel de apoyo",
  contrato_comprendido_observacion:
    "Comprension del contrato observacion",
  contrato_comprendido_nota: "Comprension del contrato nota",
  contrato_tipo_nivel_apoyo: "Tipo de contrato nivel de apoyo",
  contrato_tipo_observacion: "Tipo de contrato observacion",
  contrato_tipo_contrato: "Tipo de contrato valor",
  contrato_jornada: "Jornada laboral",
  contrato_clausulas: "Clausulas del contrato",
  contrato_tipo_nota: "Tipo de contrato nota",
  condiciones_salariales_nivel_apoyo:
    "Condiciones salariales nivel de apoyo",
  condiciones_salariales_observacion:
    "Condiciones salariales observacion",
  condiciones_salariales_frecuencia_pago: "Frecuencia de pago",
  condiciones_salariales_forma_pago: "Forma de pago",
  condiciones_salariales_nota: "Condiciones salariales nota",
  prestaciones_cesantias_nivel_apoyo: "Cesantias nivel de apoyo",
  prestaciones_cesantias_observacion: "Cesantias observacion",
  prestaciones_cesantias_nota: "Cesantias nota",
  prestaciones_auxilio_transporte_nivel_apoyo:
    "Auxilio de transporte nivel de apoyo",
  prestaciones_auxilio_transporte_observacion:
    "Auxilio de transporte observacion",
  prestaciones_auxilio_transporte_nota: "Auxilio de transporte nota",
  prestaciones_prima_nivel_apoyo: "Prima nivel de apoyo",
  prestaciones_prima_observacion: "Prima observacion",
  prestaciones_prima_nota: "Prima nota",
  prestaciones_seguridad_social_nivel_apoyo:
    "Seguridad social nivel de apoyo",
  prestaciones_seguridad_social_observacion:
    "Seguridad social observacion",
  prestaciones_seguridad_social_nota: "Seguridad social nota",
  prestaciones_vacaciones_nivel_apoyo: "Vacaciones nivel de apoyo",
  prestaciones_vacaciones_observacion: "Vacaciones observacion",
  prestaciones_vacaciones_nota: "Vacaciones nota",
  prestaciones_auxilios_beneficios_nivel_apoyo:
    "Beneficios nivel de apoyo",
  prestaciones_auxilios_beneficios_observacion:
    "Beneficios observacion",
  prestaciones_auxilios_beneficios_nota: "Beneficios nota",
  conducto_regular_nivel_apoyo: "Conducto regular nivel de apoyo",
  conducto_regular_observacion: "Conducto regular observacion",
  descargos_observacion: "Diligencia de descargos",
  tramites_observacion: "Tramites administrativos",
  permisos_observacion: "Solicitud de permisos",
  conducto_regular_nota: "Conducto regular nota",
  causales_fin_nivel_apoyo: "Causales fin de contrato nivel de apoyo",
  causales_fin_observacion: "Causales fin de contrato observacion",
  causales_fin_nota: "Causales fin de contrato nota",
  rutas_atencion_nivel_apoyo: "Rutas de atencion nivel de apoyo",
  rutas_atencion_observacion: "Rutas de atencion observacion",
  rutas_atencion_nota: "Rutas de atencion nota",
} as const;

export type ContratacionVinculadoFieldId =
  keyof typeof CONTRATACION_VINCULADO_FIELD_LABELS;

export const CONTRATACION_VINCULADO_REQUIRED_FIELDS = [
  "nombre_oferente",
  "cedula",
  "certificado_porcentaje",
  "discapacidad",
  "telefono_oferente",
  "genero",
  "correo_oferente",
  "fecha_nacimiento",
  "edad",
  "lgtbiq",
  "grupo_etnico",
  "grupo_etnico_cual",
  "cargo_oferente",
  "contacto_emergencia",
  "parentesco",
  "telefono_emergencia",
  "certificado_discapacidad",
  "lugar_firma_contrato",
  "fecha_firma_contrato",
  "tipo_contrato",
  "fecha_fin",
  "contrato_lee_nivel_apoyo",
  "contrato_lee_observacion",
  "contrato_lee_nota",
  "contrato_comprendido_nivel_apoyo",
  "contrato_comprendido_observacion",
  "contrato_comprendido_nota",
  "contrato_tipo_nivel_apoyo",
  "contrato_tipo_observacion",
  "contrato_tipo_contrato",
  "contrato_jornada",
  "contrato_clausulas",
  "contrato_tipo_nota",
  "condiciones_salariales_nivel_apoyo",
  "condiciones_salariales_observacion",
  "condiciones_salariales_frecuencia_pago",
  "condiciones_salariales_forma_pago",
  "condiciones_salariales_nota",
  "prestaciones_cesantias_nivel_apoyo",
  "prestaciones_cesantias_observacion",
  "prestaciones_cesantias_nota",
  "prestaciones_auxilio_transporte_nivel_apoyo",
  "prestaciones_auxilio_transporte_observacion",
  "prestaciones_auxilio_transporte_nota",
  "prestaciones_prima_nivel_apoyo",
  "prestaciones_prima_observacion",
  "prestaciones_prima_nota",
  "prestaciones_seguridad_social_nivel_apoyo",
  "prestaciones_seguridad_social_observacion",
  "prestaciones_seguridad_social_nota",
  "prestaciones_vacaciones_nivel_apoyo",
  "prestaciones_vacaciones_observacion",
  "prestaciones_vacaciones_nota",
  "prestaciones_auxilios_beneficios_nivel_apoyo",
  "prestaciones_auxilios_beneficios_observacion",
  "prestaciones_auxilios_beneficios_nota",
  "conducto_regular_nivel_apoyo",
  "conducto_regular_observacion",
  "descargos_observacion",
  "tramites_observacion",
  "permisos_observacion",
  "conducto_regular_nota",
  "causales_fin_nivel_apoyo",
  "causales_fin_observacion",
  "causales_fin_nota",
  "rutas_atencion_nivel_apoyo",
  "rutas_atencion_observacion",
  "rutas_atencion_nota",
] as const satisfies readonly ContratacionVinculadoFieldId[];

export const CONTRATACION_VINCULADO_MEANINGFUL_FIELDS =
  CONTRATACION_VINCULADO_REQUIRED_FIELDS;

export type ContratacionVinculadoRow = {
  [K in ContratacionVinculadoFieldId]: string;
};

export const contratacionAsistenteSchema = z.object({
  nombre: z.string(),
  cargo: z.string(),
});

export const contratacionVinculadoRowSchema = z.object(
  Object.fromEntries(
    Object.keys(CONTRATACION_VINCULADO_FIELD_LABELS).map((fieldId) => [
      fieldId,
      z.string(),
    ])
  ) as Record<ContratacionVinculadoFieldId, z.ZodString>
);

function isMeaningfulValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => isMeaningfulValue(entry));
  }

  return false;
}

export function countMeaningfulContratacionVinculados(
  rows: ContratacionVinculadoRow[]
) {
  return rows.filter((row) =>
    CONTRATACION_VINCULADO_MEANINGFUL_FIELDS.some((fieldId) =>
      isMeaningfulValue(row[fieldId])
    )
  ).length;
}

export const contratacionSchema = z
  .object({
    fecha_visita: z.string().trim().min(1, "La fecha es requerida"),
    modalidad: z.enum(MODALIDAD_OPTIONS, {
      required_error: "Selecciona la modalidad",
    }),
    nit_empresa: z.string().trim().min(1, "El NIT es requerido"),
    desarrollo_actividad: z.string(),
    ajustes_recomendaciones: z
      .string()
      .trim()
      .min(1, "Los ajustes y recomendaciones son requeridos"),
    vinculados: z
      .array(contratacionVinculadoRowSchema)
      .superRefine((rows, ctx) => {
        let meaningfulRows = 0;

        rows.forEach((row, index) => {
          const isMeaningfulRow = CONTRATACION_VINCULADO_MEANINGFUL_FIELDS.some(
            (fieldId) => isMeaningfulValue(row[fieldId])
          );

          if (!isMeaningfulRow) {
            return;
          }

          meaningfulRows += 1;

          CONTRATACION_VINCULADO_REQUIRED_FIELDS.forEach((fieldId) => {
            if (row[fieldId].trim()) {
              return;
            }

            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${CONTRATACION_VINCULADO_FIELD_LABELS[fieldId]} es requerido`,
              path: [index, fieldId],
            });
          });
        });

        if (meaningfulRows < CONTRATACION_MIN_SIGNIFICANT_VINCULADOS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Agrega al menos un vinculado.",
          });
        }
      }),
    asistentes: z.array(contratacionAsistenteSchema).superRefine((rows, ctx) => {
      let meaningfulRows = 0;

      rows.forEach((row, index) => {
        const normalized = normalizeAsistenteLike(row);
        if (!normalized.nombre && !normalized.cargo) {
          return;
        }

        meaningfulRows += 1;

        if (!normalized.nombre) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El nombre es requerido",
            path: [index, "nombre"],
          });
        }

        if (!normalized.cargo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El cargo es requerido",
            path: [index, "cargo"],
          });
        }
      });

      if (meaningfulRows < CONTRATACION_MIN_SIGNIFICANT_ATTENDEES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Agrega al menos un asistente significativo.",
        });
      }
    }),
  })
  .superRefine((values, ctx) => {
    if (
      countMeaningfulContratacionVinculados(values.vinculados) > 0 &&
      values.desarrollo_actividad.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El desarrollo de la actividad es requerido",
        path: ["desarrollo_actividad"],
      });
    }
  });

export type ContratacionValues = z.infer<typeof contratacionSchema>;
export type ContratacionAsistente = z.infer<typeof contratacionAsistenteSchema>;

export function countMeaningfulContratacionAsistentes(
  asistentes: ContratacionValues["asistentes"]
) {
  return getMeaningfulAsistentes(asistentes).length;
}
