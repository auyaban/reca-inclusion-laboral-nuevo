import { describe, expect, it } from "vitest";
import {
  createRepeatedPeopleRowForInsert,
  getMeaningfulRepeatedPeopleRows,
  getRepeatedPeopleCardSubtitle,
  getRepeatedPeopleCardTitle,
  getRepeatedPeopleCollapsedStateAfterAppend,
  getRepeatedPeopleCollapsedStateAfterRemove,
  getRepeatedPeoplePrimaryName,
  isMeaningfulRepeatedPeopleRow,
  isRepeatedPeopleSectionComplete,
  normalizeRestoredRepeatedPeopleRows,
  resolveRepeatedPeopleRowRemoval,
  syncRepeatedPeopleCollapsedState,
  syncRepeatedPeopleRowOrder,
  type RepeatedPeopleConfig,
} from "@/lib/repeatedPeople";

type TestRow = {
  nombre_oferente: string;
  cargo_oferente: string;
  telefono_oferente: string;
};

type OrderedTestRow = TestRow & {
  numero: string;
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

const ORDERED_TEST_CONFIG: RepeatedPeopleConfig<OrderedTestRow> = {
  ...TEST_CONFIG,
  orderField: "numero",
  createEmptyRow: () => ({
    nombre_oferente: "",
    cargo_oferente: "",
    telefono_oferente: "",
    numero: "",
  }),
};

const CUSTOM_CARD_CONFIG: RepeatedPeopleConfig<TestRow> = {
  ...TEST_CONFIG,
  getCardTitle: (_row, index) => `Oferente ${index + 1}`,
  getCardSubtitle: (row) => {
    const normalizedName = row.nombre_oferente.trim();
    const normalizedCedula = row.cargo_oferente.trim();

    if (normalizedName && normalizedCedula) {
      return `${normalizedName} - ${normalizedCedula}`;
    }

    return normalizedName || normalizedCedula || null;
  },
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

  it("permite personalizar titulo y subtitulo del header cuando el config lo define", () => {
    expect(
      getRepeatedPeopleCardTitle(
        {
          nombre_oferente: "Ana Perez",
          cargo_oferente: "1000061994",
          telefono_oferente: "",
        },
        0,
        CUSTOM_CARD_CONFIG
      )
    ).toBe("Oferente 1");

    expect(
      getRepeatedPeopleCardSubtitle(
        {
          nombre_oferente: "Ana Perez",
          cargo_oferente: "1000061994",
          telefono_oferente: "",
        },
        0,
        CUSTOM_CARD_CONFIG
      )
    ).toBe("Ana Perez - 1000061994");
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

  it("reindexa el orderField configurado cuando sincroniza el orden", () => {
    expect(
      syncRepeatedPeopleRowOrder(
        [
          {
            nombre_oferente: "Ana Perez",
            cargo_oferente: "Analista",
            telefono_oferente: "3000000001",
            numero: "9",
          },
          {
            nombre_oferente: "Luis Gomez",
            cargo_oferente: "Auxiliar",
            telefono_oferente: "3000000002",
            numero: "4",
          },
        ],
        ORDERED_TEST_CONFIG
      )
    ).toEqual([
      {
        nombre_oferente: "Ana Perez",
        cargo_oferente: "Analista",
        telefono_oferente: "3000000001",
        numero: "1",
      },
      {
        nombre_oferente: "Luis Gomez",
        cargo_oferente: "Auxiliar",
        telefono_oferente: "3000000002",
        numero: "2",
      },
    ]);
  });

  it("prepara una fila nueva con el orderField alineado al indice de insercion", () => {
    expect(createRepeatedPeopleRowForInsert(ORDERED_TEST_CONFIG, 2)).toEqual({
      nombre_oferente: "",
      cargo_oferente: "",
      telefono_oferente: "",
      numero: "3",
    });
  });
});
