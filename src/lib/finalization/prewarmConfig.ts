import {
  isFinalizationFormSlug,
  type FinalizationFormSlug,
} from "@/lib/finalization/formSlugs";

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

export const PREWARM_VALIDATION_TTL_MS = 10 * 60 * 1000;

export const PREWARM_TEMPLATE_REVISIONS = {
  presentacion: "phase6-2026-04-28-v1",
  sensibilizacion: "phase6-2026-04-28-v1",
  "condiciones-vacante": "phase6-2026-04-28-v1",
  seleccion: "phase6-2026-04-28-v1",
  contratacion: "phase6-2026-04-28-v1",
  evaluacion: "phase6-2026-04-28-v1",
  "interprete-lsc": "phase6-2026-04-28-v1",
  "induccion-organizacional": "phase6-2026-04-28-v1",
  "induccion-operativa": "phase6-2026-04-28-v1",
} as const satisfies Record<FinalizationFormSlug, string>;

type PrewarmEnv = {
  NEXT_PUBLIC_RECA_PREWARM_ENABLED?: string;
  NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS?: string;
};

function getPublicPrewarmEnv(): PrewarmEnv {
  return {
    NEXT_PUBLIC_RECA_PREWARM_ENABLED:
      process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED,
    NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS:
      process.env.NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS,
  };
}

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

    if (isFinalizationFormSlug(normalized)) {
      next.add(normalized);
    }
  }

  return next;
}

export function getFinalizationPrewarmRollout(
  env: PrewarmEnv = getPublicPrewarmEnv()
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
