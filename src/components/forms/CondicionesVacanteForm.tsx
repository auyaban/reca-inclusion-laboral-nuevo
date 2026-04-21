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

const CondicionesVacanteFormEditor = dynamic(
  () => import("@/components/forms/CondicionesVacanteFormEditor"),
  {
    loading: () => (
      <LongFormLoadingState
        title="Abriendo formulario"
        description="Estamos cargando el editor completo de condiciones de la vacante."
      />
    ),
  }
);

type CondicionesVacanteFormProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function CondicionesVacanteForm({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: CondicionesVacanteFormProps) {
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
        title="Condiciones de la Vacante"
        description={DEFAULT_LONG_FORM_COMPANY_GATE_DESCRIPTION}
        onSelectEmpresa={setEmpresa}
      />
    );
  }

  return (
    <CondicionesVacanteFormEditor
      initialDraftResolution={initialDraftResolution}
    />
  );
}
