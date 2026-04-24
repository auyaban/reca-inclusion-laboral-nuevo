import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PREWARM_PILOT_SLUGS,
  getFinalizationPrewarmRollout,
  isFinalizationPrewarmEnabled,
} from "@/lib/finalization/prewarmConfig";

describe("prewarm rollout config", () => {
  const originalEnabled = process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED;
  const originalPilot = process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS;

  afterEach(() => {
    if (originalEnabled === undefined) {
      delete process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED = originalEnabled;
    }

    if (originalPilot === undefined) {
      delete process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS;
    } else {
      process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS = originalPilot;
    }

    vi.restoreAllMocks();
  });

  it("keeps prewarm disabled when the env flag is absent", () => {
    delete process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED;
    delete process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS;

    const rollout = getFinalizationPrewarmRollout();

    expect(rollout.enabled).toBe(false);
    expect(rollout.pilotSlugs.size).toBe(0);
  });

  it("turns prewarm off globally when the env flag disables it", () => {
    process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED = "false";
    process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS = "evaluacion,seleccion";

    const rollout = getFinalizationPrewarmRollout();

    expect(rollout.enabled).toBe(false);
    expect(rollout.pilotSlugs.size).toBe(0);
    expect(isFinalizationPrewarmEnabled("evaluacion")).toBe(false);
  });

  it("limits rollout to the configured pilot slugs", () => {
    process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED = "true";
    process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS =
      "evaluacion, interprete-lsc, desconocido";

    const rollout = getFinalizationPrewarmRollout();

    expect(rollout.enabled).toBe(true);
    expect(Array.from(rollout.pilotSlugs)).toEqual([
      "evaluacion",
      "interprete-lsc",
    ]);
    expect(isFinalizationPrewarmEnabled("evaluacion")).toBe(true);
    expect(isFinalizationPrewarmEnabled("presentacion")).toBe(false);
    expect(isFinalizationPrewarmEnabled("interprete-lsc")).toBe(true);
  });

  it("uses the default pilot slugs only when the explicit opt-in flag is enabled", () => {
    process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED = "true";
    delete process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS;

    const rollout = getFinalizationPrewarmRollout();

    expect(rollout.enabled).toBe(true);
    expect(rollout.pilotSlugs).toEqual(DEFAULT_PREWARM_PILOT_SLUGS);
    expect(rollout.pilotSlugs.has("interprete-lsc")).toBe(false);
  });

  it("warns and leaves rollout empty when the configured pilot slugs are invalid", () => {
    process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED = "true";
    process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS = "desconocido,otro";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const rollout = getFinalizationPrewarmRollout();

    expect(rollout.enabled).toBe(true);
    expect(rollout.pilotSlugs.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      "[prewarm.rollout] configured pilot slugs produced an empty rollout",
      expect.objectContaining({
        rawPilotSlugs: "desconocido,otro",
      })
    );
  });
});
