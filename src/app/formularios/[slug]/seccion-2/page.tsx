import { redirect } from "next/navigation";
import SensibilizacionForm from "@/components/forms/SensibilizacionForm";
import { buildFormEditorUrl } from "@/lib/forms";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const FORM_MAP: Record<string, React.ComponentType> = {
  sensibilizacion: SensibilizacionForm,
};

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Seccion2Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  if (slug === "presentacion") {
    redirect(
      buildFormEditorUrl("presentacion", {
        draftId: getFirstValue(query.draft) ?? null,
        sessionId: getFirstValue(query.session) ?? null,
        isNewDraft: getFirstValue(query.new) === "1",
      })
    );
  }

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
