import { z } from "zod";
import { APP_ROLES } from "@/lib/auth/appRoles";

const nullableText = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const requiredText = (message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, message)
  );

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

const appRoleSchema = z.enum(APP_ROLES);

export const profesionalAccessModeSchema = z.enum(["catalogo", "auth"]);

function validateEmailAndLoginFormat(
  value: {
    correo_profesional: string | null;
    usuario_login: string | null;
  },
  context: z.RefinementCtx
) {
  if (
    value.correo_profesional &&
    !z.string().email().safeParse(value.correo_profesional).success
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["correo_profesional"],
      message: "Ingresa un correo válido.",
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
    usuario_login: string | null;
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

  if (!value.usuario_login) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["usuario_login"],
      message: "El usuario login es obligatorio para habilitar acceso.",
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
  nombre_profesional: requiredText("El nombre del profesional es obligatorio."),
  correo_profesional: nullableText.default(null),
  programa: nullableText.default(null),
  antiguedad: nullableInteger.default(null),
  usuario_login: nullableText.default(null),
  roles: z.array(appRoleSchema).default([]),
});

export const profesionalBaseSchema = profesionalBaseObjectSchema
  .superRefine((value, context) => {
    validateEmailAndLoginFormat(value, context);
    validateAuthAccess(value, context);
  });

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
  return {
    q: readTextParam(params, "q"),
    estado: LIST_ESTADOS.includes(estado as (typeof LIST_ESTADOS)[number])
      ? (estado as (typeof LIST_ESTADOS)[number])
      : "activos",
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
