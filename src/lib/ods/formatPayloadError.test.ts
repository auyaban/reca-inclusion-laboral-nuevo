import { describe, it, expect } from "vitest";
import { formatPayloadError } from "./formatPayloadError";

describe("formatPayloadError", () => {
  it("agrupa por seccion y dedupea con conteo", () => {
    const out = formatPayloadError({
      error: "Payload invalido.",
      fieldErrors: {
        usuarios_nuevos: [
          "Discapacidad inválida",
          "Género inválido",
          "Discapacidad inválida",
          "Género inválido",
          "Discapacidad inválida",
          "Género inválido",
        ],
      },
    });
    expect(out.title).toMatch(/no se pudo guardar/i);
    // Una sola línea para Sección 4, con conteo dedupeado
    expect(out.bullets.length).toBe(1);
    expect(out.bullets[0]).toContain("Sección 4");
    expect(out.bullets[0]).toContain("(3 veces)");
    // Mensajes técnicos reescritos a lenguaje natural
    expect(out.bullets[0].toLowerCase()).toContain("discapacidad del catálogo");
    expect(out.bullets[0].toLowerCase()).toContain("género del catálogo");
  });

  it("mapea fields de varias secciones", () => {
    const out = formatPayloadError({
      fieldErrors: {
        nombre_profesional: ["El profesional es obligatorio"],
        modalidad_servicio: ["Modalidad inválida"],
        codigo_servicio: ["El código de servicio es obligatorio"],
      },
    });
    expect(out.bullets.length).toBe(3);
    expect(out.bullets.some((b) => b.includes("Sección 1"))).toBe(true);
    expect(out.bullets.some((b) => b.includes("Sección 3"))).toBe(true);
  });

  it("preserva details/code/hint como bloque tecnico aparte", () => {
    const out = formatPayloadError({
      error: "Error al guardar la ODS.",
      details: "invalid input syntax for type date: \";\"",
      code: "22007",
      hint: "Check fecha_ingreso aggregation",
    });
    expect(out.title).toBe("Error al guardar la ODS.");
    expect(out.bullets).toEqual([]);
    expect(out.technical).toContain("invalid input syntax");
    expect(out.technical).toContain("22007");
    expect(out.technical).toContain("Check fecha_ingreso");
  });

  it("sin fieldErrors ni details devuelve solo el title", () => {
    const out = formatPayloadError({ error: "Error de conexion." });
    expect(out.title).toBe("Error de conexion.");
    expect(out.bullets).toEqual([]);
    expect(out.technical).toBeNull();
  });
});
