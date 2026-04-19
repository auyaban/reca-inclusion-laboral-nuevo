import { getTextReviewConfig } from "@/lib/finalization/textReviewConfig";
import type { TextReviewBatch } from "@/lib/finalization/textReviewTypes";

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

export async function mapWithConcurrency<TValue, TResult>(
  values: readonly TValue[],
  concurrency: number,
  mapper: (value: TValue, index: number) => Promise<TResult>
) {
  const safeConcurrency = Math.max(1, Math.min(concurrency, values.length || 1));
  const results = new Array<TResult>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= values.length) {
        return;
      }

      results[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => worker()));

  return results;
}
