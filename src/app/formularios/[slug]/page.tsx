import CondicionesVacanteForm from "@/components/forms/CondicionesVacanteForm";
import PresentacionForm from "@/components/forms/PresentacionForm";
import SensibilizacionForm from "@/components/forms/SensibilizacionForm";
import Section1Form from "@/components/forms/Section1Form";
import { isLongFormSlug, type LongFormSlug } from "@/lib/forms";

const LONG_FORM_COMPONENTS = {
  presentacion: PresentacionForm,
  "condiciones-vacante": CondicionesVacanteForm,
  sensibilizacion: SensibilizacionForm,
} satisfies Record<LongFormSlug, typeof PresentacionForm>;

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function FormularioPage({ params }: Props) {
  const { slug } = await params;

  if (isLongFormSlug(slug)) {
    const FormComponent = LONG_FORM_COMPONENTS[slug];
    return <FormComponent />;
  }

  return <Section1Form slug={slug} />;
}
