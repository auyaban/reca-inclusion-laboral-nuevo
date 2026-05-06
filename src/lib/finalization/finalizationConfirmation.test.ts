import { afterEach, describe, expect, it, vi } from "vitest";

const {
  reportFinalizationConfirmationEventMock,
  reportFinalizationServerErrorEventMock,
} = vi.hoisted(() => ({
  reportFinalizationConfirmationEventMock: vi.fn(),
  reportFinalizationServerErrorEventMock: vi.fn(),
}));

vi.mock("@/lib/observability/finalization", () => ({
  reportFinalizationConfirmationEvent: reportFinalizationConfirmationEventMock,
  reportFinalizationServerErrorEvent: reportFinalizationServerErrorEventMock,
}));

import {
  FinalizationConfirmationError,
  waitForFinalizationConfirmation,
} from "@/lib/finalization/finalizationConfirmation";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createDeferredResponse() {
  let resolve!: (response: Response) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Response>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe("waitForFinalizationConfirmation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("recovers when one status poll fails transiently and a later poll succeeds with pdfLink", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        jsonResponse({
          status: "succeeded",
          responsePayload: {
            success: true,
            sheetLink: "https://example.com/sheet",
            pdfLink: "https://example.com/pdf",
          },
          recovered: true,
        })
      );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "induccion-organizacional",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-failed-visit",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 11_000,
      pollIntervalMs: 5_000,
    });

    await vi.advanceTimersByTimeAsync(25);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_poll_transient_error",
      expect.objectContaining({
        formSlug: "induccion-organizacional",
        requestHash: "hash-failed-visit",
        pollAttempts: 1,
        stage: "Failed to fetch",
      })
    );

    await vi.advanceTimersByTimeAsync(5_000);
    await expect(resultPromise).resolves.toEqual({
      success: true,
      sheetLink: "https://example.com/sheet",
      pdfLink: "https://example.com/pdf",
    });
  });

  it("uses the original submit response if it settles after a transient status poll failure", async () => {
    vi.useFakeTimers();

    const deferredResponse = createDeferredResponse();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "induccion-organizacional",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-original-response",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: deferredResponse.promise,
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 11_000,
      pollIntervalMs: 5_000,
    });

    await vi.advanceTimersByTimeAsync(25);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    deferredResponse.resolve(
      jsonResponse({
        success: true,
        sheetLink: "https://example.com/original-sheet",
        pdfLink: "https://example.com/original-pdf",
      })
    );

    await vi.advanceTimersByTimeAsync(5_000);
    await expect(resultPromise).resolves.toEqual({
      success: true,
      sheetLink: "https://example.com/original-sheet",
      pdfLink: "https://example.com/original-pdf",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("stops polling with a session-expired error when finalization-status returns 401", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({ error: "No autenticado", code: "unauthorized" }, 401)
    );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "induccion-organizacional",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-session-expired-poll",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 11_000,
      pollIntervalMs: 5_000,
    });
    const rejection = expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
      displayMessage:
        "Tu sesión expiró. Recarga la página e inicia sesión de nuevo para finalizar.",
      detailMessage: "No autenticado",
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(reportFinalizationServerErrorEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "induccion-organizacional",
        requestHash: "hash-session-expired-poll",
        status: 401,
        errorMessage: "No autenticado",
        retryAction: "submit",
        errorCode: "unauthorized",
      })
    );
    expect(reportFinalizationConfirmationEventMock).not.toHaveBeenCalledWith(
      "confirmation_poll_transient_error",
      expect.anything()
    );
  });

  it("keeps 5xx status poll responses recoverable until a later poll succeeds", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "Gateway timeout" }, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          status: "succeeded",
          responsePayload: {
            success: true,
            sheetLink: "https://example.com/recovered-sheet",
          },
          recovered: true,
        })
      );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "induccion-organizacional",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-5xx-poll",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 11_000,
      pollIntervalMs: 5_000,
    });

    await vi.advanceTimersByTimeAsync(25);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_poll_transient_error",
      expect.objectContaining({
        formSlug: "induccion-organizacional",
        requestHash: "hash-5xx-poll",
        pollAttempts: 1,
      })
    );

    await vi.advanceTimersByTimeAsync(5_000);
    await expect(resultPromise).resolves.toEqual({
      success: true,
      sheetLink: "https://example.com/recovered-sheet",
    });
  });

  it("keeps transient status poll failures recoverable until the deadline expires", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "induccion-organizacional",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-poll-failures",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 60,
      pollIntervalMs: 50,
    });
    const rejection = expect(resultPromise).rejects.toThrow(
      FinalizationConfirmationError
    );

    await vi.advanceTimersByTimeAsync(85);
    await rejection;
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_timeout_unresolved",
      expect.objectContaining({
        formSlug: "induccion-organizacional",
        requestHash: "hash-poll-failures",
        pollAttempts: 2,
        pollTransientFailures: 2,
      })
    );
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_failed_after_poll",
      expect.objectContaining({
        formSlug: "induccion-organizacional",
        requestHash: "hash-poll-failures",
        pollAttempts: 2,
        pollTransientFailures: 2,
        captureIssue: true,
      })
    );
  });

  it("performs a final status fallback and returns success after polling loses the network", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        jsonResponse({
          status: "succeeded",
          responsePayload: {
            success: true,
            sheetLink: "https://example.com/fallback-sheet",
            pdfLink: "https://example.com/fallback-pdf",
          },
          recovered: true,
        })
      );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-fallback-succeeded",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 60,
      pollIntervalMs: 50,
    });

    await vi.advanceTimersByTimeAsync(85);
    await expect(resultPromise).resolves.toEqual({
      success: true,
      sheetLink: "https://example.com/fallback-sheet",
      pdfLink: "https://example.com/fallback-pdf",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_failed_after_poll",
      expect.objectContaining({
        formSlug: "presentacion",
        requestHash: "hash-fallback-succeeded",
        pollAttempts: 2,
        pollTransientFailures: 2,
        captureIssue: true,
      })
    );
  });

  it("uses retryAfterSeconds with a cap while the final fallback still reports processing", async () => {
    vi.useFakeTimers();

    const onStatusContextChange = vi.fn();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "processing",
            stage: "drive.export_pdf",
            displayStage: "Generando PDF",
            displayMessage: "Seguimos publicando el acta.",
            retryAction: "check_status",
            retryAfterSeconds: 1,
          },
          202
        )
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "processing",
            stage: "drive.export_pdf",
            displayStage: "Generando PDF",
            displayMessage: "Seguimos publicando el acta.",
            retryAction: "check_status",
            retryAfterSeconds: 60,
          },
          202
        )
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "processing",
            stage: "drive.export_pdf",
            displayStage: "Generando PDF",
            displayMessage: "Seguimos publicando el acta.",
            retryAction: "check_status",
            retryAfterSeconds: 1,
          },
          202
        )
      );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-fallback-processing",
      onStageChange: vi.fn(),
      onStatusContextChange,
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 60,
      pollIntervalMs: 50,
    });
    const rejection = expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "check_status",
    });

    await vi.advanceTimersByTimeAsync(85);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    await vi.advanceTimersByTimeAsync(29_999);
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(onStatusContextChange).toHaveBeenCalledWith(
      expect.objectContaining({
        displayStage: "Generando PDF",
        displayMessage: expect.stringContaining("Seguimos publicando el acta."),
        retryAction: "check_status",
      })
    );
  });

  it("surfaces the real failed status during the final fallback", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "failed",
            stage: "drive.upload_pdf",
            errorMessage: "Drive timeout",
            displayStage: "Generando PDF",
            displayMessage: "La publicacion fallo mientras generando PDF.",
            retryAction: "submit",
          },
          409
        )
      );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-fallback-failed",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 60,
      pollIntervalMs: 50,
    });
    const rejection = expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
      displayStage: "Generando PDF",
      displayMessage: "La publicacion fallo mientras generando PDF.",
      detailMessage: "Drive timeout",
    });

    await vi.advanceTimersByTimeAsync(85);
    await rejection;
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_failed_after_poll",
      expect.objectContaining({
        formSlug: "presentacion",
        requestHash: "hash-fallback-failed",
        captureIssue: true,
      })
    );
  });

  it("asks the user to retry the full finalization when fallback status is not_found", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse({ status: "not_found" }, 404));

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-fallback-not-found",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 60,
      pollIntervalMs: 50,
    });
    const rejection = expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
      displayMessage:
        "No pudimos iniciar la finalización. Intenta nuevamente desde el formulario.",
    });

    await vi.advanceTimersByTimeAsync(85);
    await rejection;
  });

  it("does not call the status endpoint when the initial submit response succeeds", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-success-no-fallback",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: Promise.resolve(
        jsonResponse({
          success: true,
          sheetLink: "https://example.com/sheet",
        })
      ),
      fetchImpl,
    });

    await expect(resultPromise).resolves.toEqual({
      success: true,
      sheetLink: "https://example.com/sheet",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("polls with a fixed cadence even when the server lock advertises a long retryAfterSeconds", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "processing",
            stage: "drive.export_pdf",
            displayStage: "Generando PDF",
            displayMessage: "Estamos trabajando en: Generando PDF.",
            retryAction: "check_status",
            retryAfterSeconds: 335,
          },
          202
        )
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "processing",
            stage: "drive.export_pdf",
            displayStage: "Generando PDF",
            displayMessage: "Estamos trabajando en: Generando PDF.",
            retryAction: "check_status",
            retryAfterSeconds: 330,
          },
          202
        )
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "succeeded",
          responsePayload: {
            success: true,
            sheetLink: "https://example.com/sheet",
          },
          recovered: true,
        })
      );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-1",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 11_000,
      pollIntervalMs: 5_000,
    });

    await vi.advanceTimersByTimeAsync(25);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5_000);
    await expect(resultPromise).resolves.toEqual({
      success: true,
      sheetLink: "https://example.com/sheet",
    });
  });

  it("caps the final wait to the remaining deadline instead of sleeping past it", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          status: "processing",
          stage: "drive.export_pdf",
          displayStage: "Generando PDF",
          displayMessage: "Estamos trabajando en: Generando PDF.",
          retryAction: "check_status",
          retryAfterSeconds: 999,
        },
        202
      )
    );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-1",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 60,
      pollIntervalMs: 50,
    });
    const rejection = expect(resultPromise).rejects.toThrow(
      FinalizationConfirmationError
    );

    await vi.advanceTimersByTimeAsync(85);
    await rejection;
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it("surfaces user-facing metadata when the status endpoint reports a real failure", async () => {
    vi.useFakeTimers();

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-1",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValueOnce(
        jsonResponse(
          {
            status: "failed",
            stage: "drive.upload_pdf",
            errorMessage: "Drive timeout",
            displayStage: "Generando PDF",
            displayMessage: "La publicación falló mientras generando PDF.",
            retryAction: "submit",
          },
          409
        )
      ),
      timeoutMs: 25,
      deadlineMs: 5_000,
      pollIntervalMs: 5_000,
    });
    const rejection = expect(resultPromise).rejects.toMatchObject({
      retryAction: "submit",
      displayStage: "Generando PDF",
      displayMessage: "La publicación falló mientras generando PDF.",
      detailMessage: "Drive timeout",
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
  });

  it("polls status when the initial submit response is recoverable with check_status", async () => {
    vi.useFakeTimers();

    const onStatusContextChange = vi.fn();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "processing",
            stage: "confirming.persisted_record_written",
            displayStage: "Confirmando publicacion",
            displayMessage:
              "No pudimos confirmar la publicacion. Puede que el acta ya este guardada.",
            retryAction: "check_status",
            retryAfterSeconds: 5,
          },
          202
        )
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "succeeded",
          responsePayload: {
            success: true,
            sheetLink: "https://example.com/recovered-sheet",
          },
          recovered: true,
        })
      );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-1",
      onStageChange: vi.fn(),
      onStatusContextChange,
      responsePromise: Promise.resolve(
        jsonResponse(
          {
            error:
              "No pudimos confirmar la publicacion. Puede que el acta ya este guardada.",
            stage: "confirming.persisted_record_written",
            displayStage: "Confirmando publicacion",
            displayMessage:
              "No pudimos confirmar la publicacion. Puede que el acta ya este guardada.",
            retryAction: "check_status",
          },
          409
        )
      ),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 10_000,
      pollIntervalMs: 5_000,
    });

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual({
      success: true,
      sheetLink: "https://example.com/recovered-sheet",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onStatusContextChange).toHaveBeenCalled();
    expect(reportFinalizationServerErrorEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "presentacion",
        requestHash: "hash-1",
        status: 409,
        errorMessage:
          "No pudimos confirmar la publicacion. Puede que el acta ya este guardada.",
        retryAction: "check_status",
      })
    );
  });

  it("does not report validation errors as server errors but still surfaces them", async () => {
    const response = jsonResponse(
      {
        error: "Completa esta fila o eliminala antes de finalizar.",
        retryAction: "submit",
      },
      400
    );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-validation",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: Promise.resolve(response),
    });

    await expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
      displayMessage: "Completa esta fila o eliminala antes de finalizar.",
    });
    expect(reportFinalizationServerErrorEventMock).not.toHaveBeenCalled();
  });

  it("does not report 422 validation errors as server errors", async () => {
    const response = jsonResponse(
      {
        error: "El nombre es requerido",
        retryAction: "submit",
      },
      422
    );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "evaluacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-validation-422",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: Promise.resolve(response),
    });

    await expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
      displayMessage: "El nombre es requerido",
    });
    expect(reportFinalizationServerErrorEventMock).not.toHaveBeenCalled();
  });

  it("does not report coded validation 400 responses as server errors", async () => {
    const response = jsonResponse(
      {
        error: "Payload invalido.",
        code: "validation_error",
        retryAction: "submit",
      },
      400
    );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "evaluacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-validation-code",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: Promise.resolve(response),
    });

    await expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
      displayMessage: "Payload invalido.",
    });
    expect(reportFinalizationServerErrorEventMock).not.toHaveBeenCalled();
  });

  it("reports coded process 4xx initial responses", async () => {
    const response = jsonResponse(
      {
        error: "No pudimos confirmar la publicacion.",
        code: "finalization_claim_exhausted",
        retryAction: "submit",
      },
      400
    );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-process-4xx",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: Promise.resolve(response),
    });

    await expect(resultPromise).rejects.toThrow(FinalizationConfirmationError);
    expect(reportFinalizationServerErrorEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "presentacion",
        requestHash: "hash-process-4xx",
        status: 400,
        errorMessage: "No pudimos confirmar la publicacion.",
        retryAction: "submit",
        errorCode: "finalization_claim_exhausted",
      })
    );
  });

  it("avoids duplicate confirmation error issues after a recoverable initial 500", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(
        {
          status: "failed",
          stage: "spreadsheet.inspect_mutation_marker",
          errorMessage: "La insercion estructural falla al reanudar.",
          displayStage: "Guardando en Google Sheets",
          displayMessage: "No pudimos confirmar la publicacion.",
          retryAction: "check_status",
        },
        409
      )
    );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-dup",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: Promise.resolve(
        jsonResponse(
          {
            error: "La insercion estructural falla al reanudar.",
            stage: "spreadsheet.inspect_mutation_marker",
            displayStage: "Guardando en Google Sheets",
            displayMessage: "No pudimos confirmar la publicacion.",
            retryAction: "check_status",
          },
          500
        )
      ),
      fetchImpl,
      timeoutMs: 25,
      deadlineMs: 5_000,
      pollIntervalMs: 5_000,
    });

    await expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "check_status",
      displayStage: "Guardando en Google Sheets",
      displayMessage: "No pudimos confirmar la publicacion.",
      detailMessage: "La insercion estructural falla al reanudar.",
    });
    expect(reportFinalizationServerErrorEventMock).toHaveBeenCalledTimes(1);
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_failed_after_poll",
      expect.objectContaining({
        formSlug: "presentacion",
        requestHash: "hash-dup",
        pollAttempts: 1,
        stage: "spreadsheet.inspect_mutation_marker",
        captureIssue: false,
      })
    );
  });

  it("reports a session-expired error and calls Sentry when the initial response is 401", async () => {
    const response = jsonResponse({ error: "No autenticado" }, 401);

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "contratacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-1",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: Promise.resolve(response),
    });

    await expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
      displayMessage:
        "Tu sesión expiró. Recarga la página e inicia sesión de nuevo para finalizar.",
      detailMessage: "No autenticado",
    });
    expect(reportFinalizationServerErrorEventMock).toHaveBeenCalledTimes(1);
    expect(reportFinalizationServerErrorEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "contratacion",
        requestHash: "hash-1",
        status: 401,
        errorMessage: "No autenticado",
        retryAction: "submit",
      })
    );
  });

  it("reports server error telemetry when the initial response is a non-recoverable 500", async () => {
    const response = jsonResponse(
      { error: "Faltan variables de entorno de Google Drive o Sheets" },
      500
    );

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "contratacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-2",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: Promise.resolve(response),
    });

    await expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
    });
    expect(reportFinalizationServerErrorEventMock).toHaveBeenCalledTimes(1);
    expect(reportFinalizationServerErrorEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "contratacion",
        requestHash: "hash-2",
        status: 500,
        errorMessage: "Faltan variables de entorno de Google Drive o Sheets",
        retryAction: "submit",
      })
    );
  });

  it("keeps confirmation_failed_after_poll telemetry for post-timeout failures", async () => {
    vi.useFakeTimers();

    const resultPromise = waitForFinalizationConfirmation({
      formSlug: "presentacion",
      finalizationIdentity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-f3-poll-failure",
      onStageChange: vi.fn(),
      onStatusContextChange: vi.fn(),
      responsePromise: new Promise<Response>(() => {}),
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValueOnce(
        jsonResponse(
          {
            status: "failed",
            stage: "drive.export_pdf",
            errorMessage: "Drive timeout",
            displayStage: "Generando PDF",
            displayMessage: "La publicacion fallo mientras generando PDF.",
            retryAction: "submit",
          },
          409
        )
      ),
      timeoutMs: 25,
      deadlineMs: 5_000,
      pollIntervalMs: 5_000,
    });

    const rejection = expect(resultPromise).rejects.toMatchObject({
      name: "FinalizationConfirmationError",
      retryAction: "submit",
      displayStage: "Generando PDF",
      displayMessage: "La publicacion fallo mientras generando PDF.",
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_failed_after_poll",
      expect.objectContaining({
        formSlug: "presentacion",
        requestHash: "hash-f3-poll-failure",
        pollAttempts: 1,
        stage: "drive.export_pdf",
        captureIssue: true,
      })
    );
  });
});
