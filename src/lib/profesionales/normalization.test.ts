import { describe, expect, it } from "vitest";
import {
  buildUsuarioLoginBase,
  dedupeUsuarioLogin,
  getRecaEmailLocalPart,
  normalizeProfesionalEmail,
  normalizeProfesionalName,
  normalizeProfesionalProgram,
} from "@/lib/profesionales/normalization";

describe("profesionales normalization", () => {
  it("normalizes professional names with Colombian Spanish casing", () => {
    expect(normalizeProfesionalName("  maría   del pilar   gómez   lópez ")).toBe(
      "María del Pilar Gómez López"
    );
  });

  it("builds usuario_login from first name and last surname", () => {
    expect(buildUsuarioLoginBase("María del Pilar Gómez López")).toBe("marlop");
  });

  it("deduplicates usuario_login with the next available numeric suffix", () => {
    expect(dedupeUsuarioLogin("marlop", ["marlop", "marlop2"])).toBe("marlop3");
  });

  it("converts local email input to the RECA domain", () => {
    expect(normalizeProfesionalEmail("  sandra.pachon ")).toBe(
      "sandra.pachon@recacolombia.org"
    );
  });

  it("extracts the local part for UI inputs", () => {
    expect(getRecaEmailLocalPart("sandra.pachon@recacolombia.org")).toBe(
      "sandra.pachon"
    );
  });

  it("canonicalizes the only allowed program", () => {
    expect(normalizeProfesionalProgram(" inclusion laboral ")).toBe(
      "Inclusión Laboral"
    );
  });
});
