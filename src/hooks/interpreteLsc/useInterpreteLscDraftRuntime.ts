"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLongFormDraftController } from "@/hooks/useLongFormDraftController";
import {
  normalizeInvisibleDraftRouteParams,
  setDraftAlias,
} from "@/lib/drafts";
import { isInvisibleDraftPilotEnabled } from "@/lib/drafts/invisibleDraftConfig";
import { resolveInvisibleDraftBootstrapId } from "@/lib/drafts/invisibleDrafts";
import type { InitialDraftResolution } from "@/lib/drafts/initialDraftResolution";
import type { Empresa } from "@/lib/store/empresaStore";

export function useInterpreteLscDraftRuntime(options: {
  empresa: Empresa | null;
  initialDraftResolution: InitialDraftResolution;
}) {
  const { empresa } = options;
  const searchParams = useSearchParams();
  const rawDraftParam = searchParams.get("draft");
  const rawSessionParam = searchParams.get("session");
  const explicitNewDraft = searchParams.get("new") === "1";
  const { draftParam, sessionParam } = useMemo(
    () =>
      normalizeInvisibleDraftRouteParams({
        draftParam: rawDraftParam,
        sessionParam: rawSessionParam,
      }),
    [rawDraftParam, rawSessionParam]
  );
  const invisibleDraftPilotEnabled = isInvisibleDraftPilotEnabled("interprete-lsc");
  const bootstrapDraftId = useMemo(
    () =>
      resolveInvisibleDraftBootstrapId({
        formSlug: "interprete-lsc",
        draftParam,
        sessionParam,
      }),
    [draftParam, sessionParam]
  );

  const draftController = useLongFormDraftController({
    slug: "interprete-lsc",
    empresa,
    initialDraftId: bootstrapDraftId,
    initialLocalDraftSessionId: sessionParam,
    initialRestoring: Boolean(bootstrapDraftId || sessionParam?.trim()),
  });

  return {
    ...draftController,
    draftParam,
    sessionParam,
    explicitNewDraft,
    invisibleDraftPilotEnabled,
    bootstrapDraftId,
    setDraftAlias,
  };
}
