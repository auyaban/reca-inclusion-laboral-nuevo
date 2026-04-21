import { describe, expect, it, vi } from "vitest";
import {
  createEmptyDraftGooglePrewarmState,
  markDraftGooglePrewarmStatus,
} from "@/lib/drafts/serverDraftPrewarm";

describe("markDraftGooglePrewarmStatus", () => {
  it("uses baseState without reading the draft again", async () => {
    const selectSpy = vi.fn();
    const maybeSingleSpy = vi.fn().mockResolvedValue({
      data: {
        id: "draft-1",
        google_prewarm_status: "finalized",
        google_prewarm_updated_at: "2026-04-20T12:00:00.000Z",
        google_prewarm_lease_owner: null,
        google_prewarm_lease_expires_at: null,
        google_prewarm: {
          ...createEmptyDraftGooglePrewarmState(),
          folderId: "folder-1",
          spreadsheetId: "sheet-1",
          status: "finalized",
        },
      },
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: selectSpy,
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleSpy,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await markDraftGooglePrewarmStatus({
      supabase: supabase as never,
      draftId: "draft-1",
      userId: "user-1",
      status: "finalized",
      baseState: {
        ...createEmptyDraftGooglePrewarmState(),
        folderId: "folder-1",
        spreadsheetId: "sheet-1",
        status: "ready",
      },
      statePatch: {
        lastError: null,
      },
    });

    expect(selectSpy).not.toHaveBeenCalled();
    expect(maybeSingleSpy).toHaveBeenCalledOnce();
    expect(result?.state.status).toBe("finalized");
  });
});
