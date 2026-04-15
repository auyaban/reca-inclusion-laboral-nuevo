import { describe, expect, it } from "vitest";
import {
  getMeaningfulRepeatedPeopleRows,
  getRepeatedPeopleCardTitle,
  getRepeatedPeopleCollapsedStateAfterAppend,
  getRepeatedPeopleCollapsedStateAfterRemove,
  getRepeatedPeoplePrimaryName,
  isMeaningfulRepeatedPeopleRow,
  isRepeatedPeopleSectionComplete,
  normalizeRestoredRepeatedPeopleRows,
  resolveRepeatedPeopleRowRemoval,
  syncRepeatedPeopleCollapsedState,
  type RepeatedPeopleConfig,
} from "@/lib/repeatedPeople";

type TestRow = {
  nombre_oferente: string;
  cargo_oferente: string;
  telefono_oferente: string;
};

const TEST_CONFIG: RepeatedPeopleConfig<TestRow> = {
  itemLabelSingular: "Oferente",
  itemLabelPlural: "Oferentes",
  primaryNameField: "nombre_oferente",
  meaningfulFieldIds: [
    "nombre_oferente",
    "cargo_oferente",
    "telefono_oferente",
  ],
  createEmptyRow: () => ({
    nombre_oferente: "",
    cargo_oferente: "",
    telefono_oferente: "",
  }),
};

describe("normalizeRestoredRepeatedPeopleRows", () => {
  it("inyecta una fila vacia cuando el restore llega vacio", () => {
    expect(normalizeRestoredRepeatedPeopleRows(undefined, TEST_CONFIG)).toEqual([
      {
        nombre_oferente: "",
        cargo_oferente: "",
        telefono_oferente: "",
      },
    ]);
  });

  it("conserva el orden y las filas parciales restauradas", () => {
    expect(
      normalizeRestoredRepeatedPeopleRows(
        [
          { nombre_oferente: "Ana Perez" },
          { cargo_oferente: "Analista" },
        ],
        TEST_CONFIG
      )
    ).toEqual([
      {
        nombre_oferente: "Ana Perez",
        cargo_oferente: "",
        telefono_oferente: "",
      },
      {
        nombre_oferente: "",
        cargo_oferente: "Analista",
        telefono_oferente: "",
      },
    ]);
  });
});

describe("significancia y completitud", () => {
  it("detecta filas significativas por cualquier campo configurado, no solo por nombre", () => {
    expect(
      isMeaningfulRepeatedPeopleRow(
        {
          nombre_oferente: "",
          cargo_oferente: "Analista",
          telefono_oferente: "",
        },
        TEST_CONFIG
      )
    ).toBe(true);
  });

  it("filtra placeholders vacios sin perder filas tocadas", () => {
    expect(
      getMeaningfulRepeatedPeopleRows(
        [
          {
            nombre_oferente: "",
            cargo_oferente: "",
            telefono_oferente: "",
          },
          {
            nombre_oferente: "",
            cargo_oferente: "Analista",
            telefono_oferente: "",
          },
          {
            nombre_oferente: "Ana Perez",
            cargo_oferente: "",
            telefono_oferente: "",
          },
        ],
        TEST_CONFIG
      )
    ).toEqual([
      {
        nombre_oferente: "",
        cargo_oferente: "Analista",
        telefono_oferente: "",
      },
      {
        nombre_oferente: "Ana Perez",
        cargo_oferente: "",
        telefono_oferente: "",
      },
    ]);
  });

  it("considera completa la seccion solo si hay al menos una fila significativa y todas esas filas estan completas", () => {
    expect(
      isRepeatedPeopleSectionComplete({
        rows: [
          {
            nombre_oferente: "",
            cargo_oferente: "",
            telefono_oferente: "",
          },
          {
            nombre_oferente: "Ana Perez",
            cargo_oferente: "Analista",
            telefono_oferente: "",
          },
        ],
        config: TEST_CONFIG,
        isRowComplete: (row) =>
          row.nombre_oferente.trim().length > 0 &&
          row.cargo_oferente.trim().length > 0,
      })
    ).toBe(true);

    expect(
      isRepeatedPeopleSectionComplete({
        rows: [
          {
            nombre_oferente: "Ana Perez",
            cargo_oferente: "",
            telefono_oferente: "",
          },
        ],
        config: TEST_CONFIG,
        isRowComplete: (row) =>
          row.nombre_oferente.trim().length > 0 &&
          row.cargo_oferente.trim().length > 0,
      })
    ).toBe(false);
  });
});

describe("titulos y estado UI", () => {
  it("usa el nombre primario cuando existe y cae al fallback por indice", () => {
    expect(
      getRepeatedPeoplePrimaryName(
        {
          nombre_oferente: "Ana Perez",
          cargo_oferente: "",
          telefono_oferente: "",
        },
        TEST_CONFIG
      )
    ).toBe("Ana Perez");

    expect(
      getRepeatedPeopleCardTitle(
        {
          nombre_oferente: "",
          cargo_oferente: "",
          telefono_oferente: "",
        },
        1,
        TEST_CONFIG
      )
    ).toBe("Oferente 2");
  });

  it("preserva el colapso previo al agregar una nueva fila", () => {
    expect(
      getRepeatedPeopleCollapsedStateAfterAppend(
        { 0: true, 1: false },
        2
      )
    ).toEqual({
      0: true,
      1: false,
      2: false,
    });
  });

  it("reindexa el estado de colapso al eliminar una fila intermedia", () => {
    expect(
      getRepeatedPeopleCollapsedStateAfterRemove(
        { 0: true, 1: false, 2: true },
        1,
        2
      )
    ).toEqual({
      0: true,
      1: true,
    });
  });

  it("sincroniza indices faltantes y resetea la ultima fila en vez de eliminarla", () => {
    expect(syncRepeatedPeopleCollapsedState({ 1: true }, 2)).toEqual({
      0: false,
      1: true,
    });
    expect(resolveRepeatedPeopleRowRemoval(1)).toBe("reset_last");
    expect(resolveRepeatedPeopleRowRemoval(2)).toBe("remove");
  });
});
