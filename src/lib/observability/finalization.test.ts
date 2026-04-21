import { afterEach, describe, expect, it, vi } from "vitest";

const {
  captureExceptionMock,
  captureMessageMock,
  addBreadcrumbMock,
} = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  captureMessageMock: vi.fn(),
  addBreadcrumbMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
  addBreadcrumb: addBreadcrumbMock,
}));

import {
  reportFinalizationConfirmationEvent,
  reportFinalizationEvent,
} from "@/lib/observability/finalization";

describe("finalization observability", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs non-error lifecycle events without opening Sentry issues", () => {
    reportFinalizationEvent("started", {
      requestId: "req-1",
      formSlug: "presentacion",
      durationMs: 0,
      stepCount: 0,
      lastStep: null,
    });

    expect(addBreadcrumbMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "finalization",
        level: "info",
        message: "[finalization] started",
        data: expect.objectContaining({
          domain: "finalization",
          finalization_event: "started",
          form_slug: "presentacion",
        }),
      })
    );
    expect(captureMessageMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("captures unresolved confirmation timeouts as warnings", () => {
    reportFinalizationConfirmationEvent("confirmation_timeout_started", {
      formSlug: "presentacion",
      requestHash: "hash-1",
      pollAttempts: 0,
    });
    reportFinalizationConfirmationEvent("confirmation_timeout_unresolved", {
      formSlug: "presentacion",
      requestHash: "hash-1",
      pollAttempts: 5,
      stage: "confirming.unknown",
    });

    expect(addBreadcrumbMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message: "[finalization] confirmation_timeout_started",
        level: "info",
      })
    );
    expect(addBreadcrumbMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        message: "[finalization] confirmation_timeout_unresolved",
        level: "warning",
      })
    );
    expect(captureMessageMock).toHaveBeenCalledOnce();
    expect(captureMessageMock).toHaveBeenCalledWith(
      "[finalization] confirmation_timeout_unresolved",
      expect.objectContaining({
        level: "warning",
        tags: expect.objectContaining({
          finalization_confirmation_event: "confirmation_timeout_unresolved",
          form_slug: "presentacion",
        }),
        extra: expect.objectContaining({
          requestHash: "hash-1",
          pollAttempts: 5,
          stage: "confirming.unknown",
        }),
      })
    );
  });

  it("captures confirmation failures after polling as actionable errors", () => {
    reportFinalizationConfirmationEvent("confirmation_failed_after_poll", {
      formSlug: "evaluacion",
      requestHash: "hash-2",
      pollAttempts: 3,
      stage: "confirming.failed",
    });

    expect(addBreadcrumbMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "[finalization] confirmation_failed_after_poll",
        level: "warning",
      })
    );
    expect(captureMessageMock).toHaveBeenCalledWith(
      "[finalization] confirmation_failed_after_poll",
      expect.objectContaining({
        level: "error",
        tags: expect.objectContaining({
          finalization_confirmation_event: "confirmation_failed_after_poll",
          form_slug: "evaluacion",
        }),
        extra: expect.objectContaining({
          requestHash: "hash-2",
          pollAttempts: 3,
          stage: "confirming.failed",
        }),
      })
    );
  });

  it("normalizes non-Error objects before sending them to Sentry", () => {
    reportFinalizationEvent(
      "failed",
      {
        requestId: "req-2",
        formSlug: "presentacion",
        durationMs: 1000,
        stepCount: 3,
        lastStep: "supabase.insert_finalized",
      },
      {
        message: "Forbidden",
        details: "new row violates row-level security policy",
        hint: "Check insert policy",
        code: "42501",
        status: 403,
      }
    );

    expect(addBreadcrumbMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "[finalization] failed",
        level: "error",
        data: expect.objectContaining({
          errorMessage: "Forbidden",
          errorCode: "42501",
          errorStatusCode: 403,
        }),
      })
    );
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Forbidden",
        name: "NonErrorObject",
      }),
      expect.objectContaining({
        extra: expect.objectContaining({
          errorMessage: "Forbidden",
          errorDetails: "new row violates row-level security policy",
          errorHint: "Check insert policy",
          errorCode: "42501",
          errorStatusCode: 403,
        }),
      })
    );
  });
});
