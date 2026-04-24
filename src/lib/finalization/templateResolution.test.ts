import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_INTERPRETE_LSC_TEMPLATE_ID,
  resolveFinalizationTemplateId,
} from "@/lib/finalization/templateResolution";

const originalNodeEnv = process.env.NODE_ENV;
const originalLscTemplateId = process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID;

describe("resolveFinalizationTemplateId", () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID = originalLscTemplateId;
  });

  it("allows the local fallback for interprete-lsc in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID;

    expect(resolveFinalizationTemplateId("interprete-lsc")).toBe(
      DEFAULT_INTERPRETE_LSC_TEMPLATE_ID
    );
  });

  it("allows the local fallback for interprete-lsc in test", () => {
    process.env.NODE_ENV = "test";
    delete process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID;

    expect(resolveFinalizationTemplateId("interprete-lsc")).toBe(
      DEFAULT_INTERPRETE_LSC_TEMPLATE_ID
    );
  });

  it("requires the production env for interprete-lsc", () => {
    process.env.NODE_ENV = "production";
    delete process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID;

    expect(resolveFinalizationTemplateId("interprete-lsc")).toBeNull();
  });

  it("uses the configured template when present", () => {
    process.env.NODE_ENV = "production";
    process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID = "lsc-template-id";

    expect(resolveFinalizationTemplateId("interprete-lsc")).toBe(
      "lsc-template-id"
    );
  });
});
