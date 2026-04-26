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
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(reportFinalizationConfirmationEventMock).toHaveBeenCalledWith(
      "confirmation_timeout_unresolved",
      expect.objectContaining({
        formSlug: "induccion-organizacional",
        requestHash: "hash-poll-failures",
        pollAttempts: 2,
        pollTransientFailures: 2,
      })
    );
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
    expect(fetchImpl).toHaveBeenCalledTimes(2);
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
});
