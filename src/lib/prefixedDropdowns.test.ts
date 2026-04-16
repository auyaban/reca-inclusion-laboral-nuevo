import { describe, expect, it } from "vitest";
import {
  getPrefixedDropdownKey,
  getPrefixedDropdownUpdates,
  type PrefixedDropdownSyncRule,
} from "@/lib/prefixedDropdowns";

describe("prefixedDropdowns", () => {
  it("resolves prefixed keys from dropdown values", () => {
    expect(getPrefixedDropdownKey("0. No requiere apoyo.")).toBe("0.");
    expect(getPrefixedDropdownKey("2. Nivel de apoyo medio.")).toBe("2.");
    expect(getPrefixedDropdownKey("No aplica.")).toBe("no aplica");
    expect(getPrefixedDropdownKey("Si")).toBeNull();
  });

  it("syncs bidirectional prefixed dropdown groups", () => {
    const rule: PrefixedDropdownSyncRule<"nivel" | "observacion"> = {
      mode: "bidirectional",
      prefixFieldIds: ["nivel", "observacion"],
    };
    const options = {
      nivel: ["0. No requiere apoyo.", "1. Nivel de apoyo Bajo.", "2. Nivel de apoyo medio."],
      observacion: [
        "0. Tiene claras las condiciones salariales asignadas al cargo.",
        "1. Se aclaran las condiciones salariales asignadas al cargo.",
        "2. Se explica de manera parcial las condiciones salariales asignadas al cargo.",
      ],
    } as const;

    const updates = getPrefixedDropdownUpdates({
      rule,
      changedFieldId: "nivel",
      changedValue: "2. Nivel de apoyo medio.",
      getOptions: (fieldId) => options[fieldId],
    });

    expect(updates).toEqual({
      observacion:
        "2. Se explica de manera parcial las condiciones salariales asignadas al cargo.",
    });
  });

  it("syncs primary activity dropdowns and dependent yes/no fields", () => {
    const rule: PrefixedDropdownSyncRule<
      "nivel" | "observacion" | "depA" | "depB"
    > = {
      mode: "primary_with_dependents",
      primaryFieldId: "nivel",
      secondaryFieldId: "observacion",
      dependentBooleanFieldIds: ["depA", "depB"],
    };
    const options = {
      nivel: ["0. No requiere apoyo.", "2. Nivel de apoyo medio.", "No aplica."],
      observacion: [
        "0. No requiere apoyo en sus actividades de la vida diaria.",
        "2. Requiere apoyo en la mayoria de actividades de la vida diaria.",
        "No aplica.",
      ],
      depA: ["Si", "No", "No aplica"],
      depB: ["Si", "No", "No aplica"],
    } as const;

    expect(
      getPrefixedDropdownUpdates({
        rule,
        changedFieldId: "nivel",
        changedValue: "0. No requiere apoyo.",
        getOptions: (fieldId) => options[fieldId],
      })
    ).toEqual({
      observacion: "0. No requiere apoyo en sus actividades de la vida diaria.",
      depA: "No",
      depB: "No",
    });

    expect(
      getPrefixedDropdownUpdates({
        rule,
        changedFieldId: "nivel",
        changedValue: "No aplica.",
        getOptions: (fieldId) => options[fieldId],
      })
    ).toEqual({
      observacion: "No aplica.",
      depA: "No aplica",
      depB: "No aplica",
    });

    expect(
      getPrefixedDropdownUpdates({
        rule,
        changedFieldId: "nivel",
        changedValue: "2. Nivel de apoyo medio.",
        getOptions: (fieldId) => options[fieldId],
      })
    ).toEqual({
      observacion: "2. Requiere apoyo en la mayoria de actividades de la vida diaria.",
      depA: "",
      depB: "",
    });
  });
});
