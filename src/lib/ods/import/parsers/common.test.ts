import { describe, it, expect } from "vitest";
import {
  cleanText,
  cleanCedula,
  cleanNit,
  cleanName,
  normalizeText,
  isPersonCandidate,
  toIsoDate,
  splitJoinedCedulaPercentage,
  splitJoinedCedulaPhone,
  extractCedulaFromOferenteToken,
  companyFromEmailDomain,
  parseDurationHours,
  decodeMojibake,
  deriveNombreProfesionalFromActaSources,
} from "./common";

describe("cleanText", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanText("  hello   world  ")).toBe("hello world");
  });

  it("handles null and undefined", () => {
    expect(cleanText(null)).toBe("");
    expect(cleanText(undefined)).toBe("");
  });
});

describe("cleanCedula", () => {
  it("extracts digits only", () => {
    expect(cleanCedula("1.234.567")).toBe("1234567");
    expect(cleanCedula("CC 12345678")).toBe("12345678");
  });

  it("returns empty for non-numeric", () => {
    expect(cleanCedula("abc")).toBe("");
  });
});

describe("cleanNit", () => {
  it("extracts NIT pattern", () => {
    expect(cleanNit("NIT: 123456789-1")).toBe("123456789-1");
  });

  it("returns raw if no pattern match", () => {
    expect(cleanNit("abc")).toBe("abc");
  });
});

describe("cleanName", () => {
  it("trims and strips leading/trailing punctuation", () => {
    expect(cleanName("  Juan Perez  ")).toBe("Juan Perez");
    expect(cleanName(": Juan :")).toBe("Juan");
  });
});

describe("normalizeText", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeText("HOLA MUNDO")).toBe("hola mundo");
    expect(normalizeText("café")).toBe("cafe");
  });

  it("removes special characters", () => {
    expect(normalizeText("hello-world!")).toBe("hello world");
  });
});

describe("isPersonCandidate", () => {
  it("returns true for person names", () => {
    expect(isPersonCandidate("Juan Perez")).toBe(true);
    expect(isPersonCandidate("Maria Garcia Lopez")).toBe(true);
  });

  it("returns false for URLs", () => {
    expect(isPersonCandidate("https://example.com")).toBe(false);
  });

  it("returns false for banned tokens", () => {
    expect(isPersonCandidate("Nit Empresa")).toBe(false);
    expect(isPersonCandidate("Fecha de visita")).toBe(false);
  });

  it("returns false for short text", () => {
    expect(isPersonCandidate("AB")).toBe(false);
  });
});

describe("toIsoDate", () => {
  it("parses YYYY-MM-DD", () => {
    expect(toIsoDate("2026-04-29")).toBe("2026-04-29");
  });

  it("parses DD/MM/YYYY", () => {
    expect(toIsoDate("29/04/2026")).toBe("2026-04-29");
  });

  it("parses DD-MM-YYYY", () => {
    expect(toIsoDate("29-04-2026")).toBe("2026-04-29");
  });

  it("returns empty for invalid date", () => {
    expect(toIsoDate("not-a-date")).toBe("");
  });

  it("handles Date objects", () => {
    const d = new Date(2026, 3, 29);
    expect(toIsoDate(d)).toBe("2026-04-29");
  });
});

describe("splitJoinedCedulaPercentage", () => {
  it("splits cedula and percentage", () => {
    const [ced, pct] = splitJoinedCedulaPercentage("1234567890%");
    expect(ced).toBe("12345678");
    expect(pct).toBe("90%");
  });

  it("returns empty for invalid input", () => {
    const [ced, pct] = splitJoinedCedulaPercentage("abc");
    expect(ced).toBe("");
    expect(pct).toBe("");
  });
});

describe("splitJoinedCedulaPhone", () => {
  it("splits cedula and phone when phone starts with 3", () => {
    const [ced, phone] = splitJoinedCedulaPhone("12345678903101234567");
    expect(ced).toBe("1234567890");
    expect(phone).toBe("3101234567");
  });

  it("returns empty for short input", () => {
    const [ced, phone] = splitJoinedCedulaPhone("123");
    expect(ced).toBe("");
    expect(phone).toBe("");
  });
});

describe("extractCedulaFromOferenteToken", () => {
  it("extracts cedula from plain token", () => {
    expect(extractCedulaFromOferenteToken("12345678")).toBe("12345678");
  });

  it("handles percentage-joined token", () => {
    const ced = extractCedulaFromOferenteToken("1234567890%");
    expect(ced).toBe("12345678");
  });
});

describe("companyFromEmailDomain", () => {
  it("extracts company from email", () => {
    expect(companyFromEmailDomain("contacto@techcorp.com.co")).toBe("TECHCORP");
  });

  it("handles compound domains", () => {
    expect(companyFromEmailDomain("info@mi-empresa.com")).toBe("MI EMPRESA");
  });
});

describe("parseDurationHours", () => {
  it("parses hours", () => {
    expect(parseDurationHours("2 horas")).toBe(2);
  });

  it("parses minutes", () => {
    expect(parseDurationHours("30 min")).toBe(0.5);
  });

  it("returns null for invalid", () => {
    expect(parseDurationHours("")).toBeNull();
  });
});

describe("decodeMojibake", () => {
  it("decodes double UTF-8: MarÃ­a -> Maria", () => {
    const result = decodeMojibake("MarÃ\u00ADa");
    expect(result).toBe("María");
  });

  it("decodes AcciÃ³n -> Accion", () => {
    const result = decodeMojibake("AcciÃ³n");
    expect(result).toBe("Acción");
  });

  it("decodes MÃºltiple -> Multiple", () => {
    const result = decodeMojibake("MÃºltiple");
    expect(result).toBe("Múltiple");
  });

  it("returns unchanged if no mojibake pattern", () => {
    expect(decodeMojibake("Normal text")).toBe("Normal text");
  });

  it("returns unchanged for empty string", () => {
    expect(decodeMojibake("")).toBe("");
  });
});

describe("deriveNombreProfesionalFromActaSources", () => {
  it("prefers asistentes object names over payload nombre_profesional", () => {
    expect(
      deriveNombreProfesionalFromActaSources({
        asistentes: [{ nombre: "Asistente Uno" }],
        nombre_profesional: "Responsable Empresa",
      })
    ).toBe("Asistente Uno");
  });

  it("prefers asistentes string names over candidatos and fallback fields", () => {
    expect(
      deriveNombreProfesionalFromActaSources({
        asistentes: ["Asistente String"],
        candidatos_profesional: ["Candidato Uno"],
        profesional_asignado: "Profesional Asignado",
        asesor: "Asesor Empresa",
        nombre_profesional: "Responsable Empresa",
      })
    ).toBe("Asistente String");
  });

  it("skips empty strings and objects without usable nombre", () => {
    expect(
      deriveNombreProfesionalFromActaSources({
        asistentes: ["", { nombre: "" }, { cargo: "Psicologo" }],
        candidatos_profesional: ["Candidato Fallback"],
      })
    ).toBe("Candidato Fallback");
  });

  it("falls back through responsible fields and returns empty when none exist", () => {
    expect(
      deriveNombreProfesionalFromActaSources({
        profesional_asignado: "Profesional Asignado",
        profesional_reca: "Profesional RECA",
        asesor: "Asesor Empresa",
        nombre_profesional: "Responsable Empresa",
      })
    ).toBe("Profesional Asignado");

    expect(deriveNombreProfesionalFromActaSources({ asistentes: [] })).toBe("");
  });
});
