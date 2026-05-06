import { describe, expect, it } from "vitest";

import {
  EMPRESA_SEARCH_FIELDS,
  EMPRESA_SELECT_FIELDS,
  parseEmpresaSnapshot,
} from "@/lib/empresa";

describe("empresa field selection", () => {
  it("includes zona_empresa in the lightweight search query", () => {
    expect(EMPRESA_SEARCH_FIELDS).toContain("zona_empresa");
    expect(EMPRESA_SEARCH_FIELDS).toContain("sede_empresa");
  });

  it("preserves zona_empresa when parsing full snapshots", () => {
    const snapshot = parseEmpresaSnapshot({
      id: "empresa-1",
      nombre_empresa: "ACME SAS",
      nit_empresa: "900123456",
      sede_empresa: "Sede Norte",
      zona_empresa: "Zona Centro",
    });

    expect(EMPRESA_SELECT_FIELDS).toContain("zona_empresa");
    expect(snapshot?.zona_empresa).toBe("Zona Centro");
    expect(snapshot?.sede_empresa).toBe("Sede Norte");
  });
});
