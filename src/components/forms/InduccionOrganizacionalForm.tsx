"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { LongFormCompanyGate } from "@/components/forms/shared/LongFormCompanyGate";
import { LongFormLoadingState } from "@/components/forms/shared/LongFormShell";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import { useEmpresaStore } from "@/lib/store/empresaStore";

const InduccionOrganizacionalFormEditor = dynamic(
  () => import("@/components/forms/InduccionOrganizacionalFormEditor"),
  {
    loading: () => (
      <LongFormLoadingState
        title="Abriendo formulario"
        description="Estamos cargando el editor completo de induccion organizacional."
      />
    ),
  }
);

type InduccionOrganizacionalFormProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function InduccionOrganizacionalForm({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: InduccionOrganizacionalFormProps) {
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const draftParam = searchParams?.get("draft") ?? null;
  const sessionParam = searchParams?.get("session") ?? null;

  if (!empresa && !draftParam && !sessionParam) {
    return (
      <LongFormCompanyGate
        title="Induccion Organizacional"
        description="Selecciona primero la empresa para abrir el documento largo. Este gate evita montar el formulario completo antes de tiempo y acelera la busqueda inicial."
        onSelectEmpresa={setEmpresa}
      />
    );
  }

  return (
    <InduccionOrganizacionalFormEditor
      initialDraftResolution={initialDraftResolution}
    />
  );
}
