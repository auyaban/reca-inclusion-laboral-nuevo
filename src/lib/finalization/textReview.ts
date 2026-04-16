import { getSupabaseFunctionUrl } from "@/lib/supabase/functions";

type TextReviewPathPart = string | number;

export type TextReviewTarget = {
  path: TextReviewPathPart[];
  text: string;
};

export type TextReviewBatch = {
  items: { id: string; text: string }[];
  totalChars: number;
};

export type TextReviewStatus = "reviewed" | "skipped" | "failed";

export type TextReviewResult<TValue> = {
  status: TextReviewStatus;
  value: TValue;
  reason: string;
  reviewedCount: number;
  usage?: {
    model?: string;
    uniqueTexts: number;
    batches: number;
  };
};

type ReviewFormSlug =
  | "presentacion"
  | "sensibilizacion"
  | "seleccion"
  | "contratacion"
  | "condiciones_vacante";

type ReviewOptions<TValue> = {
  accessToken?: string | null;
  fetchImpl?: typeof fetch;
  functionUrl?: string;
  functionName?: string;
  apikey?: string;
  value: TValue;
  formSlug: string;
  model?: string;
};

type ReviewEdgePayload = {
  ok?: boolean;
  text?: string;
  items?: { id?: string; text?: string }[];
  usage?: {
    model?: string;
  };
  error?: {
    message?: string;
  };
  message?: string;
};

const DEFAULT_FUNCTION_NAME = "text-review-orthography";
const DEFAULT_MODEL = "gpt-4.1-nano";
const DEFAULT_MAX_TEXT_CHARS = 6000;
const DEFAULT_BATCH_MAX_ITEMS = 8;
const DEFAULT_BATCH_MAX_CHARS = 12000;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

const FORM_ALIASES: Record<string, ReviewFormSlug> = {
  presentacion: "presentacion",
  presentacion_programa: "presentacion",
  sensibilizacion: "sensibilizacion",
  seleccion: "seleccion",
  seleccion_incluyente: "seleccion",
  contratacion: "contratacion",
  contratacion_incluyente: "contratacion",
  "condiciones-vacante": "condiciones_vacante",
  condiciones_vacante: "condiciones_vacante",
  condiciones_vacante_labs: "condiciones_vacante",
};

const REVIEW_FIELDS_BY_FORM: Record<ReviewFormSlug, TextReviewPathPart[][]> = {
  presentacion: [["acuerdos_observaciones"]],
  sensibilizacion: [["observaciones"]],
  seleccion: [["desarrollo_actividad"], ["ajustes_recomendaciones"], ["nota"]],
  contratacion: [["desarrollo_actividad"], ["ajustes_recomendaciones"]],
  condiciones_vacante: [
    ["requiere_certificado_observaciones"],
    ["especificaciones_formacion"],
    ["conocimientos_basicos"],
    ["observaciones"],
    ["funciones_tareas"],
    ["herramientas_equipos"],
    ["observaciones_cognitivas"],
    ["observaciones_motricidad_fina"],
    ["observaciones_motricidad_gruesa"],
    ["observaciones_transversales"],
    ["observaciones_peligros"],
    ["observaciones_recomendaciones"],
  ],
};

function getEnvNumber(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getTextReviewConfig() {
  return {
    functionName:
      process.env.OPENAI_TEXT_REVIEW_FUNCTION_NAME?.trim() ||
      DEFAULT_FUNCTION_NAME,
    model: process.env.OPENAI_TEXT_REVIEW_MODEL?.trim() || DEFAULT_MODEL,
    maxTextChars: getEnvNumber(
      "OPENAI_TEXT_REVIEW_MAX_CHARS",
      DEFAULT_MAX_TEXT_CHARS
    ),
    maxBatchItems: getEnvNumber(
      "OPENAI_TEXT_REVIEW_BATCH_MAX_ITEMS",
      DEFAULT_BATCH_MAX_ITEMS
    ),
    maxBatchChars: getEnvNumber(
      "OPENAI_TEXT_REVIEW_BATCH_MAX_CHARS",
      DEFAULT_BATCH_MAX_CHARS
    ),
  };
}

export function normalizeReviewFormSlug(formSlug: string) {
  return FORM_ALIASES[formSlug.trim()] ?? null;
}

export function isMeaningfulReviewText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return false;
  }

  return Array.from(text).some((char) => /\p{L}/u.test(char));
}

function getValueAtPath(
  node: unknown,
  path: readonly TextReviewPathPart[]
): unknown {
  let current = node;

  for (const part of path) {
    if (typeof part === "number") {
      if (!Array.isArray(current) || part < 0 || part >= current.length) {
        return undefined;
      }
      current = current[part];
      continue;
    }

    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function setValueAtPath(
  node: unknown,
  path: readonly TextReviewPathPart[],
  value: string
) {
  if (!path.length || !node || typeof node !== "object") {
    return;
  }

  let current: unknown = node;

  for (const part of path.slice(0, -1)) {
    if (typeof part === "number") {
      if (!Array.isArray(current) || part < 0 || part >= current.length) {
        return;
      }
      current = current[part];
      continue;
    }

    if (!current || typeof current !== "object" || !(part in current)) {
      return;
    }

    current = (current as Record<string, unknown>)[part];
  }

  const last = path[path.length - 1];
  if (typeof last === "number") {
    if (Array.isArray(current) && last >= 0 && last < current.length) {
      current[last] = value;
    }
    return;
  }

  if (current && typeof current === "object") {
    (current as Record<string, unknown>)[last] = value;
  }
}

export function extractTextReviewTargets(
  formSlug: string,
  value: unknown,
  maxTextChars = getTextReviewConfig().maxTextChars
) {
  const normalizedSlug = normalizeReviewFormSlug(formSlug);
  if (!normalizedSlug || !value || typeof value !== "object") {
    return [] as TextReviewTarget[];
  }

  const targets: TextReviewTarget[] = [];
  const seenPaths = new Set<string>();

  for (const path of REVIEW_FIELDS_BY_FORM[normalizedSlug]) {
    const rawValue = getValueAtPath(value, path);
    const text = typeof rawValue === "string" ? rawValue.trim() : "";
    if (!isMeaningfulReviewText(text) || text.length > maxTextChars) {
      continue;
    }

    const pathKey = path.join(".");
    if (seenPaths.has(pathKey)) {
      continue;
    }

    seenPaths.add(pathKey);
    targets.push({ path: [...path], text });
  }

  return targets;
}

export function buildTextReviewBatches(
  texts: readonly string[],
  maxBatchItems = getTextReviewConfig().maxBatchItems,
  maxBatchChars = getTextReviewConfig().maxBatchChars
) {
  const safeMaxItems = Math.max(1, maxBatchItems);
  const safeMaxChars = Math.max(1, maxBatchChars);
  const batches: TextReviewBatch[] = [];
  let currentItems: { id: string; text: string }[] = [];
  let currentChars = 0;

  for (const [index, text] of texts.entries()) {
    const safeText = String(text ?? "");
    const nextChars = currentChars + safeText.length;
    if (
      currentItems.length > 0 &&
      (currentItems.length >= safeMaxItems || nextChars > safeMaxChars)
    ) {
      batches.push({ items: currentItems, totalChars: currentChars });
      currentItems = [];
      currentChars = 0;
    }

    currentItems.push({
      id: `item_${index + 1}`,
      text: safeText,
    });
    currentChars += safeText.length;
  }

  if (currentItems.length > 0) {
    batches.push({ items: currentItems, totalChars: currentChars });
  }

  return batches;
}

export function applyReviewedTargets<TValue>(
  value: TValue,
  reviewedTargets: readonly TextReviewTarget[]
) {
  const copy = structuredClone(value);
  for (const target of reviewedTargets) {
    setValueAtPath(copy, target.path, target.text);
  }
  return copy;
}

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

function getRequestTimeoutMs() {
  const raw = process.env.OPENAI_TEXT_REVIEW_REQUEST_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_REQUEST_TIMEOUT_MS;
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException
      ? error.name === "AbortError" || error.name === "TimeoutError"
      : typeof error === "object" &&
          error !== null &&
          "name" in error &&
          ((error as { name?: unknown }).name === "AbortError" ||
            (error as { name?: unknown }).name === "TimeoutError")
  );
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

    reviewedMap.set(itemId, String(item?.text ?? "").trim());
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

async function requestBatchReview({
  accessToken,
  items,
  fetchImpl,
  functionUrl,
  apikey,
  model,
  timeoutMs = getRequestTimeoutMs(),
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
      body: JSON.stringify(
        model
          ? {
              items,
              model,
            }
          : { items }
      ),
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
  } catch {
    // ignore invalid json and report below
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

export async function reviewFinalizationText<TValue>({
  accessToken,
  apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
  fetchImpl = fetch,
  functionName = getTextReviewConfig().functionName,
  functionUrl,
  model = process.env.OPENAI_TEXT_REVIEW_MODEL?.trim() || undefined,
  value,
  formSlug,
}: ReviewOptions<TValue>): Promise<TextReviewResult<TValue>> {
  const reviewConfig = getTextReviewConfig();
  const reviewTargets = extractTextReviewTargets(
    formSlug,
    value,
    reviewConfig.maxTextChars
  );
  const uniqueTexts = Array.from(new Set(reviewTargets.map((target) => target.text)));

  if (!reviewTargets.length) {
    return {
      status: "skipped",
      value,
      reason: "no_reviewable_text",
      reviewedCount: 0,
      usage: {
        model,
        uniqueTexts: 0,
        batches: 0,
      },
    };
  }

  const jwt = accessToken?.trim();
  if (!jwt) {
    return {
      status: "skipped",
      value,
      reason: "missing_access_token",
      reviewedCount: 0,
      usage: {
        model,
        uniqueTexts: uniqueTexts.length,
        batches: 0,
      },
    };
  }

  if (!apikey) {
    return {
      status: "skipped",
      value,
      reason: "missing_publishable_key",
      reviewedCount: 0,
      usage: {
        model,
        uniqueTexts: uniqueTexts.length,
        batches: 0,
      },
    };
  }

  let resolvedFunctionUrl = functionUrl;
  if (!resolvedFunctionUrl) {
    try {
      resolvedFunctionUrl = getSupabaseFunctionUrl(
        functionName || DEFAULT_FUNCTION_NAME
      );
    } catch {
      return {
        status: "skipped",
        value,
        reason: "missing_supabase_url",
        reviewedCount: 0,
        usage: {
          model,
          uniqueTexts: uniqueTexts.length,
          batches: 0,
        },
      };
    }
  }

  const batches = buildTextReviewBatches(
    uniqueTexts,
    reviewConfig.maxBatchItems,
    reviewConfig.maxBatchChars
  );
  const reviewedTextByOriginal = new Map<string, string>();
  let usageModel = model;

  try {
    for (const batch of batches) {
      const result = await requestBatchReview({
        accessToken: jwt,
        apikey,
        fetchImpl,
        functionUrl: resolvedFunctionUrl,
        items: batch.items,
        model,
      });

      usageModel = result.usage?.model ?? usageModel;
      result.items.forEach((item, index) => {
        const originalText = batch.items[index]?.text ?? "";
        reviewedTextByOriginal.set(originalText, item.text.trim() || originalText);
      });
    }
  } catch (error) {
    return {
      status: "failed",
      value,
      reason: error instanceof Error ? error.message : String(error),
      reviewedCount: 0,
      usage: {
        model: usageModel,
        uniqueTexts: uniqueTexts.length,
        batches: batches.length,
      },
    };
  }

  const reviewedTargets = reviewTargets.map((target) => ({
    path: [...target.path],
    text: reviewedTextByOriginal.get(target.text) ?? target.text,
  }));

  const reviewedValue = applyReviewedTargets(value, reviewedTargets);
  const reviewedCount = reviewedTargets.reduce((count, target, index) => {
    return count + Number(target.text !== reviewTargets[index]?.text);
  }, 0);

  return {
    status: "reviewed",
    value: reviewedValue,
    reason: "ok",
    reviewedCount,
    usage: {
      model: usageModel,
      uniqueTexts: uniqueTexts.length,
      batches: batches.length,
    },
  };
}
