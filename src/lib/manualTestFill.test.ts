import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildInduccionOperativaManualTestValues,
  buildInduccionOrganizacionalManualTestValues,
  buildContratacionManualTestValues,
  buildSeleccionManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import { INDUCCION_OPERATIVA_TEST_EMPRESA } from "@/lib/testing/induccionOperativaFixtures";
import { INDUCCION_ORGANIZACIONAL_TEST_EMPRESA } from "@/lib/testing/induccionOrganizacionalFixtures";
import { SELECCION_TEST_EMPRESA } from "@/lib/testing/seleccionFixtures";
import { induccionOperativaSchema } from "@/lib/validations/induccionOperativa";
import { induccionOrganizacionalSchema } from "@/lib/validations/induccionOrganizacional";
import { contratacionSchema } from "@/lib/validations/contratacion";
import { seleccionSchema } from "@/lib/validations/seleccion";

describe("manual test fill helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("builds valid seleccion values for manual QA", () => {
    const result = seleccionSchema.safeParse(
      buildSeleccionManualTestValues(SELECCION_TEST_EMPRESA)
    );

    expect(result.success).toBe(true);
  });

  it("builds valid contratacion values for manual QA", () => {
    const result = contratacionSchema.safeParse(
      buildContratacionManualTestValues(SELECCION_TEST_EMPRESA)
    );

    expect(result.success).toBe(true);
  });

  it("builds valid induccion organizacional values for manual QA", () => {
    const result = induccionOrganizacionalSchema.safeParse(
      buildInduccionOrganizacionalManualTestValues(
        INDUCCION_ORGANIZACIONAL_TEST_EMPRESA
      )
    );

    expect(result.success).toBe(true);
  });

  it("builds valid induccion operativa values for manual QA", () => {
    const result = induccionOperativaSchema.safeParse(
      buildInduccionOperativaManualTestValues(INDUCCION_OPERATIVA_TEST_EMPRESA)
    );

    expect(result.success).toBe(true);
  });

  it("uses the current QA date and allows an explicit override", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T18:00:00Z"));

    const dynamicResult = buildSeleccionManualTestValues(SELECCION_TEST_EMPRESA);

    expect(dynamicResult.fecha_visita).toBe("2026-04-15");
    expect(dynamicResult.oferentes[0].fecha_firma_contrato).toBe("2026-04-15");

    vi.stubEnv("MANUAL_TEST_FILL_DATE", "2026-01-02");

    const overrideResult = buildContratacionManualTestValues(
      SELECCION_TEST_EMPRESA
    );

    expect(overrideResult.fecha_visita).toBe("2026-01-02");
    expect(overrideResult.vinculados[0].fecha_fin).toBe("2026-01-02");
  });

  it("only shows the manual fill action outside production or in preview", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(isManualTestFillEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    expect(isManualTestFillEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(isManualTestFillEnabled()).toBe(false);
  });
});
