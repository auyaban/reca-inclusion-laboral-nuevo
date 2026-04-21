import dynamic from "next/dynamic";
import type { InitialDraftResolution } from "@/lib/drafts/initialDraftResolution";
import { NO_INITIAL_DRAFT_RESOLUTION } from "@/lib/drafts/initialDraftResolution";
import { resolveInitialDraftResolution } from "@/lib/drafts/serverDraftResolution";
import { isLongFormSlug, type LongFormSlug } from "@/lib/forms";
import Section1Form from "@/components/forms/Section1Form";
import { LongFormLoadingState } from "@/components/forms/shared/LongFormShell";

type LongFormEntryProps = {
  initialDraftResolution?: InitialDraftResolution;
};

const longFormFallback = () => (
  <LongFormLoadingState
    title="Abriendo formulario"
    description="Estamos cargando el editor completo del formulario."
  />
);

const PresentacionForm = dynamic<LongFormEntryProps>(
  () => import("@/components/forms/PresentacionForm"),
  {
    loading: longFormFallback,
  }
);
const EvaluacionForm = dynamic<LongFormEntryProps>(
  () => import("@/components/forms/EvaluacionForm"),
  {
    loading: longFormFallback,
  }
);
const CondicionesVacanteForm = dynamic<LongFormEntryProps>(
  () => import("@/components/forms/CondicionesVacanteForm"),
  {
    loading: longFormFallback,
  }
);
const SeleccionForm = dynamic<LongFormEntryProps>(
  () => import("@/components/forms/SeleccionForm"),
  {
    loading: longFormFallback,
  }
);
const ContratacionForm = dynamic<LongFormEntryProps>(
  () => import("@/components/forms/ContratacionForm"),
  {
    loading: longFormFallback,
  }
);
const InduccionOrganizacionalForm = dynamic<LongFormEntryProps>(
  () => import("@/components/forms/InduccionOrganizacionalForm"),
  {
    loading: longFormFallback,
  }
);
const InduccionOperativaForm = dynamic<LongFormEntryProps>(
  () => import("@/components/forms/InduccionOperativaForm"),
  {
    loading: longFormFallback,
  }
);
const SensibilizacionForm = dynamic<LongFormEntryProps>(
  () => import("@/components/forms/SensibilizacionForm"),
  {
    loading: longFormFallback,
  }
);

const LONG_FORM_COMPONENTS = {
  presentacion: PresentacionForm,
  evaluacion: EvaluacionForm,
  "condiciones-vacante": CondicionesVacanteForm,
  seleccion: SeleccionForm,
  contratacion: ContratacionForm,
  "induccion-organizacional": InduccionOrganizacionalForm,
  "induccion-operativa": InduccionOperativaForm,
  sensibilizacion: SensibilizacionForm,
} satisfies Record<LongFormSlug, typeof PresentacionForm>;

function getSingleSearchParam(
  value: string | string[] | undefined
): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return typeof value[0] === "string" ? value[0] : null;
  }

  return null;
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FormularioPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (isLongFormSlug(slug)) {
    const FormComponent = LONG_FORM_COMPONENTS[slug];
    const draftId = getSingleSearchParam(resolvedSearchParams?.draft)?.trim() || null;
    const initialDraftResolution = draftId
      ? await resolveInitialDraftResolution({
          draftId,
          expectedSlug: slug,
        })
      : NO_INITIAL_DRAFT_RESOLUTION;

    return <FormComponent initialDraftResolution={initialDraftResolution} />;
  }

  return <Section1Form slug={slug} />;
}
