import {
  buildFinalizationUncertainPayload,
} from "@/lib/finalization/finalizationFeedback";
import type { FinalizationIdentity, FinalizationSuccessResponse } from "@/lib/finalization/idempotency";
import {
  type FinalizationStatusFormSlug,
  type FinalizationStatusResponse,
} from "@/lib/finalization/finalizationStatus";
import {
  reportFinalizationConfirmationEvent,
  reportFinalizationServerErrorEvent,
} from "@/lib/observability/finalization";
import type {
  LongFormFinalizationRetryAction,
  LongFormFinalizationStageId,
} from "@/lib/longFormFinalization";

const DEFAULT_CONFIRMATION_TIMEOUT_MS = 25_000;
const DEFAULT_CONFIRMATION_DEADLINE_MS = 90_000;
const DEFAULT_CONFIRMATION_POLL_INTERVAL_MS = 5_000;
const FINAL_CONFIRMATION_FALLBACK_MAX_ATTEMPTS = 3;
const FINAL_CONFIRMATION_FALLBACK_RETRY_SECONDS = [2, 5, 12] as const;
const FINAL_CONFIRMATION_FALLBACK_MAX_RETRY_AFTER_SECONDS = 30;
const SESSION_EXPIRED_DISPLAY_MESSAGE =
  "Tu sesión expiró. Recarga la página e inicia sesión de nuevo para finalizar.";
const FINALIZATION_NOT_STARTED_DISPLAY_MESSAGE =
  "No pudimos iniciar la finalización. Intenta nuevamente desde el formulario.";
const TEST_TIMEOUT_OVERRIDE_KEY =
  "__RECA_FINALIZATION_CONFIRMATION_TIMEOUT_MS__";
const TEST_DEADLINE_OVERRIDE_KEY =
  "__RECA_FINALIZATION_CONFIRMATION_DEADLINE_MS__";
const TEST_POLL_INTERVAL_OVERRIDE_KEY =
  "__RECA_FINALIZATION_CONFIRMATION_POLL_INTERVAL_MS__";
export const FINALIZATION_VALIDATION_CODES = [
  "bad_request",
  "invalid_payload",
  "validation_error",
] as const;

type SettledResponse =
  | { kind: "response"; response: Response }
  | { kind: "error"; error: unknown };

type ConfirmationStatusFetch = typeof fetch;

type WaitForFinalizationConfirmationOptions = {
  formSlug: FinalizationStatusFormSlug;
  finalizationIdentity: FinalizationIdentity;
  requestHash: string;
  onStageChange: (stageId: LongFormFinalizationStageId) => void;
  onStatusContextChange?: (context: {
    displayStage: string;
    displayMessage: string;
    retryAction: LongFormFinalizationRetryAction;
  }) => void;
  responsePromise?: Promise<Response>;
  fetchImpl?: ConfirmationStatusFetch;
  timeoutMs?: number;
  deadlineMs?: number;
  pollIntervalMs?: number;
};

function getFetchImpl(fetchImpl?: ConfirmationStatusFetch): ConfirmationStatusFetch {
  if (fetchImpl) {
    return (input, init) => fetchImpl(input, init);
  }

  return globalThis.fetch.bind(globalThis);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readClientDurationOverride(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = (window as unknown as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  if (
    isRecord(payload) &&
    typeof payload.errorMessage === "string" &&
    payload.errorMessage.trim()
  ) {
    return payload.errorMessage.trim();
  }

  return fallback;
}

function getDisplayMessage(payload: unknown, fallback: string) {
  if (
    isRecord(payload) &&
    typeof payload.displayMessage === "string" &&
    payload.displayMessage.trim()
  ) {
    return payload.displayMessage.trim();
  }

  return fallback;
}

function getDisplayStage(payload: unknown) {
  if (
    isRecord(payload) &&
    typeof payload.displayStage === "string" &&
    payload.displayStage.trim()
  ) {
    return payload.displayStage.trim();
  }

  return null;
}

function getRetryAction(
  payload: unknown,
  fallback: LongFormFinalizationRetryAction
) {
  if (
    isRecord(payload) &&
    (payload.retryAction === "submit" || payload.retryAction === "check_status")
  ) {
    return payload.retryAction;
  }

  return fallback;
}

function getUnknownErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}

function getErrorCode(payload: unknown) {
  return isRecord(payload) &&
    typeof payload.code === "string" &&
    payload.code.trim()
    ? payload.code.trim()
    : null;
}

function isProcessErrorCode(errorCode: string | null) {
  if (!errorCode) {
    return false;
  }

  // Defensive list for future standardized route codes; current Zod 400s
  // usually arrive without a code and are filtered by the whitelist defaults.
  return !FINALIZATION_VALIDATION_CODES.some((code) => code === errorCode);
}

function shouldReportInitialResponseError(options: {
  status: number;
  retryAction: LongFormFinalizationRetryAction;
  displayStage: string | null;
  errorCode: string | null;
}) {
  // #163: JAVASCRIPT-NEXTJS-P was inflated by ordinary Zod validation
  // responses (missing attendee name/cargo, incomplete rows) being reported as
  // initial server errors. Report only process-relevant responses: 5xx, session
  // loss, client timeout/conflict, check_status recovery signals, staged
  // responses with displayStage (drive/sheets stage failures), or explicit
  // non-validation process codes.
  if (options.status >= 500) {
    return true;
  }

  if ([401, 408, 409].includes(options.status)) {
    return true;
  }

  if (options.retryAction === "check_status") {
    return true;
  }

  if (options.displayStage) {
    return true;
  }

  return isProcessErrorCode(options.errorCode);
}

function createSessionExpiredError(options: {
  message: string;
  displayStage?: string | null;
}) {
  return new FinalizationConfirmationError({
    message: options.message,
    displayMessage: SESSION_EXPIRED_DISPLAY_MESSAGE,
    displayStage: options.displayStage,
    retryAction: "submit",
  });
}

function isSessionExpiredConfirmationError(error: unknown) {
  return (
    error instanceof FinalizationConfirmationError &&
    error.displayMessage === SESSION_EXPIRED_DISPLAY_MESSAGE
  );
}

async function parseJsonBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function inspectRecoverableResponse(response: Response) {
  const payload = await parseJsonBody(response.clone());
  const uncertainty = buildFinalizationUncertainPayload();
  const retryAction = getRetryAction(payload, "submit");

  return {
    isRecoverable: !response.ok && retryAction === "check_status",
    displayMessage: getDisplayMessage(payload, uncertainty.displayMessage),
    displayStage: getDisplayStage(payload) ?? uncertainty.displayStage,
    retryAction,
  } as const;
}

async function parseSuccessResponse(response: Response) {
  const payload = await parseJsonBody(response);

  if (!response.ok) {
    const errorMessage = getErrorMessage(payload, "Error al guardar el formulario.");
    throw new FinalizationConfirmationError({
      message: errorMessage,
      displayMessage: getDisplayMessage(payload, errorMessage),
      displayStage: getDisplayStage(payload),
      retryAction: getRetryAction(payload, "submit"),
    });
  }

  if (
    !isRecord(payload) ||
    typeof payload.sheetLink !== "string" ||
    !payload.sheetLink.trim()
  ) {
    const uncertainty = buildFinalizationUncertainPayload();
    throw new FinalizationConfirmationError({
      message: uncertainty.displayMessage,
      displayMessage: uncertainty.displayMessage,
      displayStage: uncertainty.displayStage,
      retryAction: uncertainty.retryAction,
    });
  }

  return {
    success: true,
    sheetLink: payload.sheetLink.trim(),
    ...(typeof payload.pdfLink === "string" && payload.pdfLink.trim()
      ? { pdfLink: payload.pdfLink.trim() }
      : {}),
  } satisfies FinalizationSuccessResponse;
}

async function requestFinalizationStatus(options: {
  fetchImpl: ConfirmationStatusFetch;
  formSlug: FinalizationStatusFormSlug;
  finalizationIdentity: FinalizationIdentity;
  requestHash: string;
}) {
  const response = await options.fetchImpl("/api/formularios/finalization-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      formSlug: options.formSlug,
      finalization_identity: options.finalizationIdentity,
      requestHash: options.requestHash,
    }),
  });
  const payload = (await parseJsonBody(response)) as FinalizationStatusResponse | null;

  if (response.status === 401) {
    const errorMessage = getErrorMessage(payload, "No autenticado");
    const displayStage = getDisplayStage(payload);
    const retryAction = getRetryAction(payload, "submit");

    reportFinalizationServerErrorEvent({
      formSlug: options.formSlug,
      requestHash: options.requestHash,
      status: response.status,
      errorMessage,
      errorDisplayMessage: getDisplayMessage(payload, "") || null,
      errorDisplayStage: displayStage,
      retryAction,
      errorCode: getErrorCode(payload),
    });

    throw createSessionExpiredError({
      message: errorMessage,
      displayStage,
    });
  }

  if (!payload || !isRecord(payload) || typeof payload.status !== "string") {
    const uncertainty = buildFinalizationUncertainPayload();
    throw new FinalizationConfirmationError({
      message: uncertainty.displayMessage,
      displayMessage: uncertainty.displayMessage,
      displayStage: uncertainty.displayStage,
      retryAction: uncertainty.retryAction,
    });
  }

  return payload as FinalizationStatusResponse;
}

function getFallbackRetryAfterSeconds(
  status: Extract<FinalizationStatusResponse, { status: "processing" }>,
  attemptIndex: number
) {
  if (
    Number.isFinite(status.retryAfterSeconds) &&
    status.retryAfterSeconds > 0
  ) {
    return Math.min(
      status.retryAfterSeconds,
      FINAL_CONFIRMATION_FALLBACK_MAX_RETRY_AFTER_SECONDS
    );
  }

  return (
    FINAL_CONFIRMATION_FALLBACK_RETRY_SECONDS[attemptIndex] ??
    FINAL_CONFIRMATION_FALLBACK_RETRY_SECONDS[
      FINAL_CONFIRMATION_FALLBACK_RETRY_SECONDS.length - 1
    ]
  );
}

async function runFinalStatusFallback(options: {
  fetchImpl: ConfirmationStatusFetch;
  formSlug: FinalizationStatusFormSlug;
  finalizationIdentity: FinalizationIdentity;
  requestHash: string;
  pollAttempts: number;
  pollTransientFailures: number;
  captureIssue: boolean;
  onStatusContextChange?: WaitForFinalizationConfirmationOptions["onStatusContextChange"];
}) {
  reportFinalizationConfirmationEvent("confirmation_failed_after_poll", {
    formSlug: options.formSlug,
    requestHash: options.requestHash,
    pollAttempts: options.pollAttempts,
    pollTransientFailures: options.pollTransientFailures || undefined,
    stage: "fallback.status_check_started",
    captureIssue: options.captureIssue,
  });

  for (
    let attemptIndex = 0;
    attemptIndex < FINAL_CONFIRMATION_FALLBACK_MAX_ATTEMPTS;
    attemptIndex += 1
  ) {
    let status: FinalizationStatusResponse | null = null;

    try {
      status = await requestFinalizationStatus({
        fetchImpl: options.fetchImpl,
        formSlug: options.formSlug,
        finalizationIdentity: options.finalizationIdentity,
        requestHash: options.requestHash,
      });
    } catch (error) {
      if (isSessionExpiredConfirmationError(error)) {
        throw error;
      }

      reportFinalizationConfirmationEvent("confirmation_poll_transient_error", {
        formSlug: options.formSlug,
        requestHash: options.requestHash,
        pollAttempts: options.pollAttempts + attemptIndex + 1,
        stage: getUnknownErrorMessage(error, "final_status_fallback_error"),
      });
      continue;
    }

    if (status.status === "succeeded") {
      if (status.recovered) {
        reportFinalizationConfirmationEvent("confirmation_recovered", {
          formSlug: options.formSlug,
          requestHash: options.requestHash,
          pollAttempts: options.pollAttempts + attemptIndex + 1,
        });
      }

      return status.responsePayload;
    }

    if (status.status === "failed") {
      throw new FinalizationConfirmationError({
        message: status.errorMessage,
        displayMessage: status.displayMessage,
        displayStage: status.displayStage,
        retryAction: status.retryAction,
      });
    }

    if (status.status === "not_found") {
      throw new FinalizationConfirmationError({
        message: FINALIZATION_NOT_STARTED_DISPLAY_MESSAGE,
        displayMessage: FINALIZATION_NOT_STARTED_DISPLAY_MESSAGE,
        retryAction: "submit",
      });
    }

    const retryAfterSeconds = getFallbackRetryAfterSeconds(
      status,
      attemptIndex
    );
    options.onStatusContextChange?.({
      displayStage: status.displayStage,
      displayMessage: `${status.displayMessage} Sigue en proceso, reintentamos en ${retryAfterSeconds} segundos.`,
      retryAction: status.retryAction,
    });

    if (attemptIndex === FINAL_CONFIRMATION_FALLBACK_MAX_ATTEMPTS - 1) {
      break;
    }

    await delay(retryAfterSeconds * 1_000);
  }

  return null;
}

function createTrackedResponse(responsePromise?: Promise<Response>) {
  let settled: SettledResponse | null = null;
  const wait = responsePromise
    ? responsePromise.then(
        (response) => {
          settled = { kind: "response", response };
          return settled;
        },
        (error) => {
          settled = { kind: "error", error };
          return settled;
        }
      )
    : null;

  return {
    get settled() {
      return settled;
    },
    wait,
  };
}

async function pollForFinalizationStatus(
  options: WaitForFinalizationConfirmationOptions & {
    trackedResponse: ReturnType<typeof createTrackedResponse>;
    initialReason:
      | "timeout"
      | "network_error"
      | "manual_retry"
      | "recoverable_response";
  }
) {
  const fetchImpl = getFetchImpl(options.fetchImpl);
  const startedAt = Date.now();
  const deadlineMs = options.deadlineMs ?? DEFAULT_CONFIRMATION_DEADLINE_MS;
  const pollIntervalMs =
    options.pollIntervalMs ??
    readClientDurationOverride(TEST_POLL_INTERVAL_OVERRIDE_KEY) ??
    DEFAULT_CONFIRMATION_POLL_INTERVAL_MS;
  let pollAttempts = 0;
  let pollTransientFailures = 0;

  options.onStageChange("verificando_publicacion");
  const uncertainty = buildFinalizationUncertainPayload();
  options.onStatusContextChange?.({
    displayStage: uncertainty.displayStage,
    displayMessage: uncertainty.displayMessage,
    retryAction: uncertainty.retryAction,
  });

  if (options.initialReason === "timeout") {
    reportFinalizationConfirmationEvent("confirmation_timeout_started", {
      formSlug: options.formSlug,
      requestHash: options.requestHash,
      pollAttempts,
    });
  }

  while (Date.now() - startedAt < deadlineMs) {
    const settled = options.trackedResponse.settled;
    if (settled?.kind === "response" && settled.response.ok) {
      return parseSuccessResponse(settled.response);
    }

    pollAttempts += 1;
    let status: FinalizationStatusResponse | null = null;
    try {
      status = await requestFinalizationStatus({
        fetchImpl,
        formSlug: options.formSlug,
        finalizationIdentity: options.finalizationIdentity,
        requestHash: options.requestHash,
      });
    } catch (error) {
      if (isSessionExpiredConfirmationError(error)) {
        throw error;
      }

      pollTransientFailures += 1;
      reportFinalizationConfirmationEvent("confirmation_poll_transient_error", {
        formSlug: options.formSlug,
        requestHash: options.requestHash,
        pollAttempts,
        stage: getUnknownErrorMessage(error, "status_poll_error"),
      });
      options.onStatusContextChange?.({
        displayStage: uncertainty.displayStage,
        displayMessage: uncertainty.displayMessage,
        retryAction: uncertainty.retryAction,
      });
    }

    if (!status) {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = deadlineMs - elapsedMs;
      if (remainingMs <= 0) {
        break;
      }

      await delay(Math.min(pollIntervalMs, remainingMs));
      continue;
    }

    if (status.status === "succeeded") {
      if (status.recovered) {
        reportFinalizationConfirmationEvent("confirmation_recovered", {
          formSlug: options.formSlug,
          requestHash: options.requestHash,
          pollAttempts,
        });
      }

      return status.responsePayload;
    }

    if (status.status === "failed") {
      reportFinalizationConfirmationEvent("confirmation_failed_after_poll", {
        formSlug: options.formSlug,
        requestHash: options.requestHash,
        pollAttempts,
        stage: status.stage,
        captureIssue: options.initialReason !== "recoverable_response",
      });
      throw new FinalizationConfirmationError({
        message: status.errorMessage,
        displayMessage: status.displayMessage,
        displayStage: status.displayStage,
        retryAction: status.retryAction,
      });
    }
    if (status.status === "processing") {
      options.onStatusContextChange?.({
        displayStage: status.displayStage,
        displayMessage: status.displayMessage,
        retryAction: status.retryAction,
      });
    }

    const elapsedMs = Date.now() - startedAt;
    const remainingMs = deadlineMs - elapsedMs;
    if (remainingMs <= 0) {
      break;
    }

    await delay(Math.min(pollIntervalMs, remainingMs));
  }

  reportFinalizationConfirmationEvent("confirmation_timeout_unresolved", {
    formSlug: options.formSlug,
    requestHash: options.requestHash,
    pollAttempts,
    pollTransientFailures: pollTransientFailures || undefined,
  });

  const settled = options.trackedResponse.settled;
  if (settled?.kind === "response" && settled.response.ok) {
    return parseSuccessResponse(settled.response);
  }

  const fallbackResponse = await runFinalStatusFallback({
    fetchImpl,
    formSlug: options.formSlug,
    finalizationIdentity: options.finalizationIdentity,
    requestHash: options.requestHash,
    pollAttempts,
    pollTransientFailures,
    captureIssue: options.initialReason !== "recoverable_response",
    onStatusContextChange: options.onStatusContextChange,
  });

  if (fallbackResponse) {
    return fallbackResponse;
  }

  if (settled?.kind === "response") {
    const payload = await parseJsonBody(settled.response);
    const uncertainty = buildFinalizationUncertainPayload();
    const errorMessage = getErrorMessage(payload, uncertainty.displayMessage);
    throw new FinalizationConfirmationError({
      message: errorMessage,
      displayMessage: getDisplayMessage(payload, uncertainty.displayMessage),
      displayStage: getDisplayStage(payload) ?? uncertainty.displayStage,
      retryAction: getRetryAction(payload, uncertainty.retryAction),
    });
  }

  if (settled?.kind === "error") {
    const message =
      settled.error instanceof Error && settled.error.message.trim()
        ? settled.error.message
        : buildFinalizationUncertainPayload().displayMessage;
    const uncertainty = buildFinalizationUncertainPayload();
    throw new FinalizationConfirmationError({
      message,
      displayMessage: uncertainty.displayMessage,
      displayStage: uncertainty.displayStage,
      retryAction: uncertainty.retryAction,
    });
  }

  const fallbackUncertainty = buildFinalizationUncertainPayload();
  throw new FinalizationConfirmationError({
    message: fallbackUncertainty.displayMessage,
    displayMessage: fallbackUncertainty.displayMessage,
    displayStage: fallbackUncertainty.displayStage,
    retryAction: fallbackUncertainty.retryAction,
  });
}

export class FinalizationConfirmationError extends Error {
  retryAction: LongFormFinalizationRetryAction;
  displayMessage: string | null;
  displayStage: string | null;
  detailMessage: string | null;

  constructor(options: {
    message: string;
    retryAction: LongFormFinalizationRetryAction;
    displayMessage?: string | null;
    displayStage?: string | null;
  }) {
    const normalizedDisplayMessage = options.displayMessage?.trim() ?? "";
    super(normalizedDisplayMessage || options.message);
    this.name = "FinalizationConfirmationError";
    this.retryAction = options.retryAction;
    this.displayMessage = normalizedDisplayMessage || null;
    this.displayStage = options.displayStage?.trim() || null;
    this.detailMessage =
      normalizedDisplayMessage && normalizedDisplayMessage !== options.message
        ? options.message
        : null;
  }
}

export async function waitForFinalizationConfirmation(
  options: WaitForFinalizationConfirmationOptions
) {
  const trackedResponse = createTrackedResponse(options.responsePromise);
  const timeoutMs =
    options.timeoutMs ??
    readClientDurationOverride(TEST_TIMEOUT_OVERRIDE_KEY) ??
    DEFAULT_CONFIRMATION_TIMEOUT_MS;
  const deadlineMs =
    options.deadlineMs ??
    readClientDurationOverride(TEST_DEADLINE_OVERRIDE_KEY) ??
    DEFAULT_CONFIRMATION_DEADLINE_MS;
  const pollIntervalMs =
    options.pollIntervalMs ??
    readClientDurationOverride(TEST_POLL_INTERVAL_OVERRIDE_KEY) ??
    DEFAULT_CONFIRMATION_POLL_INTERVAL_MS;

  if (!trackedResponse.wait) {
    return pollForFinalizationStatus({
      ...options,
      deadlineMs,
      pollIntervalMs,
      trackedResponse,
      initialReason: "manual_retry",
    });
  }

  const initialOutcome = await Promise.race([
    trackedResponse.wait,
    delay(timeoutMs).then(() => null),
  ]);

  if (initialOutcome?.kind === "response") {
    const response = initialOutcome.response;

    if (!response.ok) {
      const payloadForReport = await parseJsonBody(response.clone());
      const errorMessage = getErrorMessage(
        payloadForReport,
        "Error al guardar el formulario."
      );
      const displayMessageFromPayload = getDisplayMessage(
        payloadForReport,
        ""
      );
      const displayStageFromPayload = getDisplayStage(payloadForReport);
      const retryActionFromPayload = getRetryAction(
        payloadForReport,
        "submit"
      );
      const errorCode = getErrorCode(payloadForReport);

      if (
        shouldReportInitialResponseError({
          status: response.status,
          retryAction: retryActionFromPayload,
          displayStage: displayStageFromPayload,
          errorCode,
        })
      ) {
        reportFinalizationServerErrorEvent({
          formSlug: options.formSlug,
          requestHash: options.requestHash,
          status: response.status,
          errorMessage,
          errorDisplayMessage: displayMessageFromPayload || null,
          errorDisplayStage: displayStageFromPayload,
          retryAction: retryActionFromPayload,
          errorCode,
        });
      }

      if (response.status === 401) {
        throw new FinalizationConfirmationError({
          message: errorMessage,
          displayMessage: SESSION_EXPIRED_DISPLAY_MESSAGE,
          displayStage: displayStageFromPayload,
          retryAction: "submit",
        });
      }
    }

    const recoverableResponse = await inspectRecoverableResponse(response);

    if (recoverableResponse.isRecoverable) {
      options.onStatusContextChange?.({
        displayStage: recoverableResponse.displayStage,
        displayMessage: recoverableResponse.displayMessage,
        retryAction: recoverableResponse.retryAction,
      });

      return pollForFinalizationStatus({
        ...options,
        deadlineMs,
        pollIntervalMs,
        trackedResponse,
        initialReason: "recoverable_response",
      });
    }

    return parseSuccessResponse(response);
  }

  if (initialOutcome?.kind === "error") {
    return pollForFinalizationStatus({
      ...options,
      deadlineMs,
      pollIntervalMs,
      trackedResponse,
      initialReason: "network_error",
    });
  }

  return pollForFinalizationStatus({
    ...options,
    deadlineMs,
    pollIntervalMs,
    trackedResponse,
    initialReason: "timeout",
  });
}
