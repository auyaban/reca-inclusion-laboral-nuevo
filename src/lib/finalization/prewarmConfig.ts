import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";

export const DEFAULT_PREWARM_PILOT_SLUGS = new Set<FinalizationFormSlug>([
  "presentacion",
  "sensibilizacion",
  "condiciones-vacante",
  "seleccion",
  "contratacion",
  "evaluacion",
  "induccion-organizacional",
  "induccion-operativa",
]);

type PrewarmEnv = {
  NEXT_PUBLIC_RECA_PREWARM_ENABLED?: string;
  NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS?: string;
};

function parsePrewarmEnabledFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["0", "false", "off", "no"].includes(normalized)) {
    return false;
  }

  if (["1", "true", "on", "yes"].includes(normalized)) {
    return true;
  }

  return null;
}

function parsePilotSlugs(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  const next = new Set<FinalizationFormSlug>();
  for (const slug of raw.split(",")) {
    const normalized = slug.trim();
    if (!normalized) {
      continue;
    }

    if (DEFAULT_PREWARM_PILOT_SLUGS.has(normalized as FinalizationFormSlug)) {
      next.add(normalized as FinalizationFormSlug);
    }
  }

  return next;
}

export function getFinalizationPrewarmRollout(
  env: PrewarmEnv = process.env as PrewarmEnv
) {
  const enabledFlag = parsePrewarmEnabledFlag(env.NEXT_PUBLIC_RECA_PREWARM_ENABLED);
  if (enabledFlag !== true) {
    return {
      enabled: false,
      pilotSlugs: new Set<FinalizationFormSlug>(),
    };
  }

  const parsedPilotSlugs = parsePilotSlugs(env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS);
  if (
    env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS?.trim() &&
    parsedPilotSlugs?.size === 0
  ) {
    console.warn("[prewarm.rollout] configured pilot slugs produced an empty rollout", {
      rawPilotSlugs: env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS,
    });
  }

  return {
    enabled: true,
    pilotSlugs: parsedPilotSlugs ?? new Set(DEFAULT_PREWARM_PILOT_SLUGS),
  };
}

export function isFinalizationPrewarmEnabled(formSlug: string) {
  const rollout = getFinalizationPrewarmRollout();
  return (
    rollout.enabled &&
    rollout.pilotSlugs.has(formSlug as FinalizationFormSlug)
  );
}
