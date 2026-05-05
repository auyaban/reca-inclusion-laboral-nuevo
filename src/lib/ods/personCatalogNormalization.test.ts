import { describe, expect, it } from "vitest";
import {
  normalizeOdsDiscapacidadUsuario,
  normalizeOdsGeneroUsuario,
} from "@/lib/ods/personCatalogNormalization";

describe("ODS person catalog normalization", () => {
  it("normaliza discapacidad desde texto de seleccion hacia catalogo ODS", () => {
    expect(
      normalizeOdsDiscapacidadUsuario("Discapacidad auditiva hipoacusia")
    ).toBe("Auditiva");
    expect(normalizeOdsDiscapacidadUsuario("Hipoacusia")).toBe("Hipoacusia");
    expect(normalizeOdsDiscapacidadUsuario("No aplica")).toBe("N/A");
  });

  it("normaliza genero solo cuando existe equivalente canonico ODS", () => {
    expect(normalizeOdsGeneroUsuario("Femenino")).toBe("Mujer");
    expect(normalizeOdsGeneroUsuario("Prefiero no responder")).toBe("");
  });
});
