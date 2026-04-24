"use client";

import { useCallback, useRef, useState } from "react";
import { getMeaningfulAsistentes, normalizePersistedAsistentesForMode } from "@/lib/asistentes";
import {
  FinalizationConfirmationError,
  waitForFinalizationConfirmation,
} from "@/lib/finalization/finalizationConfirmation";
import {
  beginFinalizationUiLock,
  clearFinalizationUiLock,
  shouldSuppressDraftNavigationWhileFinalizing,
} from "@/lib/finalization/finalizationUiLock";
import { buildFinalizationRequestHash } from "@/lib/finalization/idempotency";
import type { LongFormFinalizedSuccess } from "@/lib/longFormSuccess";
import {
  getInitialLongFormFinalizationProgress,
  type LongFormFinalizationProgress,
  type LongFormFinalizationRetryAction,
} from "@/lib/longFormFinalization";
import { buildFormEditorUrl } from "@/lib/forms";
import { normalizeInterpreteLscValues } from "@/lib/interpreteLsc";
import type { Empresa } from "@/lib/store/empresaStore";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";
import { useRouter } from "next/navigation";

export function useInterpreteLscFinalizationRuntime(options: {
  empresa: Empresa | null;
  isDocumentEditable: boolean;
  activeDraftId: string | null;
  localDraftSessionId: string;
  clearDraftAfterSuccess: () => Promise<void>;
  suspendDraftLifecycle: () => void;
  resumeDraftLifecycle: () => void;
  reportInvalidPromotionSuppressed: (draftId: string) => boolean;
  markRouteHydrated: (routeKey: string | null) => void;
  onSuccess: (success: LongFormFinalizedSuccess) => void;
  onErrorMessage: (message: string | null) => void;
}) {
  const router = useRouter();
  const {
    empresa,
    isDocumentEditable,
    activeDraftId,
    localDraftSessionId,
    clearDraftAfterSuccess,
    suspendDraftLifecycle,
    resumeDraftLifecycle,
    reportInvalidPromotionSuppressed,
    markRouteHydrated,
    onSuccess,
    onErrorMessage,
  } = options;
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] =
    useState<InterpreteLscValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] =
    useState<LongFormFinalizationProgress>(
      getInitialLongFormFinalizationProgress
    );
  const finalizationFeedbackRef = useRef<HTMLDivElement | null>(null);

  const resetFinalizationProgress = useCallback(() => {
    setFinalizationProgress(getInitialLongFormFinalizationProgress());
  }, []);

  const updateFinalizationStage = useCallback(
    (stageId: LongFormFinalizationProgress["currentStageId"]) => {
      if (!stageId) {
        return;
      }

      setFinalizationProgress((current) => ({
        phase: "processing",
        currentStageId: stageId,
        startedAt: current.startedAt ?? Date.now(),
        displayMessage: current.displayMessage,
        errorMessage: null,
        retryAction: current.retryAction,
      }));
    },
    []
  );

  const focusFinalizationFeedback = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      const element = finalizationFeedbackRef.current;
      if (!element) {
        return;
      }

      element.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      element.focus({ preventScroll: true });
    });
  }, []);

  const markFinalizationError = useCallback(
    (
      message: string,
      retryAction: LongFormFinalizationRetryAction = "submit",
      options?: {
        displayMessage?: string | null;
        detailMessage?: string | null;
      }
    ) => {
      setFinalizationProgress((current) => ({
        phase: "error",
        currentStageId: current.currentStageId ?? "esperando_respuesta",
        startedAt: current.startedAt ?? Date.now(),
        displayMessage: options?.displayMessage ?? null,
        errorMessage:
          options && "detailMessage" in options
            ? options.detailMessage ?? null
            : message,
        retryAction,
      }));
      focusFinalizationFeedback();
    },
    [focusFinalizationFeedback]
  );

  const updateFinalizationStatusContext = useCallback(
    (context: {
      displayMessage: string;
      retryAction: LongFormFinalizationRetryAction;
    }) => {
      setFinalizationProgress((current) => ({
        ...current,
        displayMessage: context.displayMessage,
        retryAction: context.retryAction,
      }));
    },
    []
  );

  const handlePrepareSubmit = useCallback(
    (data: InterpreteLscValues) => {
      if (!isDocumentEditable) {
        return;
      }

      const normalizedData: InterpreteLscValues = {
        ...normalizeInterpreteLscValues(data, empresa),
        asistentes: normalizePersistedAsistentesForMode(data.asistentes, {
          mode: "reca_plus_generic_attendees",
          profesionalAsignado: empresa?.profesional_asignado,
        }),
      };

      onErrorMessage(null);
      resetFinalizationProgress();
      setPendingSubmitValues(normalizedData);
      setSubmitConfirmOpen(true);
    },
    [empresa, isDocumentEditable, onErrorMessage, resetFinalizationProgress]
  );

  const confirmSubmit = useCallback(
    async (retryAction: LongFormFinalizationRetryAction = "submit") => {
      if (!isDocumentEditable) {
        return;
      }

      if (!pendingSubmitValues || !empresa) {
        clearFinalizationUiLock("interprete-lsc");
        resumeDraftLifecycle();
        setSubmitConfirmOpen(false);
        resetFinalizationProgress();
        return;
      }

      beginFinalizationUiLock("interprete-lsc");
      suspendDraftLifecycle();
      onErrorMessage(null);
      setIsFinalizing(true);
      setFinalizationProgress({
        phase: "processing",
        currentStageId:
          retryAction === "check_status" ? "esperando_respuesta" : "validando",
        startedAt: Date.now(),
        displayMessage: null,
        errorMessage: null,
        retryAction,
      });

      try {
        const meaningfulAsistentes = getMeaningfulAsistentes(
          pendingSubmitValues.asistentes
        );
        const finalizationIdentity = {
          local_draft_session_id: localDraftSessionId,
          ...(activeDraftId ? { draft_id: activeDraftId } : {}),
        };
        const finalizationFormData = {
          ...pendingSubmitValues,
          asistentes: meaningfulAsistentes,
        };
        const requestHash = buildFinalizationRequestHash("interprete-lsc", finalizationFormData as Record<string, unknown>);
        let responsePayload: { sheetLink: string; pdfLink?: string };

        if (retryAction === "submit") {
          updateFinalizationStage("preparando_envio");
          const requestBody = JSON.stringify({
            empresa,
            formData: finalizationFormData,
            finalization_identity: finalizationIdentity,
          });
          updateFinalizationStage("enviando_al_servidor");
          const responsePromise = fetch("/api/formularios/interprete-lsc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          });
          updateFinalizationStage("esperando_respuesta");
          responsePayload = await waitForFinalizationConfirmation({
            formSlug: "interprete-lsc",
            finalizationIdentity,
            requestHash,
            onStageChange: updateFinalizationStage,
            onStatusContextChange: updateFinalizationStatusContext,
            responsePromise,
          });
        } else {
          responsePayload = await waitForFinalizationConfirmation({
            formSlug: "interprete-lsc",
            finalizationIdentity,
            requestHash,
            onStageChange: updateFinalizationStage,
            onStatusContextChange: updateFinalizationStatusContext,
          });
        }

        updateFinalizationStage("cerrando_borrador_local");
        onSuccess({
          companyName: empresa.nombre_empresa,
          links: {
            sheetLink: responsePayload.sheetLink,
            pdfLink: responsePayload.pdfLink,
          },
        });
        clearFinalizationUiLock("interprete-lsc");
        setFinalizationProgress((current) => ({
          ...current,
          phase: "completed",
          retryAction: "submit",
        }));
        setSubmitConfirmOpen(false);
        setPendingSubmitValues(null);
        onErrorMessage(null);
        try {
          await clearDraftAfterSuccess();
        } catch (cleanupError) {
          console.error(
            "[interprete_lsc.finalization_cleanup] failed (non-fatal)",
            cleanupError
          );
        }
        window.scrollTo({ top: 0, behavior: "auto" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al guardar el formulario.";
        const isConfirmationError = error instanceof FinalizationConfirmationError;
        markFinalizationError(
          isConfirmationError ? error.detailMessage ?? errorMessage : errorMessage,
          isConfirmationError ? error.retryAction : retryAction,
          {
            displayMessage: isConfirmationError ? error.displayMessage : null,
            detailMessage: isConfirmationError ? error.detailMessage : errorMessage,
          }
        );
      } finally {
        setIsFinalizing(false);
      }
    },
    [
      activeDraftId,
      clearDraftAfterSuccess,
      empresa,
      isDocumentEditable,
      localDraftSessionId,
      markFinalizationError,
      onErrorMessage,
      onSuccess,
      pendingSubmitValues,
      resetFinalizationProgress,
      resumeDraftLifecycle,
      suspendDraftLifecycle,
      updateFinalizationStage,
      updateFinalizationStatusContext,
    ]
  );

  const cancelSubmitDialog = useCallback(() => {
    if (isFinalizing) {
      return;
    }

    clearFinalizationUiLock("interprete-lsc");
    resumeDraftLifecycle();
    setSubmitConfirmOpen(false);
    setPendingSubmitValues(null);
    if (finalizationProgress.phase !== "error") {
      resetFinalizationProgress();
    }
  }, [
    finalizationProgress.phase,
    isFinalizing,
    resetFinalizationProgress,
    resumeDraftLifecycle,
  ]);

  const reportInvalidSubmissionPromotion = useCallback(
    (nextDraftId: string) => {
      if (reportInvalidPromotionSuppressed(nextDraftId)) {
        return;
      }
      if (
        shouldSuppressDraftNavigationWhileFinalizing(
          "interprete-lsc",
          "invalid_submission_promotion"
        )
      ) {
        return;
      }

      markRouteHydrated(`draft:${nextDraftId}`);
      router.replace(
        buildFormEditorUrl("interprete-lsc", {
          draftId: nextDraftId,
        }),
        { scroll: false }
      );
    },
    [markRouteHydrated, reportInvalidPromotionSuppressed, router]
  );

  return {
    submitConfirmOpen,
    isFinalizing,
    finalizationProgress,
    finalizationFeedbackRef,
    resetFinalizationProgress,
    handlePrepareSubmit,
    confirmSubmit,
    cancelSubmitDialog,
    reportInvalidSubmissionPromotion,
    setSubmitConfirmOpen,
    setPendingSubmitValues,
  };
}
