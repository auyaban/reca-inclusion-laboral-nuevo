import { describe, expect, it, vi } from "vitest";
import {
  requestBatchReview,
  requestDirectBatchReview,
} from "@/lib/finalization/textReviewClient";

describe("textReviewClient", () => {
  it("parses reviewed items and sanitizes returned text", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        items: [{ id: "item_1", text: "  Texto corregido.  " }],
        usage: { model: "gpt-4.1-nano" },
      }),
    }));

    await expect(
      requestBatchReview({
        accessToken: "jwt",
        apikey: "apikey",
        fetchImpl: fetchImpl as never,
        functionUrl: "https://example.com/review",
        items: [{ id: "item_1", text: "texto original" }],
      })
    ).resolves.toEqual({
      items: [{ id: "item_1", text: "Texto corregido." }],
      usage: { model: "gpt-4.1-nano" },
    });
  });

  it("surfaces timeout when the response body aborts during json parsing", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      },
    }));

    await expect(
      requestBatchReview({
        accessToken: "jwt",
        apikey: "apikey",
        fetchImpl: fetchImpl as never,
        functionUrl: "https://example.com/review",
        items: [{ id: "item_1", text: "texto original" }],
      })
    ).rejects.toThrow("La revisión ortográfica excedió el tiempo límite.");
  });
  it("calls OpenAI Responses API directly and parses batch JSON", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          items: [{ id: "item_1", text: "Texto corregido." }],
        }),
      }),
    }));

    await expect(
      requestDirectBatchReview({
        apiKey: "sk-demo",
        fetchImpl: fetchImpl as never,
        model: "gpt-4.1-nano",
        items: [{ id: "item_1", text: "texto original" }],
      })
    ).resolves.toEqual({
      items: [{ id: "item_1", text: "Texto corregido." }],
      usage: { model: "gpt-4.1-nano" },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-demo",
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining('"model":"gpt-4.1-nano"'),
        cache: "no-store",
      })
    );
  });
});
