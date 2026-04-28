"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PresentacionPrewarmSetup } from "@/components/forms/presentacion/PresentacionPrewarmSetup";
import { LongFormCompanyGate } from "@/components/forms/shared/LongFormCompanyGate";
import { LongFormLoadingState } from "@/components/forms/shared/LongFormShell";
import {
  DEFAULT_LONG_FORM_COMPANY_GATE_DESCRIPTION,
  shouldRenderLongFormCompanyGate,
} from "@/components/forms/shared/longFormCompanyGateLogic";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import { isFinalizationPrewarmEnabled } from "@/lib/finalization/prewarmConfig";
import {
  normalizePresentacionPrewarmAttendeesEstimate,
  normalizePresentacionTipoVisita,
  type PresentacionInitialPrewarmSeed,
} from "@/lib/presentacion";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";

type PresentacionFormProps = {
  initialDraftResolution?: InitialDraftResolution;
};

const PREWARM_SETUP_STORAGE_PREFIX = "reca:presentacion-prewarm-setup:v1";

function getPrewarmSetupStorageKey(empresa: Empresa | null) {
  if (!empresa) {
    return null;
  }

  const empresaKey =
    empresa.id?.trim() ||
    empresa.nit_empresa?.trim() ||
    empresa.nombre_empresa?.trim();

  return empresaKey
    ? `${PREWARM_SETUP_STORAGE_PREFIX}:${encodeURIComponent(empresaKey)}`
    : null;
}

function readPrewarmSetupSeed(
  storageKey: string | null
): PresentacionInitialPrewarmSeed | null {
  if (!storageKey || typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PresentacionInitialPrewarmSeed>;
    const estimatedAttendees = normalizePresentacionPrewarmAttendeesEstimate(
      parsed.prewarm_asistentes_estimados
    );

    if (estimatedAttendees === null || estimatedAttendees > 80) {
      return null;
    }

    return {
      tipo_visita: normalizePresentacionTipoVisita(parsed.tipo_visita),
      prewarm_asistentes_estimados: estimatedAttendees,
    };
  } catch {
    return null;
  }
}

function persistPrewarmSetupSeed(
  storageKey: string | null,
  seed: PresentacionInitialPrewarmSeed
) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(seed));
  } catch {
    // La persistencia local del setup no es critica; el editor sigue funcionando.
  }
}

const PresentacionFormEditor = dynamic(
  () => import("@/components/forms/PresentacionFormEditor"),
  {
    loading: () => (
      <LongFormLoadingState
        title="Abriendo formulario"
        description="Estamos cargando el editor completo de presentación."
      />
    ),
  }
);

export default function PresentacionForm({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: PresentacionFormProps) {
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const draftParam = searchParams?.get("draft") ?? null;
  const sessionParam = searchParams?.get("session") ?? null;
  const explicitNewDraft = searchParams?.get("new") === "1";
  const prewarmSetupStorageKey = getPrewarmSetupStorageKey(empresa);
  const [initialPrewarmSeed, setInitialPrewarmSeed] =
    useState<PresentacionInitialPrewarmSeed | null>(() =>
      explicitNewDraft ? null : readPrewarmSetupSeed(prewarmSetupStorageKey)
    );
  const [checkedPrewarmSetupStorageKey, setCheckedPrewarmSetupStorageKey] =
    useState<string | null>(prewarmSetupStorageKey);
  const shouldOfferInitialPrewarmSetup =
    Boolean(empresa) &&
    !draftParam &&
    !sessionParam?.trim() &&
    initialDraftResolution.status === "none" &&
    isFinalizationPrewarmEnabled("presentacion");
  const effectiveInitialPrewarmSeed =
    checkedPrewarmSetupStorageKey === prewarmSetupStorageKey
      ? initialPrewarmSeed
      : null;

  useEffect(() => {
    if (!empresa || draftParam || explicitNewDraft) {
      setInitialPrewarmSeed(null);
      setCheckedPrewarmSetupStorageKey(prewarmSetupStorageKey);
      return;
    }

    const storedSeed = readPrewarmSetupSeed(prewarmSetupStorageKey);
    setInitialPrewarmSeed(storedSeed);
    setCheckedPrewarmSetupStorageKey(prewarmSetupStorageKey);
  }, [draftParam, empresa, explicitNewDraft, prewarmSetupStorageKey]);

  const handleInitialPrewarmContinue = useCallback(
    (seed: PresentacionInitialPrewarmSeed) => {
      persistPrewarmSetupSeed(prewarmSetupStorageKey, seed);
      setCheckedPrewarmSetupStorageKey(prewarmSetupStorageKey);
      setInitialPrewarmSeed(seed);
    },
    [prewarmSetupStorageKey]
  );

  if (
    shouldRenderLongFormCompanyGate({
      empresa,
      draftId: draftParam,
      sessionId: sessionParam,
    })
  ) {
    return (
      <LongFormCompanyGate
        title="Presentacion del Programa"
        description={DEFAULT_LONG_FORM_COMPANY_GATE_DESCRIPTION}
        onSelectEmpresa={setEmpresa}
      />
    );
  }

  if (empresa && shouldOfferInitialPrewarmSetup && !effectiveInitialPrewarmSeed) {
    if (checkedPrewarmSetupStorageKey !== prewarmSetupStorageKey) {
      return (
        <LongFormLoadingState
          title="Abriendo formulario"
          description="Estamos revisando si ya existe una preparacion inicial para esta visita."
        />
      );
    }

    return (
      <PresentacionPrewarmSetup
        empresa={empresa}
        onContinue={handleInitialPrewarmContinue}
      />
    );
  }

  return (
    <PresentacionFormEditor
      initialDraftResolution={initialDraftResolution}
      initialPrewarmSeed={effectiveInitialPrewarmSeed}
    />
  );
}
