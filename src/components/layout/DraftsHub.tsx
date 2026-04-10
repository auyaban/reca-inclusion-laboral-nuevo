"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelRightClose, X } from "lucide-react";
import { DraftsList } from "@/components/drafts/DraftViews";
import { DraftOpenConflictModal } from "@/components/drafts/DraftOpenConflictModal";
import { useDraftsHub } from "@/hooks/useDraftsHub";
import { openActaTab } from "@/lib/actaTabs";
import { getDraftLockStatus } from "@/lib/draftLocks";
import type { HubDraft } from "@/lib/drafts";
import { buildFormEditorUrl } from "@/lib/forms";

type DraftsDrawerProps = {
  open: boolean;
  onClose: () => void;
};

function getDraftUrl(draft: HubDraft) {
  if (draft.draftId) {
    return buildFormEditorUrl(draft.form_slug, {
      draftId: draft.draftId,
    });
  }

  if (draft.sessionId) {
    return buildFormEditorUrl(draft.form_slug, {
      sessionId: draft.sessionId,
    });
  }

  return null;
}

export default function DraftsDrawer({ open, onClose }: DraftsDrawerProps) {
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [pendingOpenDraft, setPendingOpenDraft] = useState<HubDraft | null>(null);
  const { hubDrafts, loading, deleteHubDraft } = useDraftsHub();

  const pendingOpenUrl = useMemo(
    () => (pendingOpenDraft ? getDraftUrl(pendingOpenDraft) : null),
    [pendingOpenDraft]
  );

  useEffect(() => {
    if (!open) {
      setPendingOpenDraft(null);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (pendingOpenDraft) {
        setPendingOpenDraft(null);
        return;
      }

      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, pendingOpenDraft]);

  if (!open) {
    return null;
  }

  function handleConfirmOpen() {
    if (!pendingOpenUrl) {
      setPendingOpenDraft(null);
      return;
    }

    openActaTab(pendingOpenUrl);
    setPendingOpenDraft(null);
  }

  function handleOpen(draft: HubDraft) {
    const nextUrl = getDraftUrl(draft);
    if (!nextUrl) {
      return;
    }

    if (draft.draftId) {
      const lockStatus = getDraftLockStatus(draft.draftId);
      if (lockStatus.isActive) {
        setPendingOpenDraft(draft);
        return;
      }
    }

    openActaTab(nextUrl);
  }

  async function handleDelete(draft: HubDraft) {
    setDeletingDraftId(draft.id);
    await deleteHubDraft(draft);
    setDeletingDraftId(null);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Borradores"
        className="fixed inset-y-0 right-0 z-50 flex w-full justify-end"
      >
        <div
          className="flex h-full w-full max-w-2xl flex-col border-l border-gray-200 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
            <div>
              <p className="text-lg font-bold text-gray-900">Borradores guardados</p>
              <p className="mt-1 text-sm text-gray-500">
                Reanuda una acta pendiente sin cerrar el hub principal.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <PanelRightClose className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar</span>
              <X className="h-4 w-4 sm:hidden" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <DraftsList
              drafts={hubDrafts}
              loading={loading}
              deletingDraftId={deletingDraftId}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </aside>

      <DraftOpenConflictModal
        draft={pendingOpenDraft}
        open={Boolean(pendingOpenDraft)}
        onCancel={() => setPendingOpenDraft(null)}
        onConfirm={handleConfirmOpen}
      />
    </>
  );
}
