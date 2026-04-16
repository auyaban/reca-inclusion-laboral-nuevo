import { describe, expect, it } from "vitest";
import { getPrefixedDropdownUpdates } from "@/lib/prefixedDropdowns";
import {
  SELECCION_PREFIX_SYNC_INDEPENDENT_FIELD_IDS,
  getSeleccionPrefixSyncRule,
  getSeleccionSelectOptions,
} from "@/lib/seleccionPrefixedDropdowns";

describe("seleccionPrefixedDropdowns", () => {
  it("keeps the documented independent fields outside sync rules", () => {
    for (const fieldId of SELECCION_PREFIX_SYNC_INDEPENDENT_FIELD_IDS) {
      expect(getSeleccionPrefixSyncRule(fieldId)).toBeNull();
    }
  });

  it("syncs bidirectional groups like alergias between paired dropdowns", () => {
    const rule = getSeleccionPrefixSyncRule("alergias_nivel_apoyo");
    expect(rule).not.toBeNull();

    const updates = getPrefixedDropdownUpdates({
      rule: rule!,
      changedFieldId: "alergias_nivel_apoyo",
      changedValue: "2. Nivel de apoyo medio.",
      getOptions: (fieldId) => getSeleccionSelectOptions(fieldId),
    });

    expect(updates).toEqual({
      alergias_tipo:
        "2. No conoce si presenta alguna alergia.",
    });
  });

  it("syncs controles without touching the independent frecuencia field", () => {
    const rule = getSeleccionPrefixSyncRule("controles_nivel_apoyo");
    expect(rule).not.toBeNull();

    const updates = getPrefixedDropdownUpdates({
      rule: rule!,
      changedFieldId: "controles_nivel_apoyo",
      changedValue: "0. No requiere apoyo.",
      getOptions: (fieldId) => getSeleccionSelectOptions(fieldId),
    });

    expect(updates).toEqual({
      controles_asistencia:
        "0. No requiere apoyo.",
    });
    expect(updates).not.toHaveProperty("controles_frecuencia");
  });

  it("syncs desplazamiento and leaves transporte independent", () => {
    const rule = getSeleccionPrefixSyncRule("desplazamiento_nivel_apoyo");
    expect(rule).not.toBeNull();

    const updates = getPrefixedDropdownUpdates({
      rule: rule!,
      changedFieldId: "desplazamiento_nivel_apoyo",
      changedValue: "3. Nivel de apoyo alto.",
      getOptions: (fieldId) => getSeleccionSelectOptions(fieldId),
    });

    expect(updates).toEqual({
      desplazamiento_modo:
        "3. No se desplaza de manera independiente. Requiere el acompanamiento de un tercero y un apoyo (ortesis, baston, silla de ruedas entre otros).",
    });
    expect(updates).not.toHaveProperty("desplazamiento_transporte");
  });

  it("syncs ubicacion and leaves aplicaciones independent", () => {
    const rule = getSeleccionPrefixSyncRule("ubicacion_nivel_apoyo");
    expect(rule).not.toBeNull();

    const updates = getPrefixedDropdownUpdates({
      rule: rule!,
      changedFieldId: "ubicacion_nivel_apoyo",
      changedValue: "1. Nivel de apoyo Bajo.",
      getOptions: (fieldId) => getSeleccionSelectOptions(fieldId),
    });

    expect(updates).toEqual({
      ubicacion_ciudad:
        "1. Sabe ubicarse en la ciudad pero haciendo uso de aplicaciones (Maps, Waze, entre otros).",
    });
    expect(updates).not.toHaveProperty("ubicacion_aplicaciones");
  });

  it("applies primary_with_dependents rules for aseo like the legacy contract", () => {
    const rule = getSeleccionPrefixSyncRule("aseo_nivel_apoyo");
    expect(rule).not.toBeNull();

    expect(
      getPrefixedDropdownUpdates({
        rule: rule!,
        changedFieldId: "aseo_nivel_apoyo",
        changedValue: "0. No requiere apoyo.",
        getOptions: (fieldId) => getSeleccionSelectOptions(fieldId),
      })
    ).toEqual({
      alimentacion:
        "0. No requiere apoyo en sus actividades de la vida diaria.",
      aseo_criar_apoyo: "No",
      aseo_comunicacion_apoyo: "No",
      aseo_ayudas_apoyo: "No",
      aseo_alimentacion: "No",
      aseo_movilidad_funcional: "No",
      aseo_higiene_aseo: "No",
    });

    expect(
      getPrefixedDropdownUpdates({
        rule: rule!,
        changedFieldId: "aseo_nivel_apoyo",
        changedValue: "No aplica.",
        getOptions: (fieldId) => getSeleccionSelectOptions(fieldId),
      })
    ).toEqual({
      alimentacion: "No aplica.",
      aseo_criar_apoyo: "No aplica",
      aseo_comunicacion_apoyo: "No aplica",
      aseo_ayudas_apoyo: "No aplica",
      aseo_alimentacion: "No aplica",
      aseo_movilidad_funcional: "No aplica",
      aseo_higiene_aseo: "No aplica",
    });

    expect(
      getPrefixedDropdownUpdates({
        rule: rule!,
        changedFieldId: "aseo_nivel_apoyo",
        changedValue: "1. Nivel de apoyo Bajo.",
        getOptions: (fieldId) => getSeleccionSelectOptions(fieldId),
      })
    ).toEqual({
      alimentacion:
        "1. Requiere apoyo en algunas actividades de la vida diaria.",
      aseo_criar_apoyo: "",
      aseo_comunicacion_apoyo: "",
      aseo_ayudas_apoyo: "",
      aseo_alimentacion: "",
      aseo_movilidad_funcional: "",
      aseo_higiene_aseo: "",
    });
  });
});
