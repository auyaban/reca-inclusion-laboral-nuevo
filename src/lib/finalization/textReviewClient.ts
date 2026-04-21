import { getTextReviewRequestTimeoutMs } from "@/lib/finalization/textReviewConfig";
import { sanitizeTextReviewText } from "@/lib/finalization/textReviewFields";

type ReviewEdgePayload = {
  ok?: boolean;
  items?: { id?: string; text?: string }[];
  usage?: {
    model?: string;
  };
  error?: {
    message?: string;
  };
  message?: string;
};

function getReviewErrorMessage(payload: ReviewEdgePayload | null, fallback: string) {
  const nested = payload?.error?.message?.trim();
  if (nested) {
    return nested;
  }

  const direct = payload?.message?.trim();
  if (direct) {
    return direct;
  }

  return fallback;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === "AbortError" || error.name === "TimeoutError"
    : typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (((error as { name?: unknown }).name === "AbortError") ||
          (error as { name?: unknown }).name === "TimeoutError");
}

function parseReviewedItems(
  payload: ReviewEdgePayload,
  expectedIds: readonly string[]
) {
  const items = Array.isArray(payload.items) ? payload.items : null;
  if (!items) {
    throw new Error("La revisión ortográfica no devolvió items válidos.");
  }

  const expectedSet = new Set(expectedIds);
  const reviewedMap = new Map<string, string>();

  for (const item of items) {
    const itemId = String(item?.id ?? "").trim();
    if (!itemId || !expectedSet.has(itemId)) {
      throw new Error("La revisión ortográfica devolvió ids inesperados.");
    }
    if (reviewedMap.has(itemId)) {
      throw new Error("La revisión ortográfica devolvió ids duplicados.");
    }

    reviewedMap.set(itemId, sanitizeTextReviewText(item?.text ?? ""));
  }

  for (const itemId of expectedIds) {
    if (!reviewedMap.has(itemId)) {
      throw new Error(
        "La revisión ortográfica no devolvió todos los items esperados."
      );
    }
  }

  return expectedIds.map((id) => ({
    id,
    text: reviewedMap.get(id) ?? "",
  }));
}

export async function requestBatchReview({
  accessToken,
  items,
  fetchImpl,
  functionUrl,
  apikey,
  model,
  timeoutMs = getTextReviewRequestTimeoutMs(),
}: {
  accessToken: string;
  items: { id: string; text: string }[];
  fetchImpl: typeof fetch;
  functionUrl: string;
  apikey: string;
  model?: string;
  timeoutMs?: number;
}) {
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;

  try {
    response = await fetchImpl(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey,
      },
      body: JSON.stringify(model ? { items, model } : { items }),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      throw new Error("La revisión ortográfica excedió el tiempo límite.");
    }

    throw new Error("No fue posible conectar con la revisión ortográfica.");
  }

  let payload: ReviewEdgePayload | null = null;
  try {
    payload = (await response.json()) as ReviewEdgePayload;
  } catch (jsonError) {
    if (signal.aborted || isAbortError(jsonError)) {
      throw new Error("La revisión ortográfica excedió el tiempo límite.");
    }
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(
      getReviewErrorMessage(
        payload,
        `La revisión ortográfica falló (${response.status}).`
      )
    );
  }

  return {
    items: parseReviewedItems(
      payload,
      items.map((item) => item.id)
    ),
    usage: payload.usage,
  };
}
