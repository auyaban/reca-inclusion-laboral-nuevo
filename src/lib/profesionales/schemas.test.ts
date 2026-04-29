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
      nombre_profesional: "  profesional   catálogo  ",
      programa: "Inclusión Laboral",
      antiguedad: "2",
      correo_profesional: "",
      usuario_login: "",
      roles: [],
    });

    expect(parsed).toMatchObject({
      accessMode: "catalogo",
      nombre_profesional: "Profesional Catálogo",
      programa: "Inclusión Laboral",
      correo_profesional: null,
      usuario_login: null,
      roles: [],
    });
    expect(parsed.antiguedad).toBe(2);
  });

  it("requires email and at least one role for auth access", () => {
    const parsed = createProfesionalSchema.safeParse({
      accessMode: "auth",
      nombre_profesional: "Profesional con Acceso",
      correo_profesional: "",
      programa: "Inclusión Laboral",
      roles: [],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors).toMatchObject({
      correo_profesional: ["El correo es obligatorio para habilitar acceso."],
      roles: ["Selecciona al menos un rol para habilitar acceso."],
    });
  });

  it("requires professional names with two to five words", () => {
    expect(
      createProfesionalSchema.safeParse({
        accessMode: "catalogo",
        nombre_profesional: "Sandra",
        programa: "Inclusión Laboral",
      }).success
    ).toBe(false);

    expect(
      createProfesionalSchema.safeParse({
        accessMode: "catalogo",
        nombre_profesional: "Uno Dos Tres Cuatro Cinco Seis",
        programa: "Inclusión Laboral",
      }).success
    ).toBe(false);
  });

  it("converts local RECA email input and rejects external domains", () => {
    const parsed = createProfesionalSchema.parse({
      accessMode: "auth",
      nombre_profesional: "Sandra Pachon",
      correo_profesional: "sandra.pachon",
      programa: "Inclusión Laboral",
      roles: ["inclusion_empresas_profesional"],
    });

    expect(parsed.correo_profesional).toBe("sandra.pachon@recacolombia.org");

    const external = createProfesionalSchema.safeParse({
      accessMode: "auth",
      nombre_profesional: "Sandra Pachon",
      correo_profesional: "sandra@gmail.com",
      programa: "Inclusión Laboral",
      roles: ["inclusion_empresas_profesional"],
    });

    expect(external.success).toBe(false);
  });

  it("rejects programs outside Inclusión Laboral", () => {
    const parsed = createProfesionalSchema.safeParse({
      accessMode: "catalogo",
      nombre_profesional: "Sandra Pachon",
      programa: "Otro Programa",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects technical role slugs outside the app role allowlist", () => {
    const parsed = createProfesionalSchema.safeParse({
      accessMode: "auth",
      nombre_profesional: "Profesional con Acceso",
      correo_profesional: "profesional",
      programa: "Inclusión Laboral",
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
      correo_profesional: "profesional",
      roles: ["inclusion_empresas_profesional"],
    });

    expect(parsed.correo_profesional).toBe("profesional@recacolombia.org");
    expect(parsed.roles).toEqual(["inclusion_empresas_profesional"]);
  });

  it("validates email format when enabling auth later", () => {
    const parsed = enableProfesionalAccessSchema.safeParse({
      correo_profesional: "correo inválido",
      roles: ["inclusion_empresas_profesional"],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors).toMatchObject({
      correo_profesional: ["Ingresa un correo válido."],
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
