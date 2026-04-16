import { describe, expect, it } from "vitest";
import { getPrefixedDropdownUpdates } from "@/lib/prefixedDropdowns";
import {
  getContratacionPrefixSyncRule,
  getContratacionSelectOptions,
} from "@/lib/contratacionPrefixedDropdowns";

describe("contratacionPrefixedDropdowns", () => {
  it("exposes the select options used by the contratacion vinculado fields", () => {
    expect(getContratacionSelectOptions("tipo_contrato")).toEqual([
      "Contrato por obra o labor",
      "Contrato de trabajo a termino fijo",
      "Contrato de trabajo a termino indefinido",
      "Contrato de aprendizaje",
      "Contrato temporal",
      "Contrato a termino indefinido con orden clausulada",
      "Contrato a termino fijo a un ano",
      "Contrato a termino fijo a seis meses",
      "Contrato por prestacion de servicios",
    ]);
    expect(getContratacionSelectOptions("contrato_lee_nota")).toEqual([]);
  });

  it("returns the bidirectional prefix sync rule for paired dropdowns only", () => {
    expect(getContratacionPrefixSyncRule("contrato_lee_nivel_apoyo")).toEqual(
      expect.objectContaining({
        mode: "bidirectional",
        prefixFieldIds: [
          "contrato_lee_nivel_apoyo",
          "contrato_lee_observacion",
        ],
      })
    );
    expect(getContratacionPrefixSyncRule("contrato_lee_nota")).toBeNull();
  });

  it("syncs paired dropdowns using the legacy prefix pattern", () => {
    const rule = getContratacionPrefixSyncRule("contrato_lee_nivel_apoyo");
    expect(rule).not.toBeNull();

    const updates = getPrefixedDropdownUpdates({
      rule: rule!,
      changedFieldId: "contrato_lee_nivel_apoyo",
      changedValue: "0. No requiere apoyo.",
      getOptions: (fieldId) => getContratacionSelectOptions(fieldId),
    });

    expect(updates).toEqual({
      contrato_lee_observacion: "0. No requiere apoyo.",
    });
  });
});
