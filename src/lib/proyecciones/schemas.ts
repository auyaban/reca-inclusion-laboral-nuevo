import { z } from "zod";
import {
  isInterpreterSuggestedService,
  PROYECCION_ESTADOS,
  PROYECCION_MAIN_SERVICE_KEYS,
  PROYECCION_MODALIDADES,
  PROYECCION_NORMAL_MODALIDADES,
  PROYECCION_TAMANO_EMPRESA_BUCKETS,
  requiresProjectedPeopleCount,
  type ProyeccionEstado,
} from "@/lib/proyecciones/constants";

const uuidSchema = z.string().uuid("Selecciona una empresa valida.");
const isoDateTimeSchema = z.string().datetime({
  offset: true,
  message: "Selecciona una fecha y hora validas.",
});

function trimText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const optionalText = z.preprocess(
  trimText,
  z.string().max(1000, "El texto puede tener maximo 1000 caracteres.").nullable()
);

const optionalShortText = z.preprocess(
  trimText,
  z.string().max(500, "El texto puede tener maximo 500 caracteres.").nullable()
);

const positiveInteger = z.coerce
  .number({ invalid_type_error: "Ingresa un numero valido." })
  .int("Ingresa un numero entero.")
  .positive("Ingresa un numero mayor a cero.");

const positiveNumber = z.coerce
  .number({ invalid_type_error: "Ingresa un numero valido." })
  .positive("Ingresa un numero mayor a cero.");

export const proyeccionServiceKeySchema = z.enum(PROYECCION_MAIN_SERVICE_KEYS);
export const proyeccionModalidadSchema = z.enum(PROYECCION_MODALIDADES);
export const proyeccionNormalModalidadSchema = z.enum(PROYECCION_NORMAL_MODALIDADES);
export const proyeccionEstadoSchema = z.enum(PROYECCION_ESTADOS);
export const proyeccionTamanoEmpresaBucketSchema = z.enum(
  PROYECCION_TAMANO_EMPRESA_BUCKETS
);

const createProjectionBaseSchema = z.object({
  empresaId: uuidSchema,
  serviceKey: proyeccionServiceKeySchema,
  inicioAt: isoDateTimeSchema,
  duracionMinutos: z.coerce
    .number()
    .int("Ingresa una duracion en minutos.")
    .min(1, "La duracion debe ser mayor a cero.")
    .max(1440, "La duracion no puede superar 24 horas."),
  modalidad: proyeccionModalidadSchema,
  cantidadPersonas: positiveInteger.nullable().default(null),
  numeroSeguimiento: positiveInteger.max(6, "El seguimiento maximo inicial es 6.").nullable().default(null),
  tamanoEmpresaBucket: proyeccionTamanoEmpresaBucketSchema.nullable().default(null),
  notes: optionalText.default(null),
  requiresInterpreter: z.coerce.boolean().default(false),
  interpreterCount: positiveInteger.nullable().default(null),
  interpreterProjectedHours: positiveNumber.max(24, "Las horas proyectadas no pueden superar 24.").nullable().default(null),
  interpreterExceptionReason: optionalShortText.default(null),
});

function validateProjectionBusinessRules(
  value: z.infer<typeof createProjectionBaseSchema>,
  ctx: z.RefinementCtx
) {
  if (value.modalidad === "todas_las_modalidades") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["modalidad"],
      message: "Todas las modalidades aplica solo a interpretes.",
    });
  }

  if (requiresProjectedPeopleCount(value.serviceKey) && !value.cantidadPersonas) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cantidadPersonas"],
      message: "Indica para cuantas personas se proyecta el servicio.",
    });
  }

  if (value.serviceKey === "follow_up" && !value.numeroSeguimiento) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["numeroSeguimiento"],
      message: "Indica el numero de seguimiento.",
    });
  }

  if (value.requiresInterpreter) {
    if (!value.interpreterCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interpreterCount"],
        message: "Indica cuantos interpretes se requieren.",
      });
    }

    if (!value.interpreterProjectedHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interpreterProjectedHours"],
        message: "Indica cuantas horas de interprete se proyectan.",
      });
    }

    if (
      !isInterpreterSuggestedService(value.serviceKey) &&
      !value.interpreterExceptionReason
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interpreterExceptionReason"],
        message: "Explica por que este servicio requiere interprete.",
      });
    }
  }
}

export const createProyeccionSchema = createProjectionBaseSchema.superRefine(
  validateProjectionBusinessRules
);

export const updateProyeccionSchema = createProjectionBaseSchema
  .omit({ empresaId: true })
  .partial()
  .superRefine((value, ctx) => {
    const merged = {
      empresaId: "11111111-1111-4111-8111-111111111111",
      serviceKey: value.serviceKey ?? "program_presentation",
      inicioAt: value.inicioAt ?? "2026-01-01T00:00:00.000Z",
      duracionMinutos: value.duracionMinutos ?? 60,
      modalidad: value.modalidad ?? "presencial",
      cantidadPersonas: value.cantidadPersonas ?? null,
      numeroSeguimiento: value.numeroSeguimiento ?? null,
      tamanoEmpresaBucket: value.tamanoEmpresaBucket ?? null,
      notes: value.notes ?? null,
      requiresInterpreter: value.requiresInterpreter ?? false,
      interpreterCount: value.interpreterCount ?? null,
      interpreterProjectedHours: value.interpreterProjectedHours ?? null,
      interpreterExceptionReason: value.interpreterExceptionReason ?? null,
    };

    validateProjectionBusinessRules(merged, ctx);
  });

export const cancelProyeccionSchema = z.object({
  comentario: optionalShortText.default(null),
});

export type CreateProyeccionInput = z.infer<typeof createProyeccionSchema>;
export type UpdateProyeccionInput = z.infer<typeof updateProyeccionSchema>;
export type CancelProyeccionInput = z.infer<typeof cancelProyeccionSchema>;

export type ProyeccionesListParams = {
  from: string;
  to: string;
  profesionalId: number | null;
  empresaId: string;
  serviceKey: string;
  estado: ProyeccionEstado | "";
  includeInterpreter: boolean;
};

function parseIsoParam(value: string | null, fallback: string) {
  const parsed = isoDateTimeSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function parseOptionalInt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseEstado(value: string | null): ProyeccionEstado | "" {
  return (PROYECCION_ESTADOS as readonly string[]).includes(value ?? "")
    ? (value as ProyeccionEstado)
    : "";
}

function parseServiceKey(value: string | null) {
  if (
    typeof value === "string" &&
    (PROYECCION_MAIN_SERVICE_KEYS as readonly string[]).includes(value)
  ) {
    return value;
  }

  if (value === "interpreter_service") {
    return value;
  }

  return "";
}

function defaultRange() {
  const now = new Date();
  const from = new Date(now);
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 7);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function parseProyeccionesListParams(
  searchParams: URLSearchParams
): ProyeccionesListParams {
  const range = defaultRange();
  return {
    from: parseIsoParam(searchParams.get("from"), range.from),
    to: parseIsoParam(searchParams.get("to"), range.to),
    profesionalId: parseOptionalInt(searchParams.get("profesionalId")),
    empresaId: uuidSchema.safeParse(searchParams.get("empresaId")).success
      ? searchParams.get("empresaId") ?? ""
      : "",
    serviceKey: parseServiceKey(searchParams.get("serviceKey")),
    estado: parseEstado(searchParams.get("estado")),
    includeInterpreter: searchParams.get("includeInterpreter") !== "false",
  };
}
