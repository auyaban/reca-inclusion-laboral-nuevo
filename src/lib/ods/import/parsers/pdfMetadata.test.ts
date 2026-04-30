import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: vi.fn(),
}));

import { tryReadRecaMetadata } from "@/lib/ods/import/parsers/pdfMetadata";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const mockGetDocument = vi.mocked(getDocument);

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

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        getMetadata: () => Promise.resolve({
          info: { "/RECA_Data": JSON.stringify(recaData) },
        }),
      }),
    } as unknown as ReturnType<typeof getDocument>);

    const result = await tryReadRecaMetadata(new ArrayBuffer(0));

    expect(result).not.toBeNull();
    expect(result?.nit_empresa).toBe("900123456");
    expect(result?.nombre_empresa).toBe("TechCorp");
    expect(result?.fecha_servicio).toBe("2026-03-15");
  });

  it("returns null when PDF does not have /RECA_Data", async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        getMetadata: () => Promise.resolve({
          info: { "/Title": "Some PDF" },
        }),
      }),
    } as unknown as ReturnType<typeof getDocument>);

    const result = await tryReadRecaMetadata(new ArrayBuffer(0));

    expect(result).toBeNull();
  });

  it("returns null when pdfjs-dist throws", async () => {
    const rejectPromise = Promise.reject(new Error("Invalid PDF"));
    rejectPromise.catch(() => {});
    mockGetDocument.mockReturnValue({
      promise: rejectPromise,
    } as unknown as ReturnType<typeof getDocument>);

    const result = await tryReadRecaMetadata(new ArrayBuffer(0));

    expect(result).toBeNull();
  });

  it("returns null when /RECA_Data is not a string", async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        getMetadata: () => Promise.resolve({
          info: { "/RECA_Data": { nit_empresa: "900123456" } },
        }),
      }),
    } as unknown as ReturnType<typeof getDocument>);

    const result = await tryReadRecaMetadata(new ArrayBuffer(0));

    expect(result).toBeNull();
  });
});
