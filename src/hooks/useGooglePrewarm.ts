"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type PrepareDraftForPrewarm = (
  step: number,
  data: Record<string, unknown>
) => Promise<{ ok: boolean; draftId?: string }>;

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readPrewarmErrorCode(response: Response) {
  if (response.status !== 400) {
    return null;
  }

  try {
    const payload = asRecord(await response.json());
    const code = payload?.code;

    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
}

export function useGooglePrewarm(options: {
  formSlug: FinalizationFormSlug;
  empresa: Empresa | null;
  formData: unknown;
  step: number;
  draftId: string | null;
  localDraftSessionId: string;
  ensureDraftIdentity: EnsureDraftIdentity;
  prepareDraftForPrewarm?: PrepareDraftForPrewarm;
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
    prepareDraftForPrewarm,
    step,
  } = options;
  const lastObservedKeyRef = useRef<string | null>(null);
  const lastSentKeyRef = useRef<string | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const blockedUntilByRequestKeyRef = useRef<Record<string, number>>({});
  const terminalFailureByRequestKeyRef = useRef<Record<string, true>>({});
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
  const latestDraftRecordRef = useRef(draftRecord);
  const latestPrewarmHintRef = useRef(prewarmHint);
  const latestStepRef = useRef(step);
  const latestEnsureDraftIdentityRef = useRef(ensureDraftIdentity);
  const latestPrepareDraftForPrewarmRef = useRef(prepareDraftForPrewarm);
  const empresaNombre = empresa?.nombre_empresa ?? null;
  const requestKey = useMemo(() => {
    if (!empresaNombre || !prewarmHint) {
      return null;
    }

    return [
      formSlug,
      empresaNombre,
      localDraftSessionId,
      prewarmHint.structureSignature,
    ].join(":");
  }, [
    empresaNombre,
    formSlug,
    localDraftSessionId,
    prewarmHint?.structureSignature,
  ]);

  useEffect(() => {
    latestDraftRecordRef.current = draftRecord;
  }, [draftRecord]);

  useEffect(() => {
    latestPrewarmHintRef.current = prewarmHint;
  }, [prewarmHint]);

  useEffect(() => {
    latestStepRef.current = step;
  }, [step]);

  useEffect(() => {
    latestEnsureDraftIdentityRef.current = ensureDraftIdentity;
  }, [ensureDraftIdentity]);

  useEffect(() => {
    latestPrepareDraftForPrewarmRef.current = prepareDraftForPrewarm;
  }, [prepareDraftForPrewarm]);

  const scheduleRetry = useCallback((retryAfterMs: number) => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
    }

    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      setRetryTick((current) => current + 1);
    }, retryAfterMs);
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      disabled ||
      !empresaNombre ||
      !requestKey ||
      !isFinalizationPrewarmEnabled(formSlug)
    ) {
      return;
    }

    const previousObservedKey = lastObservedKeyRef.current;
    if (previousObservedKey && previousObservedKey !== requestKey) {
      delete blockedUntilByRequestKeyRef.current[previousObservedKey];
      delete terminalFailureByRequestKeyRef.current[previousObservedKey];
      delete failureStateByRequestKeyRef.current[previousObservedKey];
    }
    lastObservedKeyRef.current = requestKey;

    if (lastSentKeyRef.current === requestKey) {
      return;
    }

    if (inFlightKeyRef.current === requestKey) {
      return;
    }

    if (terminalFailureByRequestKeyRef.current[requestKey]) {
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

    let cancelledBeforeStart = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelledBeforeStart) {
        return;
      }

      inFlightKeyRef.current = requestKey;

      void (async () => {
        try {
          const currentDraftRecord = latestDraftRecordRef.current;
          const currentPrewarmHint = latestPrewarmHintRef.current;
          const currentStep = latestStepRef.current;

          if (!currentDraftRecord || !currentPrewarmHint) {
            return;
          }

          const prepareDraftForPrewarm =
            latestPrepareDraftForPrewarmRef.current;
          const identityResult = prepareDraftForPrewarm
            ? await prepareDraftForPrewarm(currentStep, currentDraftRecord)
            : await latestEnsureDraftIdentityRef.current(
                currentStep,
                currentDraftRecord
              );

          if (!identityResult.ok || !identityResult.draftId) {
            blockedUntilByRequestKeyRef.current[requestKey] = Date.now() + 2_000;
            scheduleRetry(2_000);
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
              prewarm_hint: currentPrewarmHint,
            }),
          });

          if (!response.ok) {
            if (response.status === 409 || response.status === 429) {
              delete failureStateByRequestKeyRef.current[requestKey];
              const retryAfterHeader = response.headers.get("Retry-After");
              const retryAfterSeconds = Number.parseInt(retryAfterHeader ?? "0", 10);
              if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
                blockedUntilByRequestKeyRef.current[requestKey] =
                  Date.now() + retryAfterSeconds * 1000;
                scheduleRetry(retryAfterSeconds * 1000);
              }
              return;
            }

            const errorCode = await readPrewarmErrorCode(response);
            if (errorCode === "prewarm_cap_exceeded") {
              delete failureStateByRequestKeyRef.current[requestKey];
              terminalFailureByRequestKeyRef.current[requestKey] = true;
              console.warn("[google_prewarm] skipped terminal prewarm error", {
                formSlug,
                requestKey,
                errorCode,
              });
              return;
            }

            throw new Error(`Prewarm respondio con ${response.status}.`);
          }

          delete blockedUntilByRequestKeyRef.current[requestKey];
          delete terminalFailureByRequestKeyRef.current[requestKey];
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
          scheduleRetry(nextBackoffMs);
          console.warn("[google_prewarm] failed", {
            formSlug,
            requestKey,
            nextFailureCount,
            nextBackoffMs,
            error,
          });
        } finally {
          if (inFlightKeyRef.current === requestKey) {
            inFlightKeyRef.current = null;
          }
        }
      })();
    }, 600);

    return () => {
      cancelledBeforeStart = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    disabled,
    empresaNombre,
    formSlug,
    localDraftSessionId,
    requestKey,
    retryTick,
    scheduleRetry,
  ]);
}
