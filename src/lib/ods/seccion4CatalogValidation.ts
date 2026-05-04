import { usuarioNuevoSchema } from "@/lib/ods/schemas";

const discapacidadSchema = usuarioNuevoSchema.shape.discapacidad_usuario;
const generoSchema = usuarioNuevoSchema.shape.genero_usuario;

export function isCanonicalDiscapacidad(value: unknown): boolean {
  return discapacidadSchema.safeParse(value).success;
}

export function isCanonicalGenero(value: unknown): boolean {
  return generoSchema.safeParse(value).success;
}

