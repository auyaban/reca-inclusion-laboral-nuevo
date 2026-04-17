"use client";

import * as Sentry from "@sentry/nextjs";
import { findPersistedDraftIdForSession } from "@/lib/drafts";
import { isInvisibleDraftPilotEnabled } from "@/lib/drafts/invisibleDraftConfig";
import type { EditingAuthorityState } from "@/hooks/formDraft/shared";

export {
  INVISIBLE_DRAFT_PILOT_SLUGS,
  isInvisibleDraftPilotEnabled,
} from "@/lib/drafts/invisibleDraftConfig";
const DRAFT_HUB_BOOTSTRAP_MARKER_PREFIX = "reca:draft-hub-bootstrap:";
const DRAFT_HUB_BOOTSTRAP_MARKER_TTL_MS = 60_000;

export type InvisibleDraftEventKind =
  | "draft_visible_promotion_suppressed"
  | "draft_bootstrap_from_query"
  | "draft_hub_bootstrap"
  | "draft_takeover_prompt_shown"
  | "draft_takeover_confirmed"
  | "draft_conflict_detected";

export type InvisibleDraftTelemetry = {
  formSlug: string;
  source?: "session" | "draft" | "hub";
  activeDraftIdPresent?: boolean;
  lockState?: EditingAuthorityState;
  reason?: string;
};

function getLocalStorageHandle() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getHubBootstrapMarkerKey(draftId: string) {
  return `${DRAFT_HUB_BOOTSTRAP_MARKER_PREFIX}${draftId}`;
}

function sanitizeTelemetry(telemetry: InvisibleDraftTelemetry) {
  return Object.fromEntries(
    Object.entries({
      domain: "drafts",
      invisible_draft_event: true,
      form_slug: telemetry.formSlug,
      source: telemetry.source,
      active_draft_id_present: telemetry.activeDraftIdPresent,
      lock_state: telemetry.lockState,
      reason: telemetry.reason,
    }).filter(([, value]) =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    )
  );
}

export function resolveInvisibleDraftBootstrapId(params: {
  formSlug: string;
  draftParam: string | null;
  sessionParam: string | null;
}) {
  if (!isInvisibleDraftPilotEnabled(params.formSlug)) {
    return params.draftParam;
  }

  if (params.draftParam) {
    return params.draftParam;
  }

  const trimmedSessionId = params.sessionParam?.trim();
  if (!trimmedSessionId || typeof window === "undefined") {
    return null;
  }

  return findPersistedDraftIdForSession(params.formSlug, trimmedSessionId);
}

export function markDraftHubBootstrap(draftId: string) {
  if (!draftId) {
    return;
  }

  const storage = getLocalStorageHandle();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      getHubBootstrapMarkerKey(draftId),
      JSON.stringify({
        draftId,
        createdAt: Date.now(),
      })
    );
  } catch {
    // Best effort only.
  }
}

export function consumeDraftHubBootstrap(draftId: string) {
  if (!draftId) {
    return false;
  }

  const storage = getLocalStorageHandle();
  if (!storage) {
    return false;
  }

  const markerKey = getHubBootstrapMarkerKey(draftId);
  let rawValue: string | null = null;

  try {
    rawValue = storage.getItem(markerKey);
  } catch {
    return false;
  }

  if (!rawValue) {
    return false;
  }

  try {
    storage.removeItem(markerKey);
  } catch {
    // Ignore cleanup failures and keep evaluating the marker payload.
  }

  try {
    const payload = JSON.parse(rawValue) as {
      draftId?: string;
      createdAt?: number;
    };

    if (
      payload.draftId !== draftId ||
      typeof payload.createdAt !== "number" ||
      !Number.isFinite(payload.createdAt)
    ) {
      return false;
    }

    return Date.now() - payload.createdAt <= DRAFT_HUB_BOOTSTRAP_MARKER_TTL_MS;
  } catch {
    return false;
  }
}

export function reportInvisibleDraftEvent(
  kind: InvisibleDraftEventKind,
  telemetry: InvisibleDraftTelemetry
) {
  const attributes = sanitizeTelemetry(telemetry);

  if (process.env.NODE_ENV !== "production") {
    console.debug(`[drafts] ${kind}`, attributes);
  }

  Sentry.logger.info(`[drafts] ${kind}`, {
    invisible_draft_event: kind,
    ...attributes,
  });

  Sentry.addBreadcrumb({
    category: "drafts",
    level: "info",
    message: `[drafts] ${kind}`,
    data: attributes,
  });
}
