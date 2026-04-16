import { describe, expect, it, vi } from "vitest";
import {
  applyReviewedTargets,
  buildTextReviewBatches,
  extractTextReviewTargets,
  reviewFinalizationText,
  sanitizeTextReviewText,
} from "@/lib/finalization/textReview";

describe("textReview", () => {
  it("extracts only the configured reviewable fields for Condiciones de la Vacante", () => {
    const targets = extractTextReviewTargets("condiciones-vacante", {
      nombre_vacante: " Analista de inclusion ",
      modalidad_trabajo: "Presencial con ajustes",
      lugar_trabajo: "sede principal",
      requiere_certificado_observaciones: "  Debe tener soportes actualizados ",
      especificaciones_formacion: "bachiller tecnico",
      hora_ingreso: "7 am",
      dias_laborables: "de lunes a viernes",
      observaciones_recomendaciones: "mejorar accesos y pausas activas",
      observaciones_peligros: "",
      numero_vacantes: "2",
      nit_empresa: "900123456",
    });

    expect(targets).toEqual([
      {
        path: ["nombre_vacante"],
        text: "Analista de inclusion",
      },
      {
        path: ["modalidad_trabajo"],
        text: "Presencial con ajustes",
      },
      {
        path: ["lugar_trabajo"],
        text: "sede principal",
      },
      {
        path: ["requiere_certificado_observaciones"],
        text: "Debe tener soportes actualizados",
      },
      {
        path: ["especificaciones_formacion"],
        text: "bachiller tecnico",
      },
      {
        path: ["hora_ingreso"],
        text: "7 am",
      },
      {
        path: ["dias_laborables"],
        text: "de lunes a viernes",
      },
      {
        path: ["observaciones_recomendaciones"],
        text: "mejorar accesos y pausas activas",
      },
    ]);
  });

  it("builds batches respecting item and char limits", () => {
    const batches = buildTextReviewBatches(
      ["uno", "dos", "tres", "cuatro"],
      2,
      10
    );

    expect(batches).toEqual([
      {
        items: [
          { id: "item_1", text: "uno" },
          { id: "item_2", text: "dos" },
        ],
        totalChars: 6,
      },
      {
        items: [
          { id: "item_3", text: "tres" },
          { id: "item_4", text: "cuatro" },
        ],
        totalChars: 10,
      },
    ]);
  });

  it("applies reviewed text without mutating the original snapshot", () => {
    const original = {
      acuerdos_observaciones: "texto sin revisar",
      other: "estable",
    };

    const reviewed = applyReviewedTargets(original, [
      {
        path: ["acuerdos_observaciones"],
        text: "Texto sin revisar.",
      },
    ]);

    expect(reviewed).toEqual({
      acuerdos_observaciones: "Texto sin revisar.",
      other: "estable",
    });
    expect(original).toEqual({
      acuerdos_observaciones: "texto sin revisar",
      other: "estable",
    });
  });

  it("sanitizes text conservatively before and after review", () => {
    expect(
      sanitizeTextReviewText("  De lunes   a viernes\r\n\r\n\r\nPor definir  ")
    ).toBe("De lunes a viernes\n\nPor definir");
  });

  it("deduplicates repeated texts and reuses the reviewed result across targets", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        items: [
          { id: "item_1", text: "Texto corregido." },
          { id: "item_2", text: "Otra observación." },
        ],
        usage: { model: "gpt-4.1-nano" },
      }),
    }));

    const result = await reviewFinalizationText({
      formSlug: "condiciones_vacante",
      accessToken: "demo-jwt",
      apikey: "demo-publishable-key",
      functionUrl: "https://example.supabase.co/functions/v1/text-review-orthography",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      value: {
        requiere_certificado_observaciones: "texto repetido",
        especificaciones_formacion: "texto repetido",
        observaciones_recomendaciones: "otra observacion",
      },
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.status).toBe("reviewed");
    expect(result.reviewedCount).toBe(3);
    expect(result.value).toEqual({
      requiere_certificado_observaciones: "Texto corregido.",
      especificaciones_formacion: "Texto corregido.",
      observaciones_recomendaciones: "Otra observación.",
    });
    expect(result.usage).toEqual({
      model: "gpt-4.1-nano",
      uniqueTexts: 2,
      batches: 1,
    });
  });

  it("skips gracefully when there is no authenticated access token", async () => {
    const result = await reviewFinalizationText({
      formSlug: "presentacion",
      accessToken: "",
      apikey: "demo-publishable-key",
      functionUrl: "https://example.supabase.co/functions/v1/text-review-orthography",
      value: {
        acuerdos_observaciones: "texto pendiente",
      },
    });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "missing_access_token",
      reviewedCount: 0,
      value: {
        acuerdos_observaciones: "texto pendiente",
      },
    });
  });

  it("returns the original snapshot when the edge review fails", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({
        ok: false,
        error: {
          message: "OpenAI no respondió correctamente.",
        },
      }),
    }));

    const result = await reviewFinalizationText({
      formSlug: "sensibilizacion",
      accessToken: "demo-jwt",
      apikey: "demo-publishable-key",
      functionUrl: "https://example.supabase.co/functions/v1/text-review-orthography",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      value: {
        observaciones: "texto sin cambios",
      },
    });

    expect(result).toMatchObject({
      status: "failed",
      reason: "OpenAI no respondió correctamente.",
      reviewedCount: 0,
      value: {
        observaciones: "texto sin cambios",
      },
    });
  });
  it("aborts the edge review request after the configured timeout", async () => {
    vi.useFakeTimers();
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockImplementation(
      (timeoutMs: number) => {
        const controller = new AbortController();
        setTimeout(() => {
          controller.abort();
        }, timeoutMs);
        return controller.signal;
      }
    );
    try {
      const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        const signal = init?.signal;
        return new Promise<Response>((_resolve, reject) => {
          if (!signal) {
            reject(new Error("missing signal"));
            return;
          }

          if (signal.aborted) {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            return;
          }

          signal.addEventListener(
            "abort",
            () => {
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            },
            { once: true }
          );
        });
      });

      const promise = reviewFinalizationText({
        formSlug: "sensibilizacion",
        accessToken: "demo-jwt",
        apikey: "demo-publishable-key",
        functionUrl:
          "https://example.supabase.co/functions/v1/text-review-orthography",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        value: {
          observaciones: "texto largo con tildes faltantes",
        },
      });

      await vi.advanceTimersByTimeAsync(15_000);
      const result = await promise;

      expect(fetchImpl).toHaveBeenCalledOnce();
      expect(result).toMatchObject({
        status: "failed",
        reason: "La revisión ortográfica excedió el tiempo límite.",
        reviewedCount: 0,
      });

      const init = fetchImpl.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(init?.signal).toBeDefined();
      expect((init?.signal as AbortSignal | undefined)?.aborted).toBe(true);
    } finally {
      timeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
