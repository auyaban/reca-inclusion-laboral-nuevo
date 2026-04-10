"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DraftsList } from "@/components/drafts/DraftViews";
import { useFormDraft, type DraftMeta } from "@/hooks/useFormDraft";
import { useEmpresaStore } from "@/lib/store/empresaStore";

export default function DraftsHub() {
  const router = useRouter();
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const {
    allDrafts,
    loadingAllDrafts,
    loadDraft,
    deleteDraft,
  } = useFormDraft({
    loadMatchingDrafts: false,
    loadAllDrafts: true,
  });

  async function handleOpen(draft: DraftMeta) {
    const result = await loadDraft(draft.id);
    if (!result.draft || !result.empresa) {
      return;
    }

    setEmpresa(result.empresa);
    router.push(`/formularios/${draft.form_slug}/seccion-2?draft=${draft.id}`);
  }

  async function handleDelete(draft: DraftMeta) {
    setDeletingDraftId(draft.id);
    await deleteDraft(draft.id);
    setDeletingDraftId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <Link
            href="/hub"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-reca-200 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al menú
          </Link>
          <h1 className="text-lg font-bold text-white">Borradores guardados</h1>
          <p className="mt-0.5 text-sm text-reca-200">
            Reanuda una acta pendiente o elimina borradores que ya no necesitas.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <DraftsList
          drafts={allDrafts}
          loading={loadingAllDrafts}
          deletingDraftId={deletingDraftId}
          onOpen={handleOpen}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
