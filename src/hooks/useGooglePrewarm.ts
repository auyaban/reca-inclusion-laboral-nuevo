"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  buildDraftSpreadsheetProvisionalName,
} from "@/lib/finalization/documentNaming";
import { isFinalizationPrewarmEnabled } from "@/lib/finalization/prewarmConfig";
import {
  buildPrewarmHintForForm,
} from "@/lib/finalization/prewarmRegistry";
import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";

type EnsureDraftIdentity = (
  step: number,
  data: Record<string, unknown>
) => Promise<{ ok: boolean; draftId?: string }>;

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function useGooglePrewarm(options: {
  formSlug: FinalizationFormSlug;
  empresa: Empresa | null;
  formData: unknown;
  step: number;
  draftId: string | null;
  localDraftSessionId: string;
  ensureDraftIdentity: EnsureDraftIdentity;
  disabled?: boolean;
}) {
  const {
    disabled = false,
    draftId,
    empresa,
    ensureDraftIdentity,
    formData,
    formSlug,
    localDraftSessionId,
    step,
  } = options;
  const lastObservedKeyRef = useRef<string | null>(null);
  const lastSentKeyRef = useRef<string | null>(null);
  const blockedUntilByRequestKeyRef = useRef<Record<string, number>>({});
  const failureStateByRequestKeyRef = useRef<
    Record<string, { failureCount: number; blockedUntil: number }>
  >({});
  const draftRecord = useMemo(() => asRecord(formData), [formData]);
  const prewarmHint = useMemo(() => {
    if (!empresa || !draftRecord) {
      return null;
    }

    return buildPrewarmHintForForm({
      formSlug,
      formData: draftRecord,
      provisionalName: buildDraftSpreadsheetProvisionalName({
        formSlug,
        draftId,
        localDraftSessionId,
      }),
    });
  }, [draftId, draftRecord, empresa, formSlug, localDraftSessionId]);

  useEffect(() => {
    if (
      disabled ||
      !empresa ||
      !draftRecord ||
      !prewarmHint ||
      !isFinalizationPrewarmEnabled(formSlug)
    ) {
      return;
    }

    const empresaNombre = empresa.nombre_empresa;
    const requestKey = [
      formSlug,
      empresaNombre,
      draftId ?? localDraftSessionId,
      prewarmHint.structureSignature,
    ].join(":");
    const previousObservedKey = lastObservedKeyRef.current;
    if (previousObservedKey && previousObservedKey !== requestKey) {
      delete blockedUntilByRequestKeyRef.current[previousObservedKey];
      delete failureStateByRequestKeyRef.current[previousObservedKey];
    }
    lastObservedKeyRef.current = requestKey;

    if (lastSentKeyRef.current === requestKey) {
      return;
    }

    const blockedUntil = blockedUntilByRequestKeyRef.current[requestKey];
    if (blockedUntil && blockedUntil > Date.now()) {
      return;
    }

    const failureState = failureStateByRequestKeyRef.current[requestKey];
    if (failureState && failureState.blockedUntil > Date.now()) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const identityResult = await ensureDraftIdentity(step, draftRecord);

          if (cancelled || !identityResult.ok || !identityResult.draftId) {
            return;
          }

          const response = await fetch("/api/formularios/prewarm-google", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              formSlug,
              empresa: {
                nombre_empresa: empresaNombre,
              },
              draft_identity: {
                draft_id: identityResult.draftId,
                local_draft_session_id: localDraftSessionId,
              },
              prewarm_hint: prewarmHint,
            }),
          });

          if (cancelled) {
            return;
          }

          if (!response.ok) {
            if (response.status === 409 || response.status === 429) {
              delete failureStateByRequestKeyRef.current[requestKey];
              const retryAfterHeader = response.headers.get("Retry-After");
              const retryAfterSeconds = Number.parseInt(retryAfterHeader ?? "0", 10);
              if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
                blockedUntilByRequestKeyRef.current[requestKey] =
                  Date.now() + retryAfterSeconds * 1000;
              }
              return;
            }

            throw new Error(`Prewarm respondio con ${response.status}.`);
          }

          delete blockedUntilByRequestKeyRef.current[requestKey];
          delete failureStateByRequestKeyRef.current[requestKey];
          lastSentKeyRef.current = requestKey;
        } catch (error) {
          const previousFailureCount =
            failureStateByRequestKeyRef.current[requestKey]?.failureCount ?? 0;
          const nextFailureCount = previousFailureCount + 1;
          const nextBackoffMs = Math.min(
            1000 * 2 ** Math.max(nextFailureCount - 1, 0),
            30_000
          );
          failureStateByRequestKeyRef.current[requestKey] = {
            failureCount: nextFailureCount,
            blockedUntil: Date.now() + nextBackoffMs,
          };
          console.warn("[google_prewarm] failed", {
            formSlug,
            requestKey,
            nextFailureCount,
            nextBackoffMs,
            error,
          });
        }
      })();
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    disabled,
    draftRecord,
    draftId,
    empresa,
    ensureDraftIdentity,
    formSlug,
    localDraftSessionId,
    prewarmHint,
    step,
  ]);
}
