import { describe, expect, it, vi } from "vitest";
import { startInvalidSubmissionCheckpoint } from "@/lib/invalidSubmissionDraft";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe("startInvalidSubmissionCheckpoint", () => {
  it("returns immediately and promotes the draft when the checkpoint succeeds later", async () => {
    const deferred = createDeferred<{ ok: boolean; draftId?: string }>();
    const checkpoint = vi.fn().mockReturnValue(deferred.promise);
    const onPromoteDraft = vi.fn();
    const onError = vi.fn();

    const result = startInvalidSubmissionCheckpoint({
      checkpoint,
      currentDraftId: null,
      onPromoteDraft,
      onError,
    });

    expect(result).toBeUndefined();
    expect(checkpoint).toHaveBeenCalledOnce();
    expect(onPromoteDraft).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    deferred.resolve({ ok: true, draftId: "draft-promoted" });
    await deferred.promise;
    await Promise.resolve();

    expect(onPromoteDraft).toHaveBeenCalledWith("draft-promoted");
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not re-promote when the checkpoint keeps the same draft id", async () => {
    const checkpoint = vi.fn().mockResolvedValue({
      ok: true,
      draftId: "draft-current",
    });
    const onPromoteDraft = vi.fn();

    startInvalidSubmissionCheckpoint({
      checkpoint,
      currentDraftId: "draft-current",
      onPromoteDraft,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(onPromoteDraft).not.toHaveBeenCalled();
  });

  it("surfaces result errors from the checkpoint", async () => {
    const onError = vi.fn();

    startInvalidSubmissionCheckpoint({
      checkpoint: () =>
        Promise.resolve({
          ok: false,
          error: "No se pudo guardar el borrador automáticamente.",
        }),
      onError,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(
      "No se pudo guardar el borrador automáticamente."
    );
  });

  it("surfaces thrown errors with the fallback message", async () => {
    const onError = vi.fn();

    startInvalidSubmissionCheckpoint({
      checkpoint: () => Promise.reject(new Error("Fallo inesperado")),
      onError,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith("Fallo inesperado");
  });
});
