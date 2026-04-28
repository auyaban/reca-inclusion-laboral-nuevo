import { getSupabaseFunctionUrl } from "@/lib/supabase/functions";
import { createHash } from "node:crypto";
import { getFinalizationFormTextReviewSlug } from "@/lib/finalization/formRegistry";
import {
  buildTextReviewBatches,
  mapWithConcurrency,
} from "@/lib/finalization/textReviewBatch";
import {
  getTextReviewConfig,
  getTextReviewTransport,
  type TextReviewTransport,
} from "@/lib/finalization/textReviewConfig";
import {
  requestBatchReview,
  requestDirectBatchReview,
} from "@/lib/finalization/textReviewClient";
import {
  applyReviewedTargets,
  extractTextReviewTargetsForForm,
  isMeaningfulReviewText,
  sanitizeTextReviewText,
  type TextReviewFormSlug,
} from "@/lib/finalization/textReviewFields";
import type {
  TextReviewBatch,
  TextReviewPathPart,
  TextReviewTarget,
} from "@/lib/finalization/textReviewTypes";

export type { TextReviewBatch, TextReviewPathPart, TextReviewTarget };
export {
  applyReviewedTargets,
  buildTextReviewBatches,
  getTextReviewConfig,
  isMeaningfulReviewText,
  sanitizeTextReviewText,
};

export type TextReviewStatus = "reviewed" | "skipped" | "failed";

export type TextReviewResult<TValue> = {
  status: TextReviewStatus;
  value: TValue;
  reason: string;
  reviewedCount: number;
  cacheHit?: boolean;
  cacheArtifact?: TextReviewCacheArtifact | null;
  usage?: {
    model?: string;
    uniqueTexts: number;
    batches: number;
    transport?: TextReviewTransport;
    durationMs?: number;
  };
};

type ReviewOptions<TValue> = {
  accessToken?: string | null;
  fetchImpl?: typeof fetch;
  functionUrl?: string;
  functionName?: string;
  apikey?: string;
  value: TValue;
  formSlug: string;
  model?: string;
  cacheArtifact?: TextReviewCacheArtifact | null;
};

export type TextReviewCacheItem = {
  path: TextReviewPathPart[];
  originalText: string;
  reviewedText: string;
};

export type TextReviewCacheArtifact = {
  version: 1;
  formSlug: string;
  inputHash: string;
  model: string | null;
  transport: TextReviewTransport;
  status: TextReviewStatus;
  reason: string;
  durationMs: number | null;
  reviewedCount: number;
  uniqueTexts: number;
  batches: number;
  reviewedItems: TextReviewCacheItem[];
  reviewedAt: string;
};

export function normalizeReviewFormSlug(formSlug: string) {
  return getFinalizationFormTextReviewSlug(formSlug);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashTextReviewInput(options: {
  normalizedSlug: TextReviewFormSlug;
  targets: TextReviewTarget[];
}) {
  return createHash("sha256")
    .update(
      stableStringify({
        formSlug: options.normalizedSlug,
        targets: options.targets.map((target) => ({
          path: target.path,
          text: target.text,
        })),
      })
    )
    .digest("hex");
}

function isTextReviewCacheItem(value: unknown): value is TextReviewCacheItem {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as TextReviewCacheItem).path) &&
    (value as TextReviewCacheItem).path.every(
      (part) => typeof part === "string" || typeof part === "number"
    ) &&
    typeof (value as TextReviewCacheItem).originalText === "string" &&
    typeof (value as TextReviewCacheItem).reviewedText === "string"
  );
}

export function isTextReviewCacheArtifact(
  value: unknown
): value is TextReviewCacheArtifact {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as TextReviewCacheArtifact;
  return (
    candidate.version === 1 &&
    typeof candidate.formSlug === "string" &&
    typeof candidate.inputHash === "string" &&
    (typeof candidate.model === "string" || candidate.model === null) &&
    (candidate.transport === "direct" || candidate.transport === "edge") &&
    (candidate.status === "reviewed" ||
      candidate.status === "skipped" ||
      candidate.status === "failed") &&
    typeof candidate.reason === "string" &&
    (typeof candidate.durationMs === "number" || candidate.durationMs === null) &&
    typeof candidate.reviewedCount === "number" &&
    typeof candidate.uniqueTexts === "number" &&
    typeof candidate.batches === "number" &&
    Array.isArray(candidate.reviewedItems) &&
    candidate.reviewedItems.every(isTextReviewCacheItem) &&
    typeof candidate.reviewedAt === "string"
  );
}

export function extractTextReviewCacheArtifact(
  value: unknown
): TextReviewCacheArtifact | null {
  if (isTextReviewCacheArtifact(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    isTextReviewCacheArtifact((value as Record<string, unknown>).textReview)
  ) {
    return (value as Record<string, TextReviewCacheArtifact>).textReview;
  }

  return null;
}

function buildTextReviewCacheArtifact<TValue>(options: {
  normalizedSlug: TextReviewFormSlug;
  originalValue: TValue;
  result: TextReviewResult<TValue>;
  reviewTargets: TextReviewTarget[];
  inputHash: string;
  model: string | null;
  transport: TextReviewTransport;
  uniqueTexts: number;
  batches: number;
}): TextReviewCacheArtifact {
  const reviewedTargets =
    options.result.status === "reviewed"
      ? extractTextReviewTargetsForForm(
          options.normalizedSlug,
          options.result.value,
          getTextReviewConfig().maxTextChars
        )
      : options.reviewTargets;

  const reviewedItems = options.reviewTargets.map((target, index) => ({
    path: [...target.path],
    originalText: target.text,
    reviewedText: reviewedTargets[index]?.text ?? target.text,
  }));

  return {
    version: 1,
    formSlug: options.normalizedSlug,
    inputHash: options.inputHash,
    model: options.result.usage?.model ?? options.model,
    transport: options.result.usage?.transport ?? options.transport,
    status: options.result.status,
    reason: options.result.reason,
    durationMs: options.result.usage?.durationMs ?? null,
    reviewedCount: options.result.reviewedCount,
    uniqueTexts: options.result.usage?.uniqueTexts ?? options.uniqueTexts,
    batches: options.result.usage?.batches ?? options.batches,
    reviewedItems,
    reviewedAt: new Date().toISOString(),
  };
}

function applyTextReviewCacheArtifact<TValue>(options: {
  value: TValue;
  artifact: TextReviewCacheArtifact | null | undefined;
  normalizedSlug: TextReviewFormSlug;
  reviewTargets: TextReviewTarget[];
  inputHash: string;
  model: string | null;
}): TextReviewResult<TValue> | null {
  const artifact = options.artifact;
  if (
    !artifact ||
    artifact.formSlug !== options.normalizedSlug ||
    artifact.inputHash !== options.inputHash ||
    artifact.model !== options.model ||
    artifact.reviewedItems.length !== options.reviewTargets.length
  ) {
    return null;
  }

  for (let index = 0; index < options.reviewTargets.length; index += 1) {
    const target = options.reviewTargets[index];
    const cached = artifact.reviewedItems[index];
    if (
      !cached ||
      stableStringify(cached.path) !== stableStringify(target.path) ||
      cached.originalText !== target.text
    ) {
      return null;
    }
  }

  const reviewedValue =
    artifact.status === "reviewed"
      ? applyReviewedTargets(
          options.value,
          artifact.reviewedItems.map((item) => ({
            path: [...item.path],
            text: item.reviewedText,
          }))
        )
      : options.value;

  return {
    status: artifact.status,
    value: reviewedValue,
    reason: artifact.reason,
    reviewedCount: artifact.reviewedCount,
    cacheHit: true,
    cacheArtifact: artifact,
    usage: {
      model: artifact.model ?? undefined,
      uniqueTexts: artifact.uniqueTexts,
      batches: artifact.batches,
      transport: artifact.transport,
      durationMs: 0,
    },
  };
}

export function extractTextReviewTargets(
  formSlug: string,
  value: unknown,
  maxTextChars = getTextReviewConfig().maxTextChars
) {
  const normalizedSlug = normalizeReviewFormSlug(formSlug);
  if (!normalizedSlug) {
    return [] as TextReviewTarget[];
  }

  return extractTextReviewTargetsForForm(
    normalizedSlug,
    value,
    maxTextChars
  );
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
  cacheArtifact,
}: ReviewOptions<TValue>): Promise<TextReviewResult<TValue>> {
  const reviewConfig = getTextReviewConfig();
  const normalizedSlug = normalizeReviewFormSlug(formSlug);
  const requestedTransport = getTextReviewTransport();
  const directApiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const transport: TextReviewTransport =
    requestedTransport === "direct" && directApiKey ? "direct" : requestedTransport;
  const requestedModel = model || reviewConfig.model || null;

  if (!normalizedSlug) {
    return {
      status: "skipped",
      value,
      reason: "unsupported_form_slug",
      reviewedCount: 0,
      usage: {
        model,
        uniqueTexts: 0,
        batches: 0,
        transport,
        durationMs: 0,
      },
    };
  }

  const reviewTargets = extractTextReviewTargetsForForm(
    normalizedSlug,
    value,
    reviewConfig.maxTextChars
  );
  const uniqueTexts = Array.from(new Set(reviewTargets.map((target) => target.text)));
  const startedAt = Date.now();
  const inputHash = hashTextReviewInput({
    normalizedSlug,
    targets: reviewTargets,
  });
  const cached = applyTextReviewCacheArtifact({
    value,
    artifact: cacheArtifact,
    normalizedSlug,
    reviewTargets,
    inputHash,
    model: requestedModel,
  });
  if (cached) {
    return cached;
  }

  if (!reviewTargets.length) {
    const result: TextReviewResult<TValue> = {
      status: "skipped",
      value,
      reason: "no_reviewable_text",
      reviewedCount: 0,
      cacheHit: false,
      usage: {
        model,
        uniqueTexts: 0,
        batches: 0,
        transport,
        durationMs: 0,
      },
    };
    result.cacheArtifact = buildTextReviewCacheArtifact({
      normalizedSlug,
      originalValue: value,
      result,
      reviewTargets,
      inputHash,
      model: requestedModel,
      transport,
      uniqueTexts: 0,
      batches: 0,
    });
    return result;
  }

  const batches = buildTextReviewBatches(
    uniqueTexts,
    reviewConfig.maxBatchItems,
    reviewConfig.maxBatchChars
  );
  const reviewedTextByOriginal = new Map<string, string>();
  let usageModel = model;
  const jwt = accessToken?.trim();

  const buildSkippedResult = (
    reason:
      | "missing_openai_key"
      | "missing_access_token"
      | "missing_publishable_key"
      | "missing_supabase_url"
  ) => {
    const result: TextReviewResult<TValue> = {
      status: "skipped",
      value,
      reason,
      reviewedCount: 0,
      cacheHit: false,
      usage: {
        model,
        uniqueTexts: uniqueTexts.length,
        batches: batches.length,
        transport,
        durationMs: Date.now() - startedAt,
      },
    };
    result.cacheArtifact = buildTextReviewCacheArtifact({
      normalizedSlug,
      originalValue: value,
      result,
      reviewTargets,
      inputHash,
      model: requestedModel,
      transport,
      uniqueTexts: uniqueTexts.length,
      batches: batches.length,
    });
    return result;
  };

  try {
    if (transport === "direct") {
      if (!directApiKey) {
        return buildSkippedResult("missing_openai_key");
      }

      const batchResults = await mapWithConcurrency(
        batches,
        reviewConfig.batchConcurrency,
        (batch) =>
          requestDirectBatchReview({
            apiKey: directApiKey,
            fetchImpl,
            model: model || reviewConfig.model,
            items: batch.items,
          })
      );

      batchResults.forEach((result, batchIndex) => {
        const batch = batches[batchIndex];
        usageModel = result.usage?.model ?? usageModel;
        result.items.forEach((item, itemIndex) => {
          const originalText = batch?.items[itemIndex]?.text ?? "";
          reviewedTextByOriginal.set(originalText, item.text || originalText);
        });
      });
    } else {
      if (!jwt) {
        return buildSkippedResult("missing_access_token");
      }

      if (!apikey) {
        return buildSkippedResult("missing_publishable_key");
      }

      let resolvedFunctionUrl = functionUrl;
      if (!resolvedFunctionUrl) {
        try {
          resolvedFunctionUrl = getSupabaseFunctionUrl(functionName);
        } catch {
          return buildSkippedResult("missing_supabase_url");
        }
      }

      const batchResults = await mapWithConcurrency(
        batches,
        reviewConfig.batchConcurrency,
        (batch) =>
          requestBatchReview({
            accessToken: jwt,
            apikey,
            fetchImpl,
            functionUrl: resolvedFunctionUrl,
            items: batch.items,
            model,
          })
      );

      batchResults.forEach((result, batchIndex) => {
        const batch = batches[batchIndex];
        usageModel = result.usage?.model ?? usageModel;
        result.items.forEach((item, itemIndex) => {
          const originalText = batch?.items[itemIndex]?.text ?? "";
          reviewedTextByOriginal.set(originalText, item.text || originalText);
        });
      });
    }
  } catch (error) {
    const result: TextReviewResult<TValue> = {
      status: "failed",
      value,
      reason: error instanceof Error ? error.message : String(error),
      reviewedCount: 0,
      cacheHit: false,
      usage: {
        model: usageModel,
        uniqueTexts: uniqueTexts.length,
        batches: batches.length,
        transport,
        durationMs: Date.now() - startedAt,
      },
    };
    result.cacheArtifact = buildTextReviewCacheArtifact({
      normalizedSlug,
      originalValue: value,
      result,
      reviewTargets,
      inputHash,
      model: requestedModel,
      transport,
      uniqueTexts: uniqueTexts.length,
      batches: batches.length,
    });
    return result;
  }

  const reviewedTargets = reviewTargets.map((target) => ({
    path: [...target.path],
    text: reviewedTextByOriginal.get(target.text) ?? target.text,
  }));

  const reviewedValue = applyReviewedTargets(value, reviewedTargets);
  const reviewedCount = reviewedTargets.reduce((count, target, index) => {
    return count + Number(target.text !== reviewTargets[index]?.text);
  }, 0);

  const result: TextReviewResult<TValue> = {
    status: "reviewed",
    value: reviewedValue,
    reason: "ok",
    reviewedCount,
    cacheHit: false,
    usage: {
      model: usageModel,
      uniqueTexts: uniqueTexts.length,
      batches: batches.length,
      transport,
      durationMs: Date.now() - startedAt,
    },
  };
  result.cacheArtifact = buildTextReviewCacheArtifact({
    normalizedSlug,
    originalValue: value,
    result,
    reviewTargets,
    inputHash,
    model: requestedModel,
    transport,
    uniqueTexts: uniqueTexts.length,
    batches: batches.length,
  });
  return result;
}
