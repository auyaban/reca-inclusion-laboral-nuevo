"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelRightClose, X } from "lucide-react";
import { DraftsList } from "@/components/drafts/DraftViews";
import { DraftOpenConflictModal } from "@/components/drafts/DraftOpenConflictModal";
import { openActaTab } from "@/lib/actaTabs";
import {
  getNavigableInvisibleSessionId,
  isInvisibleDraftPilotEnabled,
  markDraftHubBootstrap,
} from "@/lib/drafts/invisibleDrafts";
import { getDraftLockStatus } from "@/lib/draftLocks";
import type { HubDraft } from "@/lib/drafts";
import { buildFormEditorUrl } from "@/lib/forms";

type DraftsHubProps = {
  open: boolean;
  drafts: HubDraft[];
  loading?: boolean;
  onDelete: (draft: HubDraft) => Promise<void> | void;
  onClose: () => void;
};

function getDraftUrl(draft: HubDraft) {
  const navigableSessionId = getNavigableInvisibleSessionId(draft.sessionId);

  if (
    navigableSessionId &&
    isInvisibleDraftPilotEnabled(draft.form_slug)
  ) {
    return buildFormEditorUrl(draft.form_slug, {
      sessionId: navigableSessionId,
    });
  }

  if (draft.draftId) {
    return buildFormEditorUrl(draft.form_slug, {
      draftId: draft.draftId,
    });
  }

  if (navigableSessionId) {
    return buildFormEditorUrl(draft.form_slug, {
      sessionId: navigableSessionId,
    });
  }

  return null;
}

export default function DraftsHub({
  open,
  drafts,
  loading = false,
  onDelete,
  onClose,
}: DraftsHubProps) {
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [pendingOpenDraft, setPendingOpenDraft] = useState<HubDraft | null>(null);

  const pendingOpenUrl = useMemo(
    () => (pendingOpenDraft ? getDraftUrl(pendingOpenDraft) : null),
    [pendingOpenDraft]
  );

  useEffect(() => {
    if (!open) {
      setPendingOpenDraft(null);
      setDeleteNotice(null);
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

  function markDraftBootstrapSource(draft: HubDraft) {
    if (
      !draft.draftId ||
      !isInvisibleDraftPilotEnabled(draft.form_slug)
    ) {
      return;
    }

    markDraftHubBootstrap(draft.draftId);
  }

  function handleConfirmOpen() {
    if (!pendingOpenUrl || !pendingOpenDraft) {
      setPendingOpenDraft(null);
      return;
    }

    markDraftBootstrapSource(pendingOpenDraft);
    const didOpen = openActaTab(pendingOpenUrl);
    if (!didOpen) {
      return;
    }

    setPendingOpenDraft(null);
    onClose();
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

    markDraftBootstrapSource(draft);
    const didOpen = openActaTab(nextUrl);
    if (!didOpen) {
      return;
    }

    onClose();
  }

  async function handleDelete(draft: HubDraft) {
    setDeletingDraftId(draft.id);
    setDeleteNotice(null);
    try {
      await onDelete(draft);
    } catch {
      setDeleteNotice("No pudimos eliminar el borrador. Intenta de nuevo.");
    } finally {
      setDeletingDraftId(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <aside
        data-testid="drafts-drawer"
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
              data-testid="drafts-drawer-close"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <PanelRightClose className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar</span>
              <X className="h-4 w-4 sm:hidden" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {deleteNotice ? (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
              >
                {deleteNotice}
              </div>
            ) : null}
            <DraftsList
              drafts={drafts}
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
