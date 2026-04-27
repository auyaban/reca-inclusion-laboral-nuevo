"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FileClock } from "lucide-react";
import { useDraftsHub } from "@/hooks/useDraftsHub";
import { sendProductAnalyticsEvent } from "@/lib/analytics/productAnalytics";
import type { DraftSummary } from "@/lib/drafts";
import { cn } from "@/lib/utils";

type HubDraftsControlsProps = {
  initialPanelOpen: boolean;
  initialRemoteDrafts: DraftSummary[];
};

const DraftsHub = dynamic(() => import("@/components/layout/DraftsHub"));

export default function HubDraftsControls({
  initialPanelOpen,
  initialRemoteDrafts,
}: HubDraftsControlsProps) {
  const router = useRouter();
  const {
    hubDrafts,
    draftsCount,
    loading: draftsLoading,
    deleteHubDraft,
  } = useDraftsHub({
    initialRemoteDrafts,
    initialRemoteReady: true,
  });
  const [draftsPanelOpen, setDraftsPanelOpen] = useState(initialPanelOpen);
  const [draftsHubMounted, setDraftsHubMounted] = useState(initialPanelOpen);

  useEffect(() => {
    document.title = draftsPanelOpen ? "Hub | Borradores" : "Hub";
  }, [draftsPanelOpen]);

  useEffect(() => {
    if (draftsPanelOpen) {
      setDraftsHubMounted(true);
    }
  }, [draftsPanelOpen]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setDraftsPanelOpen(params.get("panel") === "drafts");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function syncDraftsPanel(open: boolean) {
    setDraftsPanelOpen(open);
    if (open && !draftsPanelOpen) {
      sendProductAnalyticsEvent({
        event: "drafts_panel_opened",
        properties: {
          source: "hub",
          draft_count: draftsCount,
        },
      });
    }
    router.replace(open ? "/hub?panel=drafts" : "/hub", { scroll: false });
  }

  return (
    <>
      <button
        type="button"
        data-testid="hub-drafts-button"
        onClick={() => syncDraftsPanel(!draftsPanelOpen)}
        className={cn(
          "inline-flex min-w-[8.5rem] items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-white transition-colors",
          draftsPanelOpen
            ? "border-white/20 bg-white/20"
            : "border-white/15 bg-white/10 hover:bg-white/20"
        )}
      >
        <FileClock className="h-4 w-4" />
        Borradores ({draftsCount})
      </button>

      {draftsHubMounted ? (
        <DraftsHub
          open={draftsPanelOpen}
          drafts={hubDrafts}
          loading={draftsLoading}
          onDelete={deleteHubDraft}
          onClose={() => syncDraftsPanel(false)}
        />
      ) : null}
    </>
  );
}
