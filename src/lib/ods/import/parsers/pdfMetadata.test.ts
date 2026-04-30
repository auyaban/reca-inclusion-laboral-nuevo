import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(),
}));

import { tryReadRecaMetadata } from "@/lib/ods/import/parsers/pdfMetadata";
import { getDocumentProxy } from "unpdf";

const mockGetDocumentProxy = vi.mocked(getDocumentProxy);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tryReadRecaMetadata", () => {
  it("returns parsed JSON when PDF has /RECA_Data", async () => {
    const recaData = {
      nit_empresa: "900123456",
      nombre_empresa: "TechCorp",
      fecha_servicio: "2026-03-15",
    };

    mockGetDocumentProxy.mockResolvedValue({
      getMetadata: () => Promise.resolve({
        info: { "/RECA_Data": JSON.stringify(recaData) },
      }),
    } as never);

    const result = await tryReadRecaMetadata(new ArrayBuffer(0));

    expect(result).not.toBeNull();
    expect(result?.nit_empresa).toBe("900123456");
    expect(result?.nombre_empresa).toBe("TechCorp");
    expect(result?.fecha_servicio).toBe("2026-03-15");
  });

  it("returns null when PDF does not have /RECA_Data", async () => {
    mockGetDocumentProxy.mockResolvedValue({
      getMetadata: () => Promise.resolve({
        info: { "/Title": "Some PDF" },
      }),
    } as never);

    const result = await tryReadRecaMetadata(new ArrayBuffer(0));

    expect(result).toBeNull();
  });

  it("returns null when pdfjs throws", async () => {
    mockGetDocumentProxy.mockRejectedValue(new Error("Invalid PDF"));

    const result = await tryReadRecaMetadata(new ArrayBuffer(0));

    expect(result).toBeNull();
  });

  it("returns null when /RECA_Data is not a string", async () => {
    mockGetDocumentProxy.mockResolvedValue({
      getMetadata: () => Promise.resolve({
        info: { "/RECA_Data": { nit_empresa: "900123456" } },
      }),
    } as never);

    const result = await tryReadRecaMetadata(new ArrayBuffer(0));

    expect(result).toBeNull();
  });
});
