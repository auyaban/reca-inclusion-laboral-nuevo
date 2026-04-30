import { describe, it, expect, vi, beforeEach } from "vitest";
import { runImportPipeline, readPdfText, fuzzyNitMatch, unwrapPayloadNormalized, type CatalogDependencies } from "@/lib/ods/import/pipeline";
import type { TarifaRow, CompanyRow } from "@/lib/ods/rules-engine/rulesEngine";

vi.mock("@/lib/ods/import/parsers/pdfMetadata", () => ({
  tryReadRecaMetadata: vi.fn(),
}));

vi.mock("@/lib/ods/import/parsers/pdfActaId", () => ({
  extractPdfActaId: vi.fn(),
}));

vi.mock("@/lib/ods/import/edgeFunctionClient", () => ({
  callExtractActaEdgeFunction: vi.fn(),
}));

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(() =>
    Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() =>
        Promise.resolve({
          getTextContent: vi.fn(() =>
            Promise.resolve({ items: [{ str: "test content" }] })
          ),
        })
      ),
    })
  ),
}));

import { tryReadRecaMetadata } from "@/lib/ods/import/parsers/pdfMetadata";
import { extractPdfActaId } from "@/lib/ods/import/parsers/pdfActaId";
import { callExtractActaEdgeFunction } from "@/lib/ods/import/edgeFunctionClient";

const mockTryReadRecaMetadata = vi.mocked(tryReadRecaMetadata);
const mockExtractPdfActaId = vi.mocked(extractPdfActaId);
const mockCallExtractActaEdgeFunction = vi.mocked(callExtractActaEdgeFunction);

const mockTarifas: TarifaRow[] = [
  { codigo_servicio: "SENS-VIR-01", referencia_servicio: "Sensibilizacion Virtual", descripcion_servicio: "Sensibilizacion Virtual", modalidad_servicio: "Virtual", valor_base: 50000 },
];

const mockCompany: CompanyRow = {
  nit_empresa: "900123456",
  nombre_empresa: "TechCorp",
  ciudad_empresa: "Bogota",
  sede_empresa: "Central",
  zona_empresa: "Urbana",
  caja_compensacion: "Compensar",
  correo_profesional: null,
  profesional_asignado: null,
  asesor: null,
};

function makeDeps(overrides?: Partial<CatalogDependencies>): CatalogDependencies {
  return {
    tarifas: mockTarifas,
    allKnownNits: ["900123456", "800987654"],
    companyByNit: (nit: string) => nit.replace(/[^0-9]/g, "") === "900123456" ? mockCompany : null,
    companyByNameFuzzy: () => null,
    professionalByNameFuzzy: () => null,
    participantByCedula: () => null,
    finalizedRecordByActaRef: async () => null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runImportPipeline integration", () => {
  it("Nivel 1 gana cuando RECA metadata existe", async () => {
    mockTryReadRecaMetadata.mockResolvedValue({
      nit_empresa: "900123456",
      nombre_empresa: "TechCorp",
      fecha_servicio: "2026-03-15",
      participantes: [],
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      makeDeps(),
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(1);
    expect(result.decisionLog).toHaveLength(1);
    expect(result.decisionLog[0].success).toBe(true);
    expect(result.decisionLog[0].levelName).toBe("RECA Metadata");
    expect(result.analysis.nit_empresa).toBe("900123456");
    expect(mockCallExtractActaEdgeFunction).not.toHaveBeenCalled();
  });

  it("Nivel 2 gana cuando ACTA ID tiene payload_normalized", async () => {
    mockTryReadRecaMetadata.mockResolvedValue(null);
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");

    const deps = makeDeps({
      finalizedRecordByActaRef: async () => ({
        payload_normalized: {
          nit_empresa: "900123456",
          nombre_empresa: "TechCorp",
          fecha_servicio: "2026-03-15",
          participantes: [],
        },
      }),
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps,
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.decisionLog.some((d) => d.level === 2 && d.success)).toBe(true);
    expect(result.analysis.nit_empresa).toBe("900123456");
    expect(mockCallExtractActaEdgeFunction).not.toHaveBeenCalled();
  });

  it("Nivel 2 falla -> cascada a Nivel 3 (C2)", async () => {
    mockTryReadRecaMetadata.mockResolvedValue(null);
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");

    const deps = makeDeps({
      finalizedRecordByActaRef: async () => null,
    });

    mockCallExtractActaEdgeFunction.mockResolvedValue({
      success: true,
      data: {
        nit_empresa: "900123456",
        nombre_empresa: "TechCorp",
        fecha_servicio: "2026-03-15",
        participantes: [],
        modalidad_servicio: "Virtual",
      },
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps,
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(3);
    expect(result.decisionLog.some((d) => d.level === 2 && !d.success)).toBe(true);
    expect(result.decisionLog.some((d) => d.level === 3 && d.success)).toBe(true);
  });

  it("Niveles 1-3 fallan -> Nivel 4 regex parser", async () => {
    mockTryReadRecaMetadata.mockResolvedValue(null);
    mockExtractPdfActaId.mockReturnValue("");
    mockCallExtractActaEdgeFunction.mockResolvedValue({ success: false, error: "fail" });

    const deps = makeDeps();

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps,
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(4);
    expect(result.decisionLog.some((d) => d.level === 4 && d.success)).toBe(true);
  });

  it("C3: empresa con NIT con typo corrige via fuzzyNitMatch", async () => {
    mockTryReadRecaMetadata.mockResolvedValue({
      nit_empresa: "900123457",
      nombre_empresa: "TechCorp",
      participantes: [],
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      makeDeps(),
    );

    expect(result.success).toBe(true);
    expect(result.companyMatch).toBeDefined();
    expect(result.companyMatch?.matchType).toBe("nit_fuzzy");
    expect(result.companyMatch?.nit_empresa).toBe("900123456");
  });
});

describe("PD-1 Nivel 2 spread completo del payload_normalized", () => {
  it("preserva is_fallido, cargo_objetivo, total_vacantes del payload", async () => {
    mockTryReadRecaMetadata.mockResolvedValue(null);
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");

    const deps = makeDeps({
      finalizedRecordByActaRef: async () => ({
        payload_normalized: {
          nit_empresa: "900123456",
          nombre_empresa: "TechCorp",
          fecha_servicio: "2026-03-15",
          participantes: [],
          is_fallido: true,
          cargo_objetivo: "Auxiliar",
          total_vacantes: 3,
          numero_seguimiento: "SEG-001",
        },
      }),
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps,
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.parseResult).toBeDefined();
    expect((result.parseResult as Record<string, unknown>).is_fallido).toBe(true);
    expect((result.parseResult as Record<string, unknown>).cargo_objetivo).toBe("Auxiliar");
    expect((result.parseResult as Record<string, unknown>).total_vacantes).toBe(3);
    expect((result.parseResult as Record<string, unknown>).numero_seguimiento).toBe("SEG-001");
    expect(result.analysis.is_fallido).toBe(true);
    expect(result.analysis.cargo_objetivo).toBe("Auxiliar");
    expect(result.analysis.total_vacantes).toBe(3);
  });
});

describe("EL-1 normalizacion modalidades alternas", () => {
  it("Bogotá con tilde no produce alternativa redundante 'Bogota'", async () => {
    mockTryReadRecaMetadata.mockResolvedValue({
      nit_empresa: "900123456",
      nombre_empresa: "TechCorp",
      fecha_servicio: "2026-03-15",
      modalidad_servicio: "Bogotá",
      participantes: [],
    });

    const tarifas: TarifaRow[] = [
      { codigo_servicio: "SENS-VIR-01", referencia_servicio: "Sens Virtual", descripcion_servicio: "Sens Virtual", modalidad_servicio: "Virtual", valor_base: 50000 },
      { codigo_servicio: "SENS-BOG-01", referencia_servicio: "Sens Bogota", descripcion_servicio: "Sens Bogota", modalidad_servicio: "Bogota", valor_base: 60000 },
      { codigo_servicio: "SENS-FUE-01", referencia_servicio: "Sens Fuera", descripcion_servicio: "Sens Fuera", modalidad_servicio: "Fuera de Bogota", valor_base: 70000 },
    ];

    const deps = makeDeps({ tarifas });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps,
    );

    expect(result.success).toBe(true);
    // No debe haber sugerencia con codigo Bogota duplicado al actual normalizado
    const codigos = result.suggestions.map((s) => s.codigo_servicio);
    // El codigo Bogota actual no debe aparecer 2 veces
    const bogCount = codigos.filter((c) => c === "SENS-BOG-01").length;
    expect(bogCount).toBeLessThanOrEqual(1);
  });
});

describe("EL-2 todas las modalidades alternas", () => {
  it("intenta TODAS las modalidades alternas y puede generar hasta 3 sugerencias", async () => {
    mockTryReadRecaMetadata.mockResolvedValue({
      nit_empresa: "900123456",
      nombre_empresa: "TechCorp",
      fecha_servicio: "2026-03-15",
      modalidad_servicio: "Virtual",
      participantes: [],
    });

    const tarifas: TarifaRow[] = [
      { codigo_servicio: "SENS-VIR-01", referencia_servicio: "Sens Virtual", descripcion_servicio: "Sens Virtual", modalidad_servicio: "Virtual", valor_base: 50000 },
      { codigo_servicio: "SENS-BOG-01", referencia_servicio: "Sens Bogota", descripcion_servicio: "Sens Bogota", modalidad_servicio: "Bogota", valor_base: 60000 },
      { codigo_servicio: "SENS-FUE-01", referencia_servicio: "Sens Fuera", descripcion_servicio: "Sens Fuera", modalidad_servicio: "Fuera de Bogota", valor_base: 70000 },
    ];

    const deps = makeDeps({ tarifas });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps,
    );

    expect(result.success).toBe(true);
    // Como minimo debe poder devolver mas de 1 si hay alternativas posibles
    expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
    // Debe ser capaz de devolver hasta 3 (maximo del rankSuggestions.slice)
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });
});

describe("BS-1 readPdfText limita paginas y caracteres", () => {
  it("invoca getPage maximo 25 veces aunque numPages sea 100", async () => {
    const getPageMock = vi.fn(() => Promise.resolve({
      getTextContent: vi.fn(() => Promise.resolve({
        items: [{ str: "x" }],
      })),
    }));
    const unpdf = await import("unpdf");
    const mockGetDocumentProxy = vi.mocked(unpdf.getDocumentProxy);
    mockGetDocumentProxy.mockResolvedValueOnce({
      numPages: 100,
      getPage: getPageMock,
    } as never);

    await readPdfText(new ArrayBuffer(0));

    expect(getPageMock.mock.calls.length).toBeLessThanOrEqual(25);
  });
});

describe("unwrapPayloadNormalized", () => {
  it("forma flat: devuelve el payload tal cual cuando no hay parsed_raw", () => {
    const flat = {
      nit_empresa: "900696296-4",
      modalidad_servicio: "Bogotá",
      participantes: [{ cedula_usuario: "100", nombre_usuario: "X" }],
    };
    expect(unwrapPayloadNormalized(flat)).toEqual(flat);
  });

  it("forma envoltorio: hace unwrap de parsed_raw + agrega acta_ref de metadata + document_kind de attachment", () => {
    const wrapper = {
      form_id: "contratacion_incluyente",
      metadata: { acta_ref: "V2GAZSSU" },
      attachment: { document_kind: "inclusive_hiring" },
      parsed_raw: {
        nit_empresa: "900696296-4",
        nombre_empresa: "CORONA INDUSTRIAL SAS",
        modalidad_servicio: "Presencial",
        ciudad_empresa: "Bogotá",
        cargo_objetivo: "Auxiliar",
        participantes: [
          { cargo_servicio: "Auxiliar", cedula_usuario: "200000000", nombre_usuario: "Test 1" },
        ],
      },
      schema_version: 1,
    };
    const out = unwrapPayloadNormalized(wrapper);
    expect(out.nit_empresa).toBe("900696296-4");
    expect(out.modalidad_servicio).toBe("Presencial");
    expect(out.ciudad_empresa).toBe("Bogotá");
    expect(out.cargo_objetivo).toBe("Auxiliar");
    expect(out.acta_ref).toBe("V2GAZSSU");
    expect(out.document_kind).toBe("inclusive_hiring");
    expect((out.participantes as Array<unknown>).length).toBe(1);
    // El envoltorio NO debe sobrevivir
    expect(out.metadata).toBeUndefined();
    expect(out.attachment).toBeUndefined();
    expect(out.form_id).toBeUndefined();
  });

  it("parsed_raw con campos propios prevalecen sobre los derivados del wrapper", () => {
    const wrapper = {
      metadata: { acta_ref: "WRAPPER-ID" },
      attachment: { document_kind: "wrong_kind" },
      parsed_raw: {
        acta_ref: "INNER-ID",
        document_kind: "right_kind",
        nit_empresa: "900",
      },
    };
    const out = unwrapPayloadNormalized(wrapper);
    expect(out.acta_ref).toBe("INNER-ID");
    expect(out.document_kind).toBe("right_kind");
  });
});

describe("fuzzyNitMatch", () => {
  it("returns exact match when NIT matches exactly", () => {
    const knownNits = ["900123456", "800987654", "700111222"];
    const result = fuzzyNitMatch("900123456", knownNits);
    expect(result).not.toBeNull();
    expect(result?.nit).toBe("900123456");
    expect(result?.confidence).toBe(1.0);
  });

  it("returns fuzzy match when NIT has typo", () => {
    const knownNits = ["900123456", "800987654", "700111222"];
    const result = fuzzyNitMatch("900123457", knownNits);
    expect(result).not.toBeNull();
    expect(result?.nit).toBe("900123456");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("returns null when no match above threshold", () => {
    const knownNits = ["900123456", "800987654", "700111222"];
    const result = fuzzyNitMatch("111111111", knownNits);
    expect(result).toBeNull();
  });

  it("returns null for empty input", () => {
    const knownNits = ["900123456"];
    const result = fuzzyNitMatch("", knownNits);
    expect(result).toBeNull();
  });
});
