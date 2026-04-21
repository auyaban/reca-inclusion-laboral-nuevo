import { afterEach, describe, expect, it, vi } from "vitest";

const { reportFinalizationConfirmationEventMock } = vi.hoisted(() => ({
  reportFinalizationConfirmationEventMock: vi.fn(),
}));

vi.mock("@/lib/observability/finalization", () => ({
  reportFinalizationConfirmationEvent: reportFinalizationConfirmationEventMock,
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

describe("waitForFinalizationConfirmation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
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
});
