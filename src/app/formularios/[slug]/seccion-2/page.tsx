import PresentacionForm from "@/components/forms/PresentacionForm";

interface Props {
  params: Promise<{ slug: string }>;
}

const FORM_MAP: Record<string, React.ComponentType> = {
  presentacion: PresentacionForm,
};

export default async function Seccion2Page({ params }: Props) {
  const { slug } = await params;
  const FormComponent = FORM_MAP[slug];

  if (!FormComponent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-medium">
            Formulario <span className="font-bold">{slug}</span> en construcción.
          </p>
          <a href="/hub" className="mt-4 inline-block text-reca text-sm font-semibold hover:underline">
            Volver al menú
          </a>
        </div>
      </div>
    );
  }

  return <FormComponent />;
}
