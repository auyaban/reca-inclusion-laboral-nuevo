"use client";

import { useSearchParams } from "next/navigation";
import InterpreteLscFormEditor from "@/components/forms/InterpreteLscFormEditor";
import { LongFormCompanyGate } from "@/components/forms/shared/LongFormCompanyGate";
import { shouldRenderLongFormCompanyGate } from "@/components/forms/shared/longFormCompanyGateLogic";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import { useEmpresaStore } from "@/lib/store/empresaStore";

type InterpreteLscFormProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function InterpreteLscForm({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: InterpreteLscFormProps) {
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
        title="Interprete LSC"
        description="Selecciona la empresa para abrir el servicio de interpretacion LSC, registrar participantes, horas del equipo interprete y asistentes del acta."
        onSelectEmpresa={setEmpresa}
      />
    );
  }

  return (
    <InterpreteLscFormEditor
      initialDraftResolution={initialDraftResolution}
    />
  );
}
