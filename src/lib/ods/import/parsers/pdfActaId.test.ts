import { describe, it, expect } from "vitest";
import { extractPdfActaId } from "./pdfActaId";

describe("extractPdfActaId", () => {
  it("extracts ACTA ID from footer", () => {
    const text = "Some PDF content here\nACTA ID: ABCD1234\nMore content";
    expect(extractPdfActaId(text)).toBe("ABCD1234");
  });

  it("extracts ACTA ID without spaces", () => {
    const text = "ACTA ID:XYZ98765";
    expect(extractPdfActaId(text)).toBe("XYZ98765");
  });

  it("returns empty when no ACTA ID", () => {
    expect(extractPdfActaId("No acta id here")).toBe("");
  });

  it("returns uppercase", () => {
    const text = "ACTA ID: abcd1234";
    expect(extractPdfActaId(text)).toBe("ABCD1234");
  });
});
