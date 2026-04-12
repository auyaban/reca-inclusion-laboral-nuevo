import { z } from "zod";

export const MAX_USUARIO_LOGIN_LENGTH = 255;
export const MAX_PASSWORD_LENGTH = 255;

export const usuarioLoginSchema = z
  .string()
  .trim()
  .min(1, "El usuario es obligatorio")
  .max(
    MAX_USUARIO_LOGIN_LENGTH,
    `El usuario no puede superar ${MAX_USUARIO_LOGIN_LENGTH} caracteres`
  )
  .regex(/^\S+$/, "El usuario no puede tener espacios");

export const authLookupRequestSchema = z.object({
  usuario_login: usuarioLoginSchema,
});

export const loginSchema = z.object({
  usuario_login: usuarioLoginSchema,
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .min(6, "Mínimo 6 caracteres")
    .max(
      MAX_PASSWORD_LENGTH,
      `La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres`
    ),
});

export type AuthLookupRequest = z.infer<typeof authLookupRequestSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
