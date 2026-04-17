"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  DraftLockConflict,
  EditingAuthorityState,
} from "@/hooks/formDraft/shared";
import {
  consumeDraftHubBootstrap,
  reportInvisibleDraftEvent,
} from "@/lib/drafts/invisibleDrafts";

type UseInvisibleDraftTelemetryParams = {
  formSlug: string;
  draftParam: string | null;
  activeDraftId: string | null;
  editingAuthorityState: EditingAuthorityState;
  lockConflict: DraftLockConflict | null;
  invisibleDraftPilotEnabled: boolean;
  showTakeoverPrompt: boolean;
};

export function useInvisibleDraftTelemetry({
  formSlug,
  draftParam,
  activeDraftId,
  editingAuthorityState,
  lockConflict,
  invisibleDraftPilotEnabled,
  showTakeoverPrompt,
}: UseInvisibleDraftTelemetryParams) {
  const draftBootstrapTelemetryRef = useRef<string | null>(null);
  const draftConflictTelemetryRef = useRef<string | null>(null);
  const draftTakeoverPromptTelemetryRef = useRef<string | null>(null);
  const previousEditingAuthorityStateRef =
    useRef<EditingAuthorityState | null>(null);

  const routeSource = draftParam ? "draft" : "session";

  const reportInvisibleDraftSuppression = useCallback(
    (reason: string, source: "session" | "draft" | "hub" = "session") => {
      if (!invisibleDraftPilotEnabled) {
        return;
      }

      reportInvisibleDraftEvent("draft_visible_promotion_suppressed", {
        formSlug,
        source,
        activeDraftIdPresent: Boolean(activeDraftId),
        lockState: editingAuthorityState,
        reason,
      });
    },
    [
      activeDraftId,
      editingAuthorityState,
      formSlug,
      invisibleDraftPilotEnabled,
    ]
  );

  useEffect(() => {
    if (!invisibleDraftPilotEnabled || !draftParam) {
      return;
    }

    const telemetryKey = `draft:${draftParam}`;
    if (draftBootstrapTelemetryRef.current === telemetryKey) {
      return;
    }

    const source = consumeDraftHubBootstrap(draftParam) ? "hub" : "draft";
    reportInvisibleDraftEvent(
      source === "hub" ? "draft_hub_bootstrap" : "draft_bootstrap_from_query",
      {
        formSlug,
        source,
        activeDraftIdPresent: Boolean(activeDraftId),
        lockState: editingAuthorityState,
      }
    );
    draftBootstrapTelemetryRef.current = telemetryKey;
  }, [
    activeDraftId,
    draftParam,
    editingAuthorityState,
    formSlug,
    invisibleDraftPilotEnabled,
  ]);

  useEffect(() => {
    if (
      !invisibleDraftPilotEnabled ||
      !activeDraftId ||
      !lockConflict ||
      editingAuthorityState !== "read_only"
    ) {
      return;
    }

    const telemetryKey = `${activeDraftId}:${lockConflict.ownerSeenAt}`;
    if (draftConflictTelemetryRef.current === telemetryKey) {
      return;
    }

    reportInvisibleDraftEvent("draft_conflict_detected", {
      formSlug,
      source: routeSource,
      activeDraftIdPresent: true,
      lockState: editingAuthorityState,
    });
    draftConflictTelemetryRef.current = telemetryKey;
  }, [
    activeDraftId,
    editingAuthorityState,
    formSlug,
    invisibleDraftPilotEnabled,
    lockConflict,
    routeSource,
  ]);

  useEffect(() => {
    if (
      !invisibleDraftPilotEnabled ||
      !activeDraftId ||
      !lockConflict ||
      !showTakeoverPrompt
    ) {
      return;
    }

    const telemetryKey = `${activeDraftId}:${lockConflict.ownerSeenAt}`;
    if (draftTakeoverPromptTelemetryRef.current === telemetryKey) {
      return;
    }

    reportInvisibleDraftEvent("draft_takeover_prompt_shown", {
      formSlug,
      source: routeSource,
      activeDraftIdPresent: true,
      lockState: editingAuthorityState,
    });
    draftTakeoverPromptTelemetryRef.current = telemetryKey;
  }, [
    activeDraftId,
    editingAuthorityState,
    formSlug,
    invisibleDraftPilotEnabled,
    lockConflict,
    routeSource,
    showTakeoverPrompt,
  ]);

  useEffect(() => {
    const previousState = previousEditingAuthorityStateRef.current;

    if (
      invisibleDraftPilotEnabled &&
      activeDraftId &&
      previousState === "read_only" &&
      editingAuthorityState === "editor"
    ) {
      reportInvisibleDraftEvent("draft_takeover_confirmed", {
        formSlug,
        source: routeSource,
        activeDraftIdPresent: true,
        lockState: editingAuthorityState,
      });
    }

    previousEditingAuthorityStateRef.current = editingAuthorityState;
  }, [
    activeDraftId,
    editingAuthorityState,
    formSlug,
    invisibleDraftPilotEnabled,
    routeSource,
  ]);

  return {
    reportInvisibleDraftSuppression,
  };
}
