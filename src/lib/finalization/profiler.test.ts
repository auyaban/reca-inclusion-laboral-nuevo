import { afterEach, describe, expect, it, vi } from "vitest";

const {
  captureExceptionMock,
  captureMessageMock,
  addBreadcrumbMock,
} = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  captureMessageMock: vi.fn(),
  addBreadcrumbMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
  addBreadcrumb: addBreadcrumbMock,
}));

import { createFinalizationProfiler } from "@/lib/finalization/profiler";

describe("createFinalizationProfiler", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("emite inicio y exito con contexto seguro", () => {
    vi.stubEnv("NODE_ENV", "development");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("presentacion");
    profiler.mark("spreadsheet.copy_master");
    profiler.finish({
      writes: 4,
      asistentes: 2,
      spreadsheetReused: true,
      targetSheetName: "1. PRESENTACION DEL PROGRAMA IL",
      rawPayloadArtifactStatus: "uploaded",
    });

    expect(info).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(addBreadcrumbMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        category: "finalization",
        level: "info",
        message: "[finalization] started",
      })
    );
    expect(addBreadcrumbMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        category: "finalization",
        level: "info",
        message: "[finalization] succeeded",
        data: expect.objectContaining({
          writes: 4,
          asistentes: 2,
        }),
      })
    );
  });

  it("emite fallo normalizado sin logs en test", () => {
    vi.stubEnv("NODE_ENV", "test");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("sensibilizacion");
    profiler.mark("drive.upload_raw_payload");
    profiler.fail(
      {
        message: "Forbidden",
        code: "42501",
        details: "new row violates row-level security policy",
        status: 403,
      },
      { asistentes: 1 }
    );

    expect(captureMessageMock).not.toHaveBeenCalled();

    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Forbidden",
        name: "NonErrorObject",
      }),
      expect.objectContaining({
        level: "error",
        tags: expect.objectContaining({
          finalization_event: "failed",
          form_slug: "sensibilizacion",
        }),
        extra: expect.objectContaining({
          formSlug: "sensibilizacion",
          stepCount: 1,
          lastStep: "drive.upload_raw_payload",
          asistentes: 1,
          errorMessage: "Forbidden",
          errorName: "NonErrorObject",
          errorCode: "42501",
          errorDetails: "new row violates row-level security policy",
          errorStatusCode: 403,
        }),
      })
    );

    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
  });

  it("propaga metadatos de text review a la telemetria", () => {
    vi.stubEnv("NODE_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("condiciones-vacante");
    profiler.finish({
      textReviewStatus: "skipped",
      textReviewReason: "missing_access_token",
      textReviewReviewedCount: 0,
      textReviewModel: "gpt-4.1-nano",
    });

    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
    expect(addBreadcrumbMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: "[finalization] succeeded",
        data: expect.objectContaining({
          textReviewStatus: "skipped",
          textReviewReason: "missing_access_token",
          textReviewReviewedCount: 0,
          textReviewModel: "gpt-4.1-nano",
        }),
      })
    );
  });

  it("omite logs del profiler en produccion", () => {
    vi.stubEnv("NODE_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("sensibilizacion");
    profiler.finish({ writes: 1 });
    profiler.fail(new Error("boom"));

    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(3);
  });
});
