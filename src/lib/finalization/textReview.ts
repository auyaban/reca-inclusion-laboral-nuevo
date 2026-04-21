import { getSupabaseFunctionUrl } from "@/lib/supabase/functions";
import { getFinalizationFormTextReviewSlug } from "@/lib/finalization/formRegistry";
import {
  buildTextReviewBatches,
  mapWithConcurrency,
} from "@/lib/finalization/textReviewBatch";
import { getTextReviewConfig } from "@/lib/finalization/textReviewConfig";
import { requestBatchReview } from "@/lib/finalization/textReviewClient";
import {
  applyReviewedTargets,
  extractTextReviewTargetsForForm,
  isMeaningfulReviewText,
  sanitizeTextReviewText,
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
  usage?: {
    model?: string;
    uniqueTexts: number;
    batches: number;
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
};

export function normalizeReviewFormSlug(formSlug: string) {
  return getFinalizationFormTextReviewSlug(formSlug);
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
}: ReviewOptions<TValue>): Promise<TextReviewResult<TValue>> {
  const reviewConfig = getTextReviewConfig();
  const normalizedSlug = normalizeReviewFormSlug(formSlug);

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
      },
    };
  }

  const reviewTargets = extractTextReviewTargetsForForm(
    normalizedSlug,
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
      resolvedFunctionUrl = getSupabaseFunctionUrl(functionName);
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
