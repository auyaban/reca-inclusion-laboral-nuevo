import { afterEach, describe, expect, it, vi } from "vitest";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";

describe("createFinalizationProfiler", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("loguea solo en development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("presentacion");
    profiler.mark("spreadsheet.copy_master");
    profiler.finish({ empresa: "Demo" });
    profiler.fail(new Error("boom"));

    expect(info).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });

  it("omite logs del profiler en test", () => {
    vi.stubEnv("NODE_ENV", "test");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("presentacion");
    profiler.finish({ empresa: "Demo" });
    profiler.fail(new Error("boom"));

    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("omite logs del profiler en produccion", () => {
    vi.stubEnv("NODE_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const profiler = createFinalizationProfiler("sensibilizacion");
    profiler.finish({ empresa: "Demo" });
    profiler.fail(new Error("boom"));

    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
