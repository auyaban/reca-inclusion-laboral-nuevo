import { describe, expect, it } from "vitest";
import {
  changeTemporaryPasswordSchema,
  createProfesionalSchema,
  deleteProfesionalSchema,
  enableProfesionalAccessSchema,
} from "@/lib/profesionales/schemas";

describe("profesionales schemas", () => {
  it("allows catalog professionals without auth fields or roles", () => {
    const parsed = createProfesionalSchema.parse({
      accessMode: "catalogo",
      nombre_profesional: "Profesional Catálogo",
      programa: "Inclusión",
      antiguedad: "2",
      correo_profesional: "",
      usuario_login: "",
      roles: [],
    });

    expect(parsed).toMatchObject({
      accessMode: "catalogo",
      correo_profesional: null,
      usuario_login: null,
      roles: [],
    });
    expect(parsed.antiguedad).toBe(2);
  });

  it("requires email, usuario login and at least one role for auth access", () => {
    const parsed = createProfesionalSchema.safeParse({
      accessMode: "auth",
      nombre_profesional: "Profesional con Acceso",
      correo_profesional: "",
      usuario_login: "",
      roles: [],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors).toMatchObject({
      correo_profesional: ["El correo es obligatorio para habilitar acceso."],
      usuario_login: ["El usuario login es obligatorio para habilitar acceso."],
      roles: ["Selecciona al menos un rol para habilitar acceso."],
    });
  });

  it("rejects technical role slugs outside the app role allowlist", () => {
    const parsed = createProfesionalSchema.safeParse({
      accessMode: "auth",
      nombre_profesional: "Profesional con Acceso",
      correo_profesional: "profesional@reca.test",
      usuario_login: "profesional",
      roles: ["legacy_admin"],
    });

    expect(parsed.success).toBe(false);
  });

  it("requires a comment when soft deleting a professional", () => {
    const parsed = deleteProfesionalSchema.safeParse({ comentario: " " });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.comentario).toEqual([
      "El comentario es obligatorio para eliminar un profesional.",
    ]);
  });

  it("uses the same access rules when enabling auth later", () => {
    const parsed = enableProfesionalAccessSchema.parse({
      correo_profesional: "profesional@reca.test",
      usuario_login: "profesional",
      roles: ["inclusion_empresas_profesional"],
    });

    expect(parsed.roles).toEqual(["inclusion_empresas_profesional"]);
  });

  it("validates email and usuario login format when enabling auth later", () => {
    const parsed = enableProfesionalAccessSchema.safeParse({
      correo_profesional: "correo-invalido",
      usuario_login: "usuario con espacios",
      roles: ["inclusion_empresas_profesional"],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors).toMatchObject({
      correo_profesional: ["Ingresa un correo válido."],
      usuario_login: ["El usuario login no puede tener espacios."],
    });
  });

  it("validates temporary password change confirmation", () => {
    const parsed = changeTemporaryPasswordSchema.safeParse({
      password: "NuevaClave123!",
      confirmPassword: "OtraClave123!",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.confirmPassword).toEqual([
      "Las contraseñas no coinciden.",
    ]);
  });

  it("requires letters and numbers in the final password", () => {
    const parsed = changeTemporaryPasswordSchema.safeParse({
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.password).toEqual([
      "Incluye al menos una letra.",
    ]);
  });
});
