import Section1Form from "@/components/forms/Section1Form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function FormularioPage({ params }: Props) {
  const { slug } = await params;
  return <Section1Form slug={slug} />;
}
