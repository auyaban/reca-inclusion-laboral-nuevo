"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DraftsList } from "@/components/drafts/DraftViews";
import { useFormDraft, type HubDraft } from "@/hooks/useFormDraft";
import { useEmpresaStore } from "@/lib/store/empresaStore";

export default function DraftsHub() {
  const router = useRouter();
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const {
    hubDrafts,
    loadingAllDrafts,
    loadDraft,
    deleteHubDraft,
  } = useFormDraft({
    loadMatchingDrafts: false,
    loadAllDrafts: true,
  });

  async function handleOpen(draft: HubDraft) {
    if (draft.empresa_snapshot) {
      setEmpresa(draft.empresa_snapshot);
    }

    if (draft.draftId) {
      if (!draft.empresa_snapshot) {
        const result = await loadDraft(draft.draftId);
        if (!result.draft || !result.empresa) {
          return;
        }

        setEmpresa(result.empresa);
      }

      router.push(`/formularios/${draft.form_slug}/seccion-2?draft=${draft.draftId}`);
      return;
    }

    if (!draft.sessionId || !draft.empresa_snapshot) {
      return;
    }

    router.push(`/formularios/${draft.form_slug}/seccion-2?session=${draft.sessionId}`);
  }

  async function handleDelete(draft: HubDraft) {
    setDeletingDraftId(draft.id);
    await deleteHubDraft(draft);
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
          drafts={hubDrafts}
          loading={loadingAllDrafts}
          deletingDraftId={deletingDraftId}
          onOpen={handleOpen}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
