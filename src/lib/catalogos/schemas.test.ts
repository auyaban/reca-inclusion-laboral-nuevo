import { describe, expect, it } from "vitest";
import {
  catalogoKindSchema,
  catalogoRecordSchema,
  normalizeCatalogoPhone,
  parseCatalogoListParams,
} from "@/lib/catalogos/schemas";

describe("catalogos schemas", () => {
  it("normaliza textos, email y teléfono en asesores", () => {
    const parsed = catalogoRecordSchema("asesores").parse({
      nombre: "  sandra   pachon ",
      email: " SANDRA@COMPENSAR.COM ",
      telefono: " 300 123 4567 ",
      sede: "  centro ",
      localidad: "  suba  ",
      gestor: "  gestor uno ",
    });

    expect(parsed).toMatchObject({
      nombre: "Sandra Pachon",
      email: "sandra@compensar.com",
      telefono: "3001234567",
      sede: "Centro",
      localidad: "Suba",
      gestor: "Gestor Uno",
    });
  });

  it("rechaza teléfono con signos o más de 10 dígitos", () => {
    expect(() => normalizeCatalogoPhone("+57 3001234567")).toThrow(
      "El teléfono solo puede contener números y máximo 10 dígitos."
    );
    expect(() => normalizeCatalogoPhone("30012345678")).toThrow(
      "El teléfono solo puede contener números y máximo 10 dígitos."
    );
  });

  it("genera nombre_key para intérpretes", () => {
    const parsed = catalogoRecordSchema("interpretes").parse({
      nombre: "  Laura   Pérez ",
    });

    expect(parsed).toEqual({
      nombre: "Laura Pérez",
      nombre_key: "laura pérez",
    });
  });

  it("parsea parámetros con defaults seguros", () => {
    const params = parseCatalogoListParams(
      "gestores",
      new URLSearchParams("sort=telefono&direction=desc&page=2&pageSize=500")
    );

    expect(params).toMatchObject({
      q: "",
      estado: "activos",
      sort: "telefono",
      direction: "desc",
      page: 2,
      pageSize: 100,
    });

    expect(
      parseCatalogoListParams(
        "interpretes",
        new URLSearchParams("sort=email&direction=sideways")
      )
    ).toMatchObject({
      sort: "nombre",
      direction: "asc",
    });
  });

  it("valida el tipo de catálogo", () => {
    expect(catalogoKindSchema.parse("asesores")).toBe("asesores");
    expect(() => catalogoKindSchema.parse("empresas")).toThrow();
  });
});
