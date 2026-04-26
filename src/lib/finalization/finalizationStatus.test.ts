import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  readFinalizationRequestMock,
  readLatestFinalizationRequestByIdentityMock,
  markFinalizationRequestSucceededMock,
  getProcessingRetryAfterSecondsMock,
} = vi.hoisted(() => ({
  readFinalizationRequestMock: vi.fn(),
  readLatestFinalizationRequestByIdentityMock: vi.fn(),
  markFinalizationRequestSucceededMock: vi.fn(),
  getProcessingRetryAfterSecondsMock: vi.fn(),
}));

vi.mock("@/lib/finalization/requests", () => ({
  readFinalizationRequest: readFinalizationRequestMock,
  readLatestFinalizationRequestByIdentity:
    readLatestFinalizationRequestByIdentityMock,
  markFinalizationRequestSucceeded: markFinalizationRequestSucceededMock,
  getProcessingRetryAfterSeconds: getProcessingRetryAfterSecondsMock,
}));

import {
  buildFinalizationStatusIdempotencyKey,
  resolvePersistedFinalizationStatus,
  type FinalizedRecordsSupabaseClient,
} from "@/lib/finalization/finalizationStatus";
import { buildInduccionOrganizacionalIdempotencyKey } from "@/lib/finalization/induccionOrganizacionalRequest";

function createFinalizedRecordsSupabaseMock(
  record: Record<string, unknown> | null
): FinalizedRecordsSupabaseClient {
  const query = {
    contains: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: record, error: null }),
  };

  return {
    query,
    from: vi.fn(() => ({
      select: vi.fn(() => query),
    })),
  } as unknown as FinalizedRecordsSupabaseClient;
}

describe("resolvePersistedFinalizationStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProcessingRetryAfterSecondsMock.mockReturnValue(17);
    readLatestFinalizationRequestByIdentityMock.mockResolvedValue(null);
  });

  it("replays a succeeded request when response_payload is already persisted", async () => {
    readFinalizationRequestMock.mockResolvedValue({
      status: "succeeded",
      stage: "succeeded",
      response_payload: {
        success: true,
        sheetLink: "https://example.com/sheet",
        pdfLink: "https://example.com/pdf",
      },
    });
    const supabase = createFinalizedRecordsSupabaseMock(null);

    const result = await resolvePersistedFinalizationStatus({
      supabase,
      userId: "user-1",
      formSlug: "presentacion",
      idempotencyKey: "idem-1",
    });

    expect(result).toEqual({
      status: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/sheet",
        pdfLink: "https://example.com/pdf",
      },
      recovered: false,
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
  });

  it("enriches a succeeded request with pdfLink from external artifacts when response_payload is missing it", async () => {
    readFinalizationRequestMock.mockResolvedValue({
      status: "succeeded",
      stage: "succeeded",
      response_payload: {
        success: true,
        sheetLink: "https://example.com/sheet",
      },
      external_artifacts: {
        pdfLink: "https://example.com/external.pdf",
      },
    });
    const supabase = createFinalizedRecordsSupabaseMock(null);

    const result = await resolvePersistedFinalizationStatus({
      supabase,
      userId: "user-1",
      formSlug: "induccion-organizacional",
      idempotencyKey: "idem-1",
    });

    expect(result).toEqual({
      status: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/sheet",
        pdfLink: "https://example.com/external.pdf",
      },
      recovered: false,
    });
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith({
      supabase,
      idempotencyKey: "idem-1",
      userId: "user-1",
      stage: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/sheet",
        pdfLink: "https://example.com/external.pdf",
      },
    });
  });

  it("recovers a processing request from formatos_finalizados_il and backfills the request row", async () => {
    readFinalizationRequestMock.mockResolvedValue({
      status: "processing",
      stage: "supabase.insert_finalized",
      response_payload: null,
      updated_at: "2026-04-16T20:00:00.000Z",
      last_error: null,
    });
    const supabase = createFinalizedRecordsSupabaseMock({
      path_formato: "https://example.com/sheet",
      payload_normalized: {
        parsed_raw: {
          pdf_link: "https://example.com/pdf",
        },
      },
      payload_generated_at: "2026-04-16T20:01:00.000Z",
    });

    const result = await resolvePersistedFinalizationStatus({
      supabase,
      userId: "user-1",
      formSlug: "presentacion",
      idempotencyKey: "idem-1",
    });

    expect(result).toEqual({
      status: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/sheet",
        pdfLink: "https://example.com/pdf",
      },
      recovered: true,
    });
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith({
      supabase,
      idempotencyKey: "idem-1",
      userId: "user-1",
      stage: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/sheet",
        pdfLink: "https://example.com/pdf",
      },
    });
  });

  it("recovers a failed request when a finalized record already exists", async () => {
    readFinalizationRequestMock.mockResolvedValue({
      status: "failed",
      stage: "confirming.persisted_record_written",
      response_payload: null,
      updated_at: "2026-04-16T20:00:00.000Z",
      last_error: "rename failed",
    });
    const supabase = createFinalizedRecordsSupabaseMock({
      path_formato: "https://example.com/recovered-sheet",
      payload_normalized: {
        parsed_raw: {
          pdf_link: "https://example.com/recovered.pdf",
        },
      },
      payload_generated_at: "2026-04-16T20:01:00.000Z",
    });

    const result = await resolvePersistedFinalizationStatus({
      supabase,
      userId: "user-1",
      formSlug: "presentacion",
      idempotencyKey: "idem-1",
    });

    expect(result).toEqual({
      status: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/recovered-sheet",
        pdfLink: "https://example.com/recovered.pdf",
      },
      recovered: true,
    });
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith({
      supabase,
      idempotencyKey: "idem-1",
      userId: "user-1",
      stage: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/recovered-sheet",
        pdfLink: "https://example.com/recovered.pdf",
      },
    });
  });

  it("keeps the request as processing when there is no finalized record yet", async () => {
    readFinalizationRequestMock.mockResolvedValue({
      status: "processing",
      stage: "drive.export_pdf",
      response_payload: null,
      updated_at: "2026-04-16T20:00:00.000Z",
      last_error: null,
    });
    const supabase = createFinalizedRecordsSupabaseMock(null);

    const result = await resolvePersistedFinalizationStatus({
      supabase,
      userId: "user-1",
      formSlug: "presentacion",
      idempotencyKey: "idem-1",
    });

    expect(result).toEqual({
      status: "processing",
      stage: "drive.export_pdf",
      displayStage: "Generando PDF",
      displayMessage: "Estamos trabajando en: Generando PDF.",
      retryAction: "check_status",
      retryAfterSeconds: 17,
    });
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
  });

  it("recovers a succeeded request without pdfLink when only the sheet link exists", async () => {
    readFinalizationRequestMock.mockResolvedValue({
      status: "succeeded",
      stage: "succeeded",
      response_payload: null,
      updated_at: "2026-04-16T20:00:00.000Z",
      last_error: null,
    });
    const supabase = createFinalizedRecordsSupabaseMock({
      path_formato: "https://example.com/sheet-only",
      payload_normalized: {
        parsed_raw: {},
      },
      payload_generated_at: "2026-04-16T20:01:00.000Z",
    });

    const result = await resolvePersistedFinalizationStatus({
      supabase,
      userId: "user-1",
      formSlug: "sensibilizacion",
      idempotencyKey: "idem-1",
    });

    expect(result).toEqual({
      status: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/sheet-only",
      },
      recovered: true,
    });
  });

  it("falls back to the latest identity-matched request when the exact request hash is missing", async () => {
    readFinalizationRequestMock.mockResolvedValue(null);
    readLatestFinalizationRequestByIdentityMock.mockResolvedValue({
      idempotency_key: "idem-derived",
      status: "processing",
      stage: "supabase.insert_finalized",
      response_payload: null,
      updated_at: "2026-04-16T20:00:00.000Z",
      last_error: null,
    });
    const supabase = createFinalizedRecordsSupabaseMock({
      path_formato: "https://example.com/derived-sheet",
      payload_normalized: {
        parsed_raw: {
          pdf_link: "https://example.com/derived.pdf",
        },
      },
      payload_generated_at: "2026-04-16T20:01:00.000Z",
    });

    const result = await resolvePersistedFinalizationStatus({
      supabase,
      userId: "user-1",
      formSlug: "condiciones-vacante",
      idempotencyKey: "idem-client",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
    });

    expect(readLatestFinalizationRequestByIdentityMock).toHaveBeenCalledWith({
      supabase,
      formSlug: "condiciones-vacante",
      userId: "user-1",
      identityKey: "draft-1",
    });
    expect(result).toEqual({
      status: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/derived-sheet",
        pdfLink: "https://example.com/derived.pdf",
      },
      recovered: true,
    });
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith({
      supabase,
      idempotencyKey: "idem-derived",
      userId: "user-1",
      stage: "succeeded",
      responsePayload: {
        success: true,
        sheetLink: "https://example.com/derived-sheet",
        pdfLink: "https://example.com/derived.pdf",
      },
    });
  });

  it("builds induction idempotency keys through the shared registry path", () => {
    const options = {
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-1",
    };

    expect(
      buildFinalizationStatusIdempotencyKey({
        formSlug: "induccion-organizacional",
        ...options,
      })
    ).toBe(buildInduccionOrganizacionalIdempotencyKey(options));
  });
});
