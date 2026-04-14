import { redirect } from "next/navigation";
import { buildFormEditorUrl } from "@/lib/forms";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Seccion2Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  if (slug === "presentacion" || slug === "sensibilizacion") {
    redirect(
      buildFormEditorUrl(slug, {
        draftId: getFirstValue(query.draft) ?? null,
        sessionId: getFirstValue(query.session) ?? null,
        isNewDraft: getFirstValue(query.new) === "1",
      })
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="font-medium text-gray-500">
          Formulario <span className="font-bold">{slug}</span> en construcción.
        </p>
        <a
          href="/hub"
          className="mt-4 inline-block text-sm font-semibold text-reca hover:underline"
        >
          Volver al menú
        </a>
      </div>
    </div>
  );
}
