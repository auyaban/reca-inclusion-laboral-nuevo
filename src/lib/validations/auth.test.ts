import { describe, expect, it } from "vitest";
import {
  authLookupRequestSchema,
  loginSchema,
  MAX_PASSWORD_LENGTH,
  MAX_USUARIO_LOGIN_LENGTH,
} from "@/lib/validations/auth";

describe("authLookupRequestSchema", () => {
  it("normaliza el usuario_login válido", () => {
    expect(
      authLookupRequestSchema.parse({
        usuario_login: "  aaron_vercel  ",
      })
    ).toEqual({
      usuario_login: "aaron_vercel",
    });
  });

  it("rechaza usuario_login con espacios internos", () => {
    const parsed = authLookupRequestSchema.safeParse({
      usuario_login: "aaron vercel",
    });

    expect(parsed.success).toBe(false);
  });

  it("rechaza usuario_login demasiado largo", () => {
    const parsed = authLookupRequestSchema.safeParse({
      usuario_login: "a".repeat(MAX_USUARIO_LOGIN_LENGTH + 1),
    });

    expect(parsed.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rechaza password demasiado larga", () => {
    const parsed = loginSchema.safeParse({
      usuario_login: "aaron_vercel",
      password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
    });

    expect(parsed.success).toBe(false);
  });

  it("rechaza usuario_login vacío", () => {
    const parsed = loginSchema.safeParse({
      usuario_login: "   ",
      password: "Password1234",
    });

    expect(parsed.success).toBe(false);
  });
});
