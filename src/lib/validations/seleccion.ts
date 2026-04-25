import { z } from "zod";
import { getMeaningfulAsistentes, normalizeAsistenteLike } from "@/lib/asistentes";
import {
  FAILED_VISIT_AUDIT_FIELD,
  failedVisitAuditFieldSchema,
} from "@/lib/failedVisitContract";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";
import { isMeaningfulRepeatedPeopleValue } from "@/lib/repeatedPeople";

export { MODALIDAD_OPTIONS };

export const SELECCION_MIN_SIGNIFICANT_OFERENTES = 1;
export const SELECCION_MIN_SIGNIFICANT_ATTENDEES = 1;
export const SELECCION_BASE_ATTENDEES_ROWS = 2;
export const SELECCION_OFERENTE_BLOCK_HEIGHT = 61;

export const SELECCION_OFERENTE_FIELDS = [
  { id: "numero", label: "No", kind: "texto" },
  { id: "nombre_oferente", label: "Nombre oferente", kind: "texto" },
  { id: "cedula", label: "Cedula", kind: "texto" },
  { id: "certificado_porcentaje", label: "Certificado %", kind: "texto" },
  {
    id: "discapacidad",
    label: "Discapacidad",
    kind: "lista",
    options: [
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
    ],
  },
  { id: "telefono_oferente", label: "Telefono oferente", kind: "texto" },
  {
    id: "resultado_certificado",
    label: "Resultado",
    kind: "lista",
    options: ["Aprobado", "No aprobado", "Pendiente"],
  },
  { id: "cargo_oferente", label: "Cargo oferente", kind: "texto" },
  {
    id: "nombre_contacto_emergencia",
    label: "Nombre contacto emergencia",
    kind: "texto",
  },
  { id: "parentesco", label: "Parentesco", kind: "texto" },
  { id: "telefono_emergencia", label: "Telefono", kind: "texto" },
  { id: "fecha_nacimiento", label: "Fecha de nacimiento", kind: "texto" },
  { id: "edad", label: "Edad", kind: "texto" },
  {
    id: "pendiente_otros_oferentes",
    label: "Pendiente otros oferentes",
    kind: "lista",
    options: ["Si", "No", "Por Confirmar"],
  },
  { id: "lugar_firma_contrato", label: "Lugar firma de contrato", kind: "texto" },
  { id: "fecha_firma_contrato", label: "Fecha firma de contrato", kind: "texto" },
  {
    id: "cuenta_pension",
    label: "Cuenta con pension",
    kind: "lista",
    options: ["Si", "No", "Por Confirmar"],
  },
  {
    id: "tipo_pension",
    label: "Tipo de pension",
    kind: "lista",
    options: [
      "Pension Invalidez",
      "Subsidiada",
      "Especial de vejez",
      "Victimas conflicto",
      "Familiar",
      "Regimen especial",
      "No aplica",
    ],
  },
  {
    id: "medicamentos_nivel_apoyo",
    label: "Toma medicamentos - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "medicamentos_conocimiento",
    label: "Toma medicamentos - Conocimiento de medicamentos",
    kind: "lista",
    options: [
      "1. Conoce los medicamentos que consume.",
      "2. Un tercero es quien conoce los medicamentos que consume.",
      "3. No conoce los medicamentos que consume.",
      "No aplica.",
      "0. No requiere apoyo.",
    ],
  },
  {
    id: "medicamentos_horarios",
    label: "Toma medicamentos - Conocimiento de horarios",
    kind: "lista",
    options: [
      "1. Conoce los horarios de toma de medicamentos que consume.",
      "2. Es un tercero quien conoce los horarios de la toma de medicamentos.",
      "3. No conoce los horarios de toma de medicamentos que consume.",
      "0. No requiere apoyo.",
      "No aplica.",
    ],
  },
  { id: "medicamentos_nota", label: "Toma medicamentos - Nota", kind: "texto" },
  {
    id: "alergias_nivel_apoyo",
    label: "Presenta alergia - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "alergias_tipo",
    label: "Presenta alergia - Tipo de alergia",
    kind: "lista",
    options: [
      "0. No presenta alergias.",
      "1. Presenta alergias y sabe darle manejo.",
      "2. No conoce si presenta alguna alergia.",
      "3. Presenta alergias a: medicamentos, sustancias y productos quimicos, alimentos, animales, entre otros.",
      "No aplica.",
    ],
  },
  { id: "alergias_nota", label: "Presenta alergia - Nota", kind: "texto" },
  {
    id: "restriccion_nivel_apoyo",
    label: "Tiene restriccion medica - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "restriccion_conocimiento",
    label: "Tiene restriccion medica - Conocimiento",
    kind: "lista",
    options: [
      "0. No tiene restricciones medicas.",
      "1. Tiene restricciones medicas y conoce su manejo.",
      "2. No conoce si tiene restricciones medicas.",
      "3. Si tiene restricciones medicas y desconoce su manejo.",
      "No aplica.",
    ],
  },
  { id: "restriccion_nota", label: "Tiene restriccion medica - Nota", kind: "texto" },
  {
    id: "controles_nivel_apoyo",
    label: "Asiste a controles medicos - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "controles_asistencia",
    label: "Asiste a controles medicos - Asistencia a controles",
    kind: "lista",
    options: [
      "No aplica.",
      "2. Si asiste a controles medicos con especialista.",
      "3. No sabe si tiene controles medicos con especialista.",
      "1. Asiste a controles medicos con especialista y conoce el manejo.",
      "0. No requiere apoyo.",
    ],
  },
  {
    id: "controles_frecuencia",
    label: "Asiste a controles medicos - Frecuencia",
    kind: "lista",
    options: ["Mensual", "Trimestral", "Semestral", "Otra frecuencia", "No aplica"],
  },
  { id: "controles_nota", label: "Asiste a controles medicos - Nota", kind: "texto" },
  {
    id: "desplazamiento_nivel_apoyo",
    label: "Desplazamiento independiente - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "desplazamiento_modo",
    label: "Desplazamiento independiente - Modo de desplazamiento",
    kind: "lista",
    options: [
      "0. Se desplaza de manera independiente sin necesidad de apoyos (ortesis, baston, silla de ruedas entre otros).",
      "1. Se desplaza de forma independiente con un apoyo temporal (ortesis, baston, silla de ruedas entre otros).",
      "2. Se desplaza de manera independiente con un apoyo permanente (ortesis, baston, silla de ruedas entre otros).",
      "3. No se desplaza de manera independiente. Requiere el acompanamiento de un tercero y un apoyo (ortesis, baston, silla de ruedas entre otros).",
      "No aplica.",
    ],
  },
  {
    id: "desplazamiento_transporte",
    label: "Desplazamiento independiente - Medio de transporte",
    kind: "lista",
    options: [
      "Caminando.",
      "Bicicleta.",
      "Transmilenio, Sitp.",
      "Vehiculo propio.",
      "Vehiculo especial.",
      "No aplica.",
    ],
  },
  { id: "desplazamiento_nota", label: "Desplazamiento independiente - Nota", kind: "texto" },
  {
    id: "ubicacion_nivel_apoyo",
    label: "Ubicacion en la ciudad - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "ubicacion_ciudad",
    label: "Ubicacion en la ciudad",
    kind: "lista",
    options: [
      "0. Sabe ubicarse en la ciudad de manera autonoma.",
      "1. Sabe ubicarse en la ciudad pero haciendo uso de aplicaciones (Maps, Waze, entre otros).",
      "2. Requiere de acompanamiento para ubicarse.",
      "3. No sabe ubicarse en la ciudad.",
    ],
  },
  {
    id: "ubicacion_aplicaciones",
    label: "Manejo de aplicaciones",
    kind: "lista",
    options: [
      "Se ubica por puntos de referencia y direcciones.",
      "No se ubica por puntos de referencia.",
      "Se ubica por puntos cardinales.",
      "No aplica",
    ],
  },
  { id: "ubicacion_nota", label: "Ubicacion en la ciudad - Nota", kind: "texto" },
  {
    id: "dinero_nivel_apoyo",
    label: "Reconoce y maneja el dinero - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "dinero_reconocimiento",
    label: "Reconocimiento del dinero",
    kind: "lista",
    options: ["Autonomo.", "Con apoyo familiar."],
  },
  {
    id: "dinero_manejo",
    label: "Manejo del dinero",
    kind: "lista",
    options: [
      "0. Reconoce y maneja el dinero de manera autonoma.",
      "1. Reconoce y maneja el dinero pero en ocasiones requiere apoyo.",
      "2. Solo reconoce el dinero pero no lo sabe manejar.",
      "3. No reconoce el dinero y no lo sabe manejar.",
      "No aplica.",
    ],
  },
  {
    id: "dinero_medios",
    label: "Uso de medios electronicos",
    kind: "lista",
    options: [
      "Dinero fisico, plastico y digital.",
      "Dinero fisico y plastico.",
      "Dinero fisico.",
      "Dinero plastico y digital.",
      "Dinero plastico.",
      "Dinero digital.",
      "Dinero digital y fisico.",
    ],
  },
  { id: "dinero_nota", label: "Reconoce y maneja el dinero - Nota", kind: "texto" },
  {
    id: "presentacion_nivel_apoyo",
    label: "Presentacion personal - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "presentacion_personal",
    label: "Presentacion personal",
    kind: "lista",
    options: [
      "0. Su codigo de vestuario es acorde al contexto.",
      "1. Su codigo de vestuario es acorde al contexto, pero presenta oportunidades de mejora.",
      "2. Su codigo de vestuario es medianamente acorde al contexto.",
      "3. Su codigo de vestuario no es acorde al contexto.",
      "No aplica.",
    ],
  },
  { id: "presentacion_nota", label: "Presentacion personal - Nota", kind: "texto" },
  {
    id: "comunicacion_escrita_nivel_apoyo",
    label: "Apoyo comunicacion escrita - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "comunicacion_escrita_apoyo",
    label: "Apoyo comunicacion escrita",
    kind: "lista",
    options: [
      "0. Si conoce y maneja los apoyos (Jaws, Magic, el lector de pantalla de Windows/IOS).",
      "1. Maneja algunos apoyos de comunicacion escrita, pero no todos en general.",
      "2. Conoce pero no maneja apoyos.",
      "3. No conoce, ni maneja los apoyos.",
      "No aplica.",
    ],
  },
  { id: "comunicacion_escrita_nota", label: "Apoyo comunicacion escrita - Nota", kind: "texto" },
  {
    id: "comunicacion_verbal_nivel_apoyo",
    label: "Apoyo comunicacion verbal - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "comunicacion_verbal_apoyo",
    label: "Apoyo comunicacion verbal",
    kind: "lista",
    options: [
      "0. Si conoce y maneja los apoyos (Centro de relevo, entre otros).",
      "1. Maneja algunos apoyos, pero no los conoce todos en general (Centro de relevo, entre otros).",
      "2. Conoce pero no maneja apoyos.",
      "3. No conoce, ni maneja los apoyos.",
      "No aplica.",
    ],
  },
  { id: "comunicacion_verbal_nota", label: "Apoyo comunicacion verbal - Nota", kind: "texto" },
  {
    id: "decisiones_nivel_apoyo",
    label: "Toma de decisiones - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "toma_decisiones",
    label: "Toma de decisiones",
    kind: "lista",
    options: [
      "0. Toma las decisiones de manera autonoma.",
      "1. Toma decisiones pero en ocasiones requiere el apoyo de un tercero.",
      "2. Debe consultar con un tercero para la toma de decisiones.",
      "3. Requiere el apoyo de un tercero para tomar decisiones.",
      "No aplica.",
    ],
  },
  { id: "toma_decisiones_nota", label: "Toma de decisiones - Nota", kind: "texto" },
  {
    id: "aseo_nivel_apoyo",
    label: "Apoyo en aseo personal - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "alimentacion",
    label: "Alimentacion",
    kind: "lista",
    options: [
      "0. No requiere apoyo en sus actividades de la vida diaria.",
      "1. Requiere apoyo en algunas actividades de la vida diaria.",
      "2. Requiere apoyo en la mayoria de actividades de la vida diaria.",
      "3. Requiere apoyo en todas las actividades de la vida diaria.",
      "No aplica.",
    ],
  },
  {
    id: "aseo_criar_apoyo",
    label: "Criar y cuidado de ninos - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "aseo_comunicacion_apoyo",
    label: "Uso de sistemas de comunicacion - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "aseo_ayudas_apoyo",
    label: "Cuidado de ayudas tecnicas - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "aseo_alimentacion",
    label: "Alimentacion",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "aseo_movilidad_funcional",
    label: "Movilidad funcional",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "aseo_higiene_aseo",
    label: "Higiene personal y aseo (Control de esfinter)",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  { id: "aseo_nota", label: "Apoyo en aseo personal - Nota", kind: "texto" },
  {
    id: "instrumentales_nivel_apoyo",
    label: "Apoyo en actividades instrumentales - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "instrumentales_actividades",
    label: "Actividades instrumentales",
    kind: "lista",
    options: [
      "0. No requiere apoyo en actividades instrumentales de la vida diaria.",
      "1. Requiere apoyo en algunas actividades instrumentales de la vida diaria.",
      "2. Requiere apoyo en la mayoria de actividades instrumentales de la vida diaria.",
      "3. Requiere apoyo en todas las actividades instrumentales de la vida diaria.",
      "No aplica.",
    ],
  },
  {
    id: "instrumentales_criar_apoyo",
    label: "Criar y cuidado de ninos - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "instrumentales_comunicacion_apoyo",
    label: "Uso de sistemas de comunicacion - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "instrumentales_movilidad_apoyo",
    label: "Movilidad en la comunidad - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "instrumentales_finanzas",
    label: "Manejo de tematicas financieras",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "instrumentales_cocina_limpieza",
    label: "Cocina y limpieza",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "instrumentales_crear_hogar",
    label: "Crear y mantener un hogar",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "instrumentales_salud_cuenta_apoyo",
    label: "Cuidado de salud y manutencion - Cuenta con apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  { id: "instrumentales_nota", label: "Apoyo en actividades instrumentales - Nota", kind: "texto" },
  {
    id: "actividades_nivel_apoyo",
    label: "Apoyo durante actividades - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "actividades_apoyo",
    label: "Apoyo durante actividades",
    kind: "lista",
    options: [
      "0. No requiere apoyo en sus actividades laborales.",
      "1. Requiere apoyo en algunas actividades laborales.",
      "2. Requiere apoyo en la mayoria de actividades laborales.",
      "3. Requiere apoyo en todas las actividades laborales.",
      "No aplica",
    ],
  },
  {
    id: "actividades_esparcimiento_apoyo",
    label: "Actividades de esparcimiento con familia - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "actividades_esparcimiento_cuenta_apoyo",
    label: "Actividades de esparcimiento con familia - Cuenta con apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "actividades_complementarios_apoyo",
    label: "Complementarios medicos - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "actividades_complementarios_cuenta_apoyo",
    label: "Complementarios medicos - Cuenta con apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "actividades_subsidios_cuenta_apoyo",
    label: "Subsidios economicos para estudio de hijos - Cuenta con apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  { id: "actividades_nota", label: "Apoyo durante actividades - Nota", kind: "texto" },
  {
    id: "discriminacion_nivel_apoyo",
    label: "Discriminacion - Nivel de apoyo",
    kind: "lista",
    options: [
      "0. No requiere apoyo.",
      "1. Nivel de apoyo Bajo.",
      "2. Nivel de apoyo medio.",
      "3. Nivel de apoyo alto.",
      "No aplica.",
    ],
  },
  {
    id: "discriminacion",
    label: "Discriminacion",
    kind: "lista",
    options: [
      "0. No ha sufrido de discriminacion.",
      "1. Ha sufrido de discriminacion en algunos contextos.",
      "2. Ha sufrido de discriminacion en repetidas ocasiones.",
      "3. Ha sufrido de discriminacion a los largo del ciclo vital.",
      "No aplica.",
    ],
  },
  {
    id: "discriminacion_violencia_apoyo",
    label: "Violencia fisica - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "discriminacion_violencia_cuenta_apoyo",
    label: "Violencia fisica - Cuenta con apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "discriminacion_vulneracion_apoyo",
    label: "Vulneracion de derechos - Requiere apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  {
    id: "discriminacion_vulneracion_cuenta_apoyo",
    label: "Vulneracion de derechos - Cuenta con apoyo",
    kind: "lista",
    options: ["Si", "No", "No aplica"],
  },
  { id: "discriminacion_nota", label: "Discriminacion - Nota", kind: "texto" },
] as const;

export type SeleccionOferenteFieldId =
  (typeof SELECCION_OFERENTE_FIELDS)[number]["id"];

export const SELECCION_OFERENTE_FIELD_LABELS = Object.fromEntries(
  SELECCION_OFERENTE_FIELDS.map((field) => [field.id, field.label])
) as Record<SeleccionOferenteFieldId, string>;

export const SELECCION_OFERENTE_FIELDS_BY_ID = Object.fromEntries(
  SELECCION_OFERENTE_FIELDS.map((field) => [field.id, field])
) as Record<
  SeleccionOferenteFieldId,
  (typeof SELECCION_OFERENTE_FIELDS)[number]
>;

export const SELECCION_OFERENTE_REQUIRED_FIELDS = SELECCION_OFERENTE_FIELDS.filter(
  (field) =>
    field.id !== "numero" &&
    field.id !== "edad" &&
    !field.id.endsWith("_nota")
).map((field) => field.id) as Exclude<
  SeleccionOferenteFieldId,
  "numero" | "edad"
>[];

export const SELECCION_OFERENTE_MEANINGFUL_FIELDS = [...SELECCION_OFERENTE_REQUIRED_FIELDS];

export type SeleccionOferenteRow = {
  [K in SeleccionOferenteFieldId]: string;
};

export const seleccionAsistenteSchema = z.object({
  nombre: z.string(),
  cargo: z.string(),
});

export const seleccionOferenteRowSchema = z.object(
  Object.fromEntries(
    SELECCION_OFERENTE_FIELDS.map((field) => [field.id, z.string()])
  ) as Record<SeleccionOferenteFieldId, z.ZodString>
);

export function countMeaningfulSeleccionOferentes(rows: SeleccionOferenteRow[]) {
  return rows.filter((row) =>
    SELECCION_OFERENTE_MEANINGFUL_FIELDS.some((fieldId) =>
      isMeaningfulRepeatedPeopleValue(row[fieldId])
    )
  ).length;
}

export const seleccionSchema = z
  .object({
    [FAILED_VISIT_AUDIT_FIELD]: failedVisitAuditFieldSchema,
    fecha_visita: z.string().trim().min(1, "La fecha es requerida"),
    modalidad: z.enum(MODALIDAD_OPTIONS, {
      required_error: "Selecciona la modalidad",
    }),
    nit_empresa: z.string().trim().min(1, "El NIT es requerido"),
    desarrollo_actividad: z
      .string()
      .trim()
      .min(1, "El desarrollo de la actividad es requerido"),
    ajustes_recomendaciones: z
      .string()
      .trim()
      .min(1, "Los ajustes y recomendaciones son requeridos"),
    nota: z.string(),
    oferentes: z.array(seleccionOferenteRowSchema),
    asistentes: z.array(seleccionAsistenteSchema),
  })
  .superRefine((values, ctx) => {
    const failedVisitAppliedAt = values.failed_visit_applied_at;
    const shouldRequireOferentes = !failedVisitAppliedAt;
    let meaningfulAsistentes = 0;

    values.oferentes.forEach((row, index) => {
      const isMeaningfulRow = SELECCION_OFERENTE_MEANINGFUL_FIELDS.some(
        (fieldId) => isMeaningfulRepeatedPeopleValue(row[fieldId])
      );

      if (!isMeaningfulRow) {
        return;
      }

      if (!shouldRequireOferentes) {
        return;
      }

      SELECCION_OFERENTE_REQUIRED_FIELDS.forEach((fieldId) => {
        if (row[fieldId].trim()) {
          return;
        }

        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${SELECCION_OFERENTE_FIELD_LABELS[fieldId]} es requerido`,
          path: ["oferentes", index, fieldId],
        });
      });

      if (
        row.cuenta_pension.trim() === "No" &&
        row.tipo_pension.trim() !== "No aplica"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Tipo de pension debe ser No aplica cuando no cuenta con pension",
          path: ["oferentes", index, "tipo_pension"],
        });
      }

      if (
        row.cuenta_pension.trim() === "Si" &&
        (!row.tipo_pension.trim() || row.tipo_pension.trim() === "No aplica")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Selecciona un tipo de pension valido cuando cuenta con pension",
          path: ["oferentes", index, "tipo_pension"],
        });
      }
    });

    if (
      shouldRequireOferentes &&
      countMeaningfulSeleccionOferentes(values.oferentes) <
        SELECCION_MIN_SIGNIFICANT_OFERENTES
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agrega al menos un oferente.",
        path: ["oferentes"],
      });
    }

    values.asistentes.forEach((row, index) => {
      const normalized = normalizeAsistenteLike(row);
      if (!normalized.nombre && !normalized.cargo) {
        return;
      }

      meaningfulAsistentes += 1;

      if (!normalized.nombre) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre es requerido",
          path: ["asistentes", index, "nombre"],
        });
      }

      if (!normalized.cargo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El cargo es requerido",
          path: ["asistentes", index, "cargo"],
        });
      }
    });

    if (meaningfulAsistentes < SELECCION_MIN_SIGNIFICANT_ATTENDEES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agrega al menos un asistente significativo.",
        path: ["asistentes"],
      });
    }
  });

export type SeleccionValues = z.infer<typeof seleccionSchema>;
export type SeleccionAsistente = z.infer<typeof seleccionAsistenteSchema>;

export function countMeaningfulSeleccionAsistentes(
  asistentes: SeleccionValues["asistentes"]
) {
  return getMeaningfulAsistentes(asistentes).length;
}
