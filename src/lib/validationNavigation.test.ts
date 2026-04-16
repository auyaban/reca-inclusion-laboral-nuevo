import { describe, expect, it } from "vitest";
import {
  getFirstNestedErrorPath,
  getRepeatedArrayValidationFieldName,
  hasNestedError,
} from "@/lib/validationNavigation";

describe("hasNestedError", () => {
  it("detecta errores anidados en arrays dispersos", () => {
    const errors = [];
    errors[2] = {
      nombre_oferente: {
        message: "Requerido",
      },
    };

    expect(hasNestedError(errors)).toBe(true);
  });

  it("ignora estructuras sin errores reales", () => {
    expect(hasNestedError({})).toBe(false);
    expect(hasNestedError([])).toBe(false);
    expect(
      hasNestedError({
        root: {
          message: "Error raiz del array",
        },
      })
    ).toBe(false);
  });
});

describe("getFirstNestedErrorPath", () => {
  it("devuelve el primer path anidado estable", () => {
    const errors = [];
    errors[1] = {
      cargo_oferente: {
        message: "Requerido",
      },
    };

    expect(getFirstNestedErrorPath(errors, "oferentes")).toBe(
      "oferentes.1.cargo_oferente"
    );
  });
});

describe("getRepeatedArrayValidationFieldName", () => {
  it("devuelve array.index.field para errores anidados", () => {
    const errors = [];
    errors[2] = {
      nombre_oferente: {
        message: "Requerido",
      },
    };

    expect(
      getRepeatedArrayValidationFieldName(
        errors,
        "vinculados",
        "nombre_oferente"
      )
    ).toBe("vinculados.2.nombre_oferente");
  });

  it("usa fallback estable cuando no encuentra un path anidado", () => {
    expect(
      getRepeatedArrayValidationFieldName(
        {
          root: {
            message: "Agrega al menos un vinculado.",
          },
        },
        "vinculados",
        "nombre_oferente"
      )
    ).toBe("vinculados.0.nombre_oferente");
  });
});
