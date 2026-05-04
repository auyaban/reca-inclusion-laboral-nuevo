import { describe, expect, it } from "vitest";
import {
  isCanonicalDiscapacidad,
  isCanonicalGenero,
} from "./seccion4CatalogValidation";

describe("seccion4CatalogValidation", () => {
  it("acepta solo discapacidades canonicas del schema de usuarios nuevos", () => {
    expect(isCanonicalDiscapacidad("Física")).toBe(true);
    expect(isCanonicalDiscapacidad("Fisica")).toBe(false);
    expect(isCanonicalDiscapacidad("")).toBe(false);
    expect(isCanonicalDiscapacidad(null)).toBe(false);
  });

  it("acepta solo generos canonicos del schema de usuarios nuevos", () => {
    expect(isCanonicalGenero("Mujer")).toBe(true);
    expect(isCanonicalGenero("MUJER")).toBe(false);
    expect(isCanonicalGenero("")).toBe(false);
    expect(isCanonicalGenero(null)).toBe(false);
  });
});
