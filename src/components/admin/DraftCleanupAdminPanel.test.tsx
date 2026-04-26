// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DraftCleanupAdminPanel } from "@/components/admin/DraftCleanupAdminPanel";

const pendingDraft = {
  id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
  userId: "user-1",
  formSlug: "evaluacion",
  deletedAt: "2026-04-20T11:00:00.000Z",
  googlePrewarmCleanupStatus: "pending",
  googlePrewarmCleanupError: "timeout previo",
  spreadsheetId: "sheet-1",
};

const purgeableDraft = {
  id: "4f255e78-b0c7-4b8e-8a58-7fd385366e4b",
  userId: "user-2",
  formSlug: "presentacion",
  deletedAt: "2026-03-20T11:00:00.000Z",
  googlePrewarmCleanupStatus: "trashed",
  googlePrewarmCleanupError: null,
  spreadsheetId: "sheet-2",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("DraftCleanupAdminPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === "POST") {
          return Promise.resolve(
            jsonResponse({
              success: true,
              matched: 1,
              processed: 1,
              remainingEstimate: 0,
              stoppedEarly: false,
              results: [],
            })
          );
        }

        if (init?.method === "DELETE") {
          return Promise.resolve(
            jsonResponse({
              success: true,
              matched: 1,
              purged: 1,
              drafts: [],
            })
          );
        }

        return Promise.resolve(
          jsonResponse({
            success: true,
            drafts: url.includes("view=purgeable")
              ? [purgeableDraft]
              : [pendingDraft],
          })
        );
      })
    );
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads pending cleanup drafts and retries a selected draft", async () => {
    render(<DraftCleanupAdminPanel />);

    expect(
      await screen.findByText(/Vista global de borradores soft-deleted elegibles/)
    ).toBeTruthy();
    expect(await screen.findByText("evaluacion")).toBeTruthy();
    expect(screen.getByText("Usuario / owner")).toBeTruthy();
    expect(screen.getByText("user-1")).toBeTruthy();
    expect(screen.getByText("timeout previo")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Seleccionar 3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: /Reintentar seleccionados/ }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/draft-cleanup",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ draftIds: [pendingDraft.id] }),
        })
      );
    });
    expect(await screen.findByText(/matched 1/)).toBeTruthy();
  });

  it("retries only the first safe batch from the visible global list", async () => {
    render(<DraftCleanupAdminPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Reintentar primeras 1" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/draft-cleanup",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ limit: 1 }),
        })
      );
    });
  });

  it("switches to purgeable view and purges selected drafts with confirmation", async () => {
    render(<DraftCleanupAdminPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Purgables" }));
    expect(await screen.findByText("presentacion")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Seleccionar 4f255e78-b0c7-4b8e-8a58-7fd385366e4b",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: /Purgar seleccionados/ }));

    await waitFor(() => {
      expect(globalThis.confirm).toHaveBeenCalled();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/draft-cleanup",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({
            confirm: "PURGE_SOFT_DELETED_DRAFTS",
            draftIds: [purgeableDraft.id],
          }),
        })
      );
    });
    expect(await screen.findByText(/purged 1/)).toBeTruthy();
  });

  it("shows an explicit global empty state for pending cleanup drafts", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({
        success: true,
        drafts: [],
      })
    );

    render(<DraftCleanupAdminPanel />);

    expect(
      await screen.findByText(
        "No hay borradores globales pending/failed elegibles para cleanup."
      )
    ).toBeTruthy();
  });

  it("shows an explicit global empty state for purgeable drafts", async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      return Promise.resolve(
        jsonResponse({
          success: true,
          drafts: url.includes("view=purgeable") ? [] : [pendingDraft],
        })
      );
    });

    render(<DraftCleanupAdminPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Purgables" }));

    expect(
      await screen.findByText("No hay borradores globales purgables elegibles.")
    ).toBeTruthy();
  });
});
