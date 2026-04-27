import { describe, expect, it } from "vitest";
import {
  FAILED_VISIT_ACTION_REGISTRY,
  getFailedVisitActionConfig,
  isFailedVisitOptionalPath,
} from "@/lib/failedVisitActionRegistry";
import { CONDICIONES_VACANTE_OPTION_FIELDS } from "@/lib/validations/condicionesVacante";

describe("failedVisitActionRegistry", () => {
  it("registers the visible lots only and keeps excluded forms disabled", () => {
    expect(Object.keys(FAILED_VISIT_ACTION_REGISTRY)).toEqual([
      "evaluacion",
      "induccion-operativa",
      "induccion-organizacional",
      "seleccion",
      "contratacion",
      "condiciones-vacante",
    ]);
    expect(getFailedVisitActionConfig("presentacion")).toBeNull();
    expect(getFailedVisitActionConfig("sensibilizacion")).toBeNull();
    expect(getFailedVisitActionConfig("seguimientos")).toBeNull();
    expect(getFailedVisitActionConfig("interprete-lsc")).toBeNull();
  });

  it("builds real preset and optional-path contracts for the phase 3 forms", () => {
    expect(
      FAILED_VISIT_ACTION_REGISTRY.evaluacion.presetConfig.fieldGroups.length
    ).toBeGreaterThan(0);
    expect(FAILED_VISIT_ACTION_REGISTRY.evaluacion.dialog.confirmLabel).toBe(
      "Marcar como fallida"
    );
    expect(
      isFailedVisitOptionalPath(
        "evaluacion",
        "section_2_1.transporte_publico.accesible"
      )
    ).toBe(false);
    expect(
      FAILED_VISIT_ACTION_REGISTRY.evaluacion.presetConfig.fieldGroups.find(
        (group) => group.value === "No"
      )?.paths
    ).toContain("section_2_1.transporte_publico.accesible");
    expect(
      isFailedVisitOptionalPath("evaluacion", "section_4.nivel_accesibilidad")
    ).toBe(true);

    expect(
      FAILED_VISIT_ACTION_REGISTRY["induccion-operativa"].optionalWhenFailedPaths
    ).toEqual(["fecha_primer_seguimiento"]);
    expect(
      FAILED_VISIT_ACTION_REGISTRY["induccion-operativa"].presetConfig.fieldGroups
    ).toHaveLength(3);

    expect(
      FAILED_VISIT_ACTION_REGISTRY["induccion-organizacional"]
        .presetConfig.fieldGroups[0]?.paths
    ).toContain("section_4.0.medio");
  });

  it("registers explicit runtime contracts for the phase 5 forms", () => {
    expect(FAILED_VISIT_ACTION_REGISTRY.seleccion.presetConfig.fieldGroups).toEqual([
      {
        value: "No aplica",
        paths: ["nota"],
      },
    ]);
    expect(FAILED_VISIT_ACTION_REGISTRY.contratacion.presetConfig.fieldGroups).toEqual(
      []
    );
    expect(
      FAILED_VISIT_ACTION_REGISTRY["condiciones-vacante"].presetConfig.fieldGroups
        .length
    ).toBeGreaterThan(0);
    expect(
      isFailedVisitOptionalPath("condiciones-vacante", "nivel_bachiller")
    ).toBe(true);
    expect(
      isFailedVisitOptionalPath("condiciones-vacante", "beneficios_adicionales")
    ).toBe(true);
  });

  it("keeps condiciones-vacante preset values canonical for option fields", () => {
    const optionFields = new Map(
      Object.entries(CONDICIONES_VACANTE_OPTION_FIELDS) as [
        string,
        readonly string[],
      ][]
    );

    FAILED_VISIT_ACTION_REGISTRY[
      "condiciones-vacante"
    ].presetConfig.fieldGroups.forEach((group) => {
      group.paths.forEach((path) => {
        const options = optionFields.get(path);
        if (!options) {
          return;
        }

        expect(options, path).toContain(group.value);
      });
    });
  });
});
