import { getTextReviewRequestTimeoutMs } from "@/lib/finalization/textReviewConfig";
import { sanitizeTextReviewText } from "@/lib/finalization/textReviewFields";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const LIST_FORMATTING_PROMPT_SUFFIX =
  "Si el texto ya representa una enumeracion evidente, por ejemplo marcadores numerados, " +
  "items en lineas separadas, una frase introductoria terminada en dos puntos seguida de varias lineas cortas, " +
  "o elementos claramente separados por punto y coma, puedes " +
  "devolverlo como lista simple en texto plano usando prefijos '- '. " +
  "Hazlo solo cuando la estructura enumerativa sea inequivoca y no haya riesgo de convertir " +
  "un parrafo normal en lista. Si no es inequivoco, conserva el formato original.";

const BATCH_REVIEW_PROMPT =
  "Corrige solo ortografia, tildes, signos de puntuacion y uso basico de mayusculas/minusculas. " +
  'Recibiras un JSON con este formato exacto: {"items":[{"id":"...","text":"..."}]}. ' +
  "Corrige cada campo text por separado, sin mezclar items entre si. " +
  "No resumas, no reformules, no cambies el tono, no inventes informacion y no alteres el sentido del texto. " +
  "No cambies nombres propios, numeros, correos, URLs, siglas, articulos legales, referencias normativas, codigos, " +
  "ni el formato general de listas o parrafos. " +
  `${LIST_FORMATTING_PROMPT_SUFFIX} ` +
  'Devuelve exclusivamente JSON valido con este mismo formato: {"items":[{"id":"...","text":"texto corregido"}]}. ' +
  "Manten exactamente los mismos ids y la misma cantidad de items. No agregues markdown ni explicaciones.";

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

function extractOutputText(payload: unknown): string {
  const direct =
    typeof (payload as { output_text?: unknown } | null)?.output_text === "string"
      ? ((payload as { output_text: string }).output_text).trim()
      : "";
  if (direct) return direct;

  const output = Array.isArray((payload as { output?: unknown } | null)?.output)
    ? ((payload as { output: unknown[] }).output ?? [])
    : [];
  const chunks: string[] = [];

  for (const item of output) {
    const content = Array.isArray((item as { content?: unknown } | null)?.content)
      ? ((item as { content: unknown[] }).content ?? [])
      : [];
    for (const part of content) {
      if (
        (part as { type?: unknown } | null)?.type === "output_text" ||
        (part as { type?: unknown } | null)?.type === "text"
      ) {
        const text = String((part as { text?: unknown })?.text ?? "").trim();
        if (text) chunks.push(text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function stripCodeFences(text: string): string {
  const value = String(text ?? "").trim();
  if (!value.startsWith("```")) return value;

  const lines = value.split(/\r?\n/);
  if (lines.length && lines[0].trim().startsWith("```")) lines.shift();
  if (lines.length && lines[lines.length - 1].trim().startsWith("```")) {
    lines.pop();
  }

  return lines.join("\n").trim();
}

function extractJsonCandidate(text: string): string {
  const value = stripCodeFences(text);
  if (value.startsWith("{") && value.endsWith("}")) return value;

  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start !== -1 && end > start) return value.slice(start, end + 1);

  return value;
}

function parseReviewedItems(
  payload: Pick<ReviewEdgePayload, "items">,
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

function parseDirectReviewedItems(text: string, expectedIds: readonly string[]) {
  const parsed = JSON.parse(extractJsonCandidate(text)) as ReviewEdgePayload;
  return parseReviewedItems(parsed, expectedIds);
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

export async function requestDirectBatchReview({
  apiKey,
  items,
  fetchImpl,
  model,
  timeoutMs = getTextReviewRequestTimeoutMs(),
}: {
  apiKey: string;
  items: { id: string; text: string }[];
  fetchImpl: typeof fetch;
  model: string;
  timeoutMs?: number;
}) {
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;

  try {
    response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: BATCH_REVIEW_PROMPT,
        input: JSON.stringify({ items }),
      }),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      throw new Error("La revision ortografica excedio el tiempo limite.");
    }

    throw new Error("No fue posible conectar con OpenAI.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch (jsonError) {
    if (signal.aborted || isAbortError(jsonError)) {
      throw new Error("La revision ortografica excedio el tiempo limite.");
    }
  }

  if (!response.ok) {
    const message =
      typeof (payload as { error?: { message?: unknown }; message?: unknown } | null)
        ?.error?.message === "string"
        ? String(
            (payload as { error: { message: string } }).error.message
          ).trim()
        : typeof (payload as { message?: unknown } | null)?.message === "string"
          ? String((payload as { message: string }).message).trim()
          : "";
    throw new Error(message || `OpenAI error ${response.status}`);
  }

  const reviewedText = extractOutputText(payload);
  if (!reviewedText) {
    throw new Error("OpenAI no devolvio texto corregido.");
  }

  return {
    items: parseDirectReviewedItems(
      reviewedText,
      items.map((item) => item.id)
    ),
    usage: { model },
  };
}
