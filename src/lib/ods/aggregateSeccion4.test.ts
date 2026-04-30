import { describe, it, expect } from "vitest";
import { aggregateSeccion4 } from "./aggregateSeccion4";
import type { OdsPersonaRow } from "@/hooks/useOdsStore";

function row(overrides: Partial<OdsPersonaRow> = {}): OdsPersonaRow {
  return {
    cedula_usuario: "",
    nombre_usuario: "",
    discapacidad_usuario: "",
    genero_usuario: "",
    fecha_ingreso: "",
    tipo_contrato: "",
    cargo_servicio: "",
    ...overrides,
  };
}

describe("aggregateSeccion4", () => {
  it("0 filas → todos null + total_personas: 0", () => {
    const result = aggregateSeccion4([]);
    expect(result.total_personas).toBe(0);
    expect(result.nombre_usuario).toBeNull();
    expect(result.cedula_usuario).toBeNull();
    expect(result.discapacidad_usuario).toBeNull();
    expect(result.genero_usuario).toBeNull();
    expect(result.fecha_ingreso).toBeNull();
    expect(result.tipo_contrato).toBeNull();
    expect(result.cargo_servicio).toBeNull();
  });

  it("1 fila valida con fecha_ingreso vacia → strings sin ; + total_personas: 1 + fecha_ingreso null", () => {
    const result = aggregateSeccion4([
      row({ cedula_usuario: "12345", nombre_usuario: "Juan", discapacidad_usuario: "Fisica", genero_usuario: "Hombre", fecha_ingreso: "", tipo_contrato: "Laboral", cargo_servicio: "Analista" }),
    ]);
    expect(result.total_personas).toBe(1);
    expect(result.cedula_usuario).toBe("12345");
    expect(result.nombre_usuario).toBe("Juan");
    // fecha_ingreso vacia → null (no enviar string vacio al RPC ::date)
    expect(result.fecha_ingreso).toBeNull();
    expect(result.cargo_servicio).toBe("Analista");
  });

  it("3 filas con fila 2 sin fecha_ingreso → fechas distintas colapsan a null (ods.fecha_ingreso es DATE)", () => {
    const result = aggregateSeccion4([
      row({ cedula_usuario: "A", nombre_usuario: "Uno", discapacidad_usuario: "Visual", genero_usuario: "Mujer", fecha_ingreso: "2025-06-15", tipo_contrato: "Laboral", cargo_servicio: "" }),
      row({ cedula_usuario: "B", nombre_usuario: "Dos", discapacidad_usuario: "Auditiva", genero_usuario: "Hombre", fecha_ingreso: "", tipo_contrato: "", cargo_servicio: "" }),
      row({ cedula_usuario: "C", nombre_usuario: "Tres", discapacidad_usuario: "Fisica", genero_usuario: "Otro", fecha_ingreso: "2025-06-20", tipo_contrato: "Laboral", cargo_servicio: "Dev" }),
    ]);
    expect(result.total_personas).toBe(3);
    expect(result.cedula_usuario).toBe("A;B;C");
    expect(result.nombre_usuario).toBe("Uno;Dos;Tres");
    // Dos fechas distintas → null (ods.fecha_ingreso es DATE, no acepta `;`-separado)
    expect(result.fecha_ingreso).toBeNull();
    expect(result.tipo_contrato).toBe("Laboral;;Laboral");
    expect(result.cargo_servicio).toBe(";;Dev");
  });

  it("fila completamente vacia entre 2 validas → se filtra → total_personas: 2 (fechas distintas colapsan a null)", () => {
    const result = aggregateSeccion4([
      row({ cedula_usuario: "A", nombre_usuario: "Uno", discapacidad_usuario: "Visual", genero_usuario: "Mujer", fecha_ingreso: "2025-01-01", tipo_contrato: "Laboral", cargo_servicio: "" }),
      row({}),
      row({ cedula_usuario: "C", nombre_usuario: "Tres", discapacidad_usuario: "Fisica", genero_usuario: "Hombre", fecha_ingreso: "2025-12-31", tipo_contrato: "Laboral", cargo_servicio: "" }),
    ]);
    expect(result.total_personas).toBe(2);
    expect(result.cedula_usuario).toBe("A;C");
    // Dos fechas distintas → null (DATE column no soporta multi-valor)
    expect(result.fecha_ingreso).toBeNull();
  });

  it("filas con misma fecha_ingreso → la fecha se preserva (no colapsa)", () => {
    const result = aggregateSeccion4([
      row({ cedula_usuario: "A", nombre_usuario: "Uno", discapacidad_usuario: "Visual", genero_usuario: "Mujer", fecha_ingreso: "2025-06-15", tipo_contrato: "Laboral", cargo_servicio: "" }),
      row({ cedula_usuario: "B", nombre_usuario: "Dos", discapacidad_usuario: "Auditiva", genero_usuario: "Hombre", fecha_ingreso: "2025-06-15", tipo_contrato: "Laboral", cargo_servicio: "" }),
    ]);
    expect(result.total_personas).toBe(2);
    expect(result.fecha_ingreso).toBe("2025-06-15");
  });
});
