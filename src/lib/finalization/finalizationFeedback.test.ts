import { beforeEach, describe, expect, it, vi } from "vitest";
import { markFinalizationRequestSucceededSafely } from "@/lib/finalization/finalizationFeedback";

const mocks = vi.hoisted(() => ({
  markFinalizationRequestFailed: vi.fn(),
  markFinalizationRequestSucceeded: vi.fn(),
}));

vi.mock("@/lib/finalization/requests", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/finalization/requests")>();

  return {
    ...actual,
    markFinalizationRequestFailed: mocks.markFinalizationRequestFailed,
    markFinalizationRequestSucceeded: mocks.markFinalizationRequestSucceeded,
  };
});

describe("finalization feedback helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs identity duplicate violations explicitly when marking succeeded fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const duplicateError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    mocks.markFinalizationRequestSucceeded.mockRejectedValue(duplicateError);

    try {
      await markFinalizationRequestSucceededSafely({
        supabase: {} as never,
        idempotencyKey: "idempotency-1",
        userId: "user-1",
        stage: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: "https://sheet",
        },
        source: "presentacion",
      });

      expect(errorSpy).toHaveBeenCalledWith(
        "[finalization.duplicate_succeeded_by_identity]",
        expect.objectContaining({
          error: duplicateError,
          stage: "succeeded",
          idempotencyKey: "idempotency-1",
          userId: "user-1",
        })
      );
      expect(errorSpy).toHaveBeenCalledWith(
        "[presentacion] failed_to_mark_succeeded",
        expect.objectContaining({
          error: duplicateError,
          errorCode: "23505",
          stage: "succeeded",
          idempotencyKey: "idempotency-1",
          userId: "user-1",
        })
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
