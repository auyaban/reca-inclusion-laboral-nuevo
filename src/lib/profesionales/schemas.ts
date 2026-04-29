import { z } from "zod";
import { APP_ROLES } from "@/lib/auth/appRoles";
import {
  countProfesionalNameWords,
  isRecaEmail,
  normalizeProfesionalEmail,
  normalizeProfesionalName,
  normalizeProfesionalProgram,
  PROFESIONAL_PROGRAM_OPTIONS,
} from "@/lib/profesionales/normalization";

const nullableText = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const nullableInteger = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().min(0).nullable());

const profesionalNameSchema = z.preprocess(
  normalizeProfesionalName,
  z.string().min(1, "El nombre del profesional es obligatorio.")
);

const profesionalEmailSchema = z.preprocess(
  normalizeProfesionalEmail,
  z.string().email("Ingresa un correo válido.").nullable()
);

const profesionalProgramSchema = z.preprocess(
  normalizeProfesionalProgram,
  z.enum(PROFESIONAL_PROGRAM_OPTIONS, {
    errorMap: () => ({ message: "Selecciona un programa válido." }),
  })
);

const appRoleSchema = z.enum(APP_ROLES);

export const profesionalAccessModeSchema = z.enum(["catalogo", "auth"]);

function validateNameLength(
  value: { nombre_profesional: string },
  context: z.RefinementCtx
) {
  const wordCount = countProfesionalNameWords(value.nombre_profesional);
  if (wordCount < 2 || wordCount > 5) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nombre_profesional"],
      message: "El nombre debe tener entre 2 y 5 palabras.",
    });
  }
}

function validateEmailAndLoginFormat(
  value: {
    correo_profesional: string | null;
    usuario_login: string | null;
  },
  context: z.RefinementCtx
) {
  if (value.correo_profesional && !isRecaEmail(value.correo_profesional)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["correo_profesional"],
      message: "El correo debe pertenecer a @recacolombia.org.",
    });
  }

  if (value.usuario_login && /\s/.test(value.usuario_login)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["usuario_login"],
      message: "El usuario login no puede tener espacios.",
    });
  }
}

function validateAuthAccess(
  value: {
    accessMode: z.infer<typeof profesionalAccessModeSchema>;
    correo_profesional: string | null;
    roles: string[];
  },
  context: z.RefinementCtx
) {
  if (value.accessMode === "catalogo") {
    if (value.roles.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roles"],
        message: "Los perfiles sin acceso no pueden tener roles.",
      });
    }
    return;
  }

  if (!value.correo_profesional) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["correo_profesional"],
      message: "El correo es obligatorio para habilitar acceso.",
    });
  }

  if (value.roles.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roles"],
      message: "Selecciona al menos un rol para habilitar acceso.",
    });
  }
}

const profesionalBaseObjectSchema = z.object({
  accessMode: profesionalAccessModeSchema.default("catalogo"),
  nombre_profesional: profesionalNameSchema,
  correo_profesional: profesionalEmailSchema.default(null),
  programa: profesionalProgramSchema.default("Inclusión Laboral"),
  antiguedad: nullableInteger.default(null),
  usuario_login: nullableText.default(null),
  roles: z.array(appRoleSchema).default([]),
});

export const profesionalBaseSchema = profesionalBaseObjectSchema.superRefine(
  (value, context) => {
    validateNameLength(value, context);
    validateEmailAndLoginFormat(value, context);
    validateAuthAccess(value, context);
  }
);

export const createProfesionalSchema = profesionalBaseSchema;
export const updateProfesionalSchema = profesionalBaseSchema;

export const enableProfesionalAccessSchema = profesionalBaseObjectSchema
  .pick({
    correo_profesional: true,
    usuario_login: true,
    roles: true,
  })
  .extend({
    accessMode: z.literal("auth").default("auth"),
  })
  .superRefine((value, context) => {
    validateEmailAndLoginFormat(value, context);
    validateAuthAccess(value, context);
  });

export const deleteProfesionalSchema = z.object({
  comentario: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, "El comentario es obligatorio para eliminar un profesional.")
  ),
});

export const restoreProfesionalSchema = z.object({
  comentario: nullableText.default(null),
});

export const resetProfesionalPasswordSchema = z.object({});

export const changeTemporaryPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener mínimo 8 caracteres.")
      .max(255, "La contraseña no puede superar 255 caracteres.")
      .regex(/[a-zA-Z]/, "Incluye al menos una letra.")
      .regex(/\d/, "Incluye al menos un número."),
    confirmPassword: z.string().min(1, "Confirma la contraseña."),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden.",
      });
    }
  });

const LIST_ESTADOS = ["activos", "eliminados", "todos"] as const;
const LIST_SORT_FIELDS = [
  "nombre_profesional",
  "correo_profesional",
  "programa",
  "antiguedad",
  "usuario_login",
] as const;
const LIST_DIRECTIONS = ["asc", "desc"] as const;

function readTextParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 120) : "";
}

function readPageParam(params: URLSearchParams, key: string, fallback: number) {
  const value = Number.parseInt(params.get(key) ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function parseProfesionalListParams(params: URLSearchParams) {
  const estado = params.get("estado");
  const sort = params.get("sort");
  const direction = params.get("direction");
  return {
    q: readTextParam(params, "q"),
    estado: LIST_ESTADOS.includes(estado as (typeof LIST_ESTADOS)[number])
      ? (estado as (typeof LIST_ESTADOS)[number])
      : "activos",
    sort: LIST_SORT_FIELDS.includes(sort as (typeof LIST_SORT_FIELDS)[number])
      ? (sort as (typeof LIST_SORT_FIELDS)[number])
      : "nombre_profesional",
    direction: LIST_DIRECTIONS.includes(direction as (typeof LIST_DIRECTIONS)[number])
      ? (direction as (typeof LIST_DIRECTIONS)[number])
      : "asc",
    page: readPageParam(params, "page", 1),
    pageSize: Math.min(readPageParam(params, "pageSize", 50), 100),
  };
}

export type ProfesionalFormInput = z.infer<typeof createProfesionalSchema>;
export type ProfesionalUpdateInput = z.infer<typeof updateProfesionalSchema>;
export type EnableProfesionalAccessInput = z.infer<
  typeof enableProfesionalAccessSchema
>;
export type ProfesionalListParams = ReturnType<typeof parseProfesionalListParams>;
export type ChangeTemporaryPasswordInput = z.infer<
  typeof changeTemporaryPasswordSchema
>;
