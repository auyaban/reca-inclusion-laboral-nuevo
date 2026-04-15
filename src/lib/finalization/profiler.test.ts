import { afterEach, describe, expect, it, vi } from "vitest";

const { captureExceptionMock, captureMessageMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  captureMessageMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
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

    expect(captureMessageMock).toHaveBeenNthCalledWith(
      1,
      "[finalization] started",
      expect.objectContaining({
        level: "info",
        tags: expect.objectContaining({
          domain: "finalization",
          finalization_event: "started",
          form_slug: "presentacion",
        }),
        extra: expect.objectContaining({
          formSlug: "presentacion",
          stepCount: 0,
          lastStep: null,
        }),
      })
    );

    expect(captureMessageMock).toHaveBeenNthCalledWith(
      2,
      "[finalization] succeeded",
      expect.objectContaining({
        level: "info",
        tags: expect.objectContaining({
          finalization_event: "succeeded",
          form_slug: "presentacion",
        }),
        extra: expect.objectContaining({
          formSlug: "presentacion",
          stepCount: 1,
          lastStep: "spreadsheet.copy_master",
          writes: 4,
          asistentes: 2,
          spreadsheetReused: true,
          targetSheetName: "1. PRESENTACION DEL PROGRAMA IL",
          rawPayloadArtifactStatus: "uploaded",
        }),
      })
    );

    expect(info).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it("emite fallo normalizado sin logs en test", () => {
    vi.stubEnv("NODE_ENV", "test");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("sensibilizacion");
    profiler.mark("drive.upload_raw_payload");
    profiler.fail("boom", { asistentes: 1 });

    expect(captureMessageMock).toHaveBeenNthCalledWith(
      1,
      "[finalization] started",
      expect.objectContaining({
        tags: expect.objectContaining({
          finalization_event: "started",
          form_slug: "sensibilizacion",
        }),
      })
    );

    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
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
          errorMessage: "boom",
          errorName: "Error",
        }),
      })
    );

    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
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

    expect(captureMessageMock).toHaveBeenNthCalledWith(
      2,
      "[finalization] succeeded",
      expect.objectContaining({
        extra: expect.objectContaining({
          textReviewStatus: "skipped",
          textReviewReason: "missing_access_token",
          textReviewReviewedCount: 0,
          textReviewModel: "gpt-4.1-nano",
        }),
      })
    );

    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("omite logs del profiler en produccion", () => {
    vi.stubEnv("NODE_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("sensibilizacion");
    profiler.finish({ writes: 1 });
    profiler.fail(new Error("boom"));

    expect(captureMessageMock).toHaveBeenCalled();
    expect(captureExceptionMock).toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
