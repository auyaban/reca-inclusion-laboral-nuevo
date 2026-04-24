"use client";

import { useSearchParams } from "next/navigation";
import PresentacionFormEditor from "@/components/forms/PresentacionFormEditor";
import { LongFormCompanyGate } from "@/components/forms/shared/LongFormCompanyGate";
import {
  DEFAULT_LONG_FORM_COMPANY_GATE_DESCRIPTION,
  shouldRenderLongFormCompanyGate,
} from "@/components/forms/shared/longFormCompanyGateLogic";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import { useEmpresaStore } from "@/lib/store/empresaStore";

type PresentacionFormProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function PresentacionForm({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: PresentacionFormProps) {
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
        title="Presentacion del Programa"
        description={DEFAULT_LONG_FORM_COMPANY_GATE_DESCRIPTION}
        onSelectEmpresa={setEmpresa}
      />
    );
  }

  return (
    <PresentacionFormEditor initialDraftResolution={initialDraftResolution} />
  );
}
