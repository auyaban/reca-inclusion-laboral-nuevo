import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
  buildFinalizationStatusIdempotencyKeyMock,
  resolvePersistedFinalizationStatusMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  buildFinalizationStatusIdempotencyKeyMock: vi.fn(),
  resolvePersistedFinalizationStatusMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/finalization/finalizationStatus", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/finalization/finalizationStatus")
  >("@/lib/finalization/finalizationStatus");

  return {
    ...actual,
    buildFinalizationStatusIdempotencyKey:
      buildFinalizationStatusIdempotencyKeyMock,
    resolvePersistedFinalizationStatus: resolvePersistedFinalizationStatusMock,
  };
});

import { POST } from "@/app/api/formularios/finalization-status/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/finalization-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildValidBody() {
  return {
    formSlug: "presentacion",
    finalization_identity: {
      draft_id: "draft-1",
      local_draft_session_id: "session-1",
    },
    requestHash: "hash-1",
  };
}

describe("POST /api/formularios/finalization-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });

    buildFinalizationStatusIdempotencyKeyMock.mockReturnValue("idem-1");
  });

  it("returns 200 when the finalization already succeeded", async () => {
    resolvePersistedFinalizationStatusMock.mockResolvedValue({
      status: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/sheet",
      },
      recovered: true,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/sheet",
      },
      recovered: true,
    });
    expect(buildFinalizationStatusIdempotencyKeyMock).toHaveBeenCalledWith({
      formSlug: "presentacion",
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-1",
    });
    expect(resolvePersistedFinalizationStatusMock).toHaveBeenCalledWith({
      supabase: await createClientMock.mock.results[0]?.value,
      userId: "user-1",
      formSlug: "presentacion",
      idempotencyKey: "idem-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
    });
  });

  it("returns 202 while the finalization is still processing", async () => {
    resolvePersistedFinalizationStatusMock.mockResolvedValue({
      status: "processing",
      stage: "drive.export_pdf",
      displayStage: "Generando PDF",
      displayMessage: "Estamos trabajando en: Generando PDF.",
      retryAction: "check_status",
      retryAfterSeconds: 5,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      status: "processing",
      stage: "drive.export_pdf",
      displayStage: "Generando PDF",
      displayMessage: "Estamos trabajando en: Generando PDF.",
      retryAction: "check_status",
      retryAfterSeconds: 5,
    });
  });

  it("returns 409 when the finalization failed", async () => {
    resolvePersistedFinalizationStatusMock.mockResolvedValue({
      status: "failed",
      stage: "drive.export_pdf",
      errorMessage: "No se pudo confirmar la publicacion.",
      displayStage: "Generando PDF",
      displayMessage: "La publicacion fallo mientras generando PDF.",
      retryAction: "submit",
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: "failed",
      stage: "drive.export_pdf",
      errorMessage: "No se pudo confirmar la publicacion.",
      displayStage: "Generando PDF",
      displayMessage: "La publicacion fallo mientras generando PDF.",
      retryAction: "submit",
    });
  });

  it("returns 404 when no matching finalization exists", async () => {
    resolvePersistedFinalizationStatusMock.mockResolvedValue({
      status: "not_found",
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      status: "not_found",
    });
  });
});
