import { describe, expect, it } from "vitest";
import {
  loginSchema,
  MAX_PASSWORD_LENGTH,
  MAX_USUARIO_LOGIN_LENGTH,
} from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("normaliza el usuario_login valido", () => {
    expect(
      loginSchema.parse({
        usuario_login: "  aaron_vercel  ",
        password: "Password1234",
      })
    ).toEqual({
      usuario_login: "aaron_vercel",
      password: "Password1234",
    });
  });

  it("rechaza usuario_login con espacios internos", () => {
    const parsed = loginSchema.safeParse({
      usuario_login: "aaron vercel",
      password: "Password1234",
    });

    expect(parsed.success).toBe(false);
  });

  it("rechaza usuario_login demasiado largo", () => {
    const parsed = loginSchema.safeParse({
      usuario_login: "a".repeat(MAX_USUARIO_LOGIN_LENGTH + 1),
      password: "Password1234",
    });

    expect(parsed.success).toBe(false);
  });

  it("rechaza password demasiado larga", () => {
    const parsed = loginSchema.safeParse({
      usuario_login: "aaron_vercel",
      password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
    });

    expect(parsed.success).toBe(false);
  });

  it("rechaza usuario_login vacio", () => {
    const parsed = loginSchema.safeParse({
      usuario_login: "   ",
      password: "Password1234",
    });

    expect(parsed.success).toBe(false);
  });

  it("rechaza password vacia", () => {
    const parsed = loginSchema.safeParse({
      usuario_login: "aaron_vercel",
      password: "",
    });

    expect(parsed.success).toBe(false);
  });
});
