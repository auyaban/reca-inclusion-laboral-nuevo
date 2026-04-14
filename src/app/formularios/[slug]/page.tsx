import PresentacionForm from "@/components/forms/PresentacionForm";
import SensibilizacionForm from "@/components/forms/SensibilizacionForm";
import Section1Form from "@/components/forms/Section1Form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function FormularioPage({ params }: Props) {
  const { slug } = await params;

  if (slug === "presentacion") {
    return <PresentacionForm />;
  }

  if (slug === "sensibilizacion") {
    return <SensibilizacionForm />;
  }

  return <Section1Form slug={slug} />;
}
