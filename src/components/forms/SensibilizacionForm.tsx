"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
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
import { useEmpresaStore } from "@/lib/store/empresaStore";

const SensibilizacionFormEditor = dynamic(
  () => import("@/components/forms/SensibilizacionFormEditor"),
  {
    loading: () => (
      <LongFormLoadingState
        title="Abriendo formulario"
        description="Estamos cargando el editor completo de sensibilizacion."
      />
    ),
  }
);

type SensibilizacionFormProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function SensibilizacionForm({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: SensibilizacionFormProps) {
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const draftParam = searchParams?.get("draft") ?? null;
  const sessionParam = searchParams?.get("session") ?? null;

  if (
    shouldRenderLongFormCompanyGate({
      empresa,
      draftId: draftParam,
      sessionId: sessionParam,
    })
  ) {
    return (
      <LongFormCompanyGate
        title="Sensibilizacion"
        description={DEFAULT_LONG_FORM_COMPANY_GATE_DESCRIPTION}
        onSelectEmpresa={setEmpresa}
      />
    );
  }

  return (
    <SensibilizacionFormEditor
      initialDraftResolution={initialDraftResolution}
    />
  );
}
