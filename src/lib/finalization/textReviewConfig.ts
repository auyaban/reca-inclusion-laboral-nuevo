const DEFAULT_FUNCTION_NAME = "text-review-orthography";
const DEFAULT_MODEL = "gpt-4.1-nano";
const DEFAULT_MAX_TEXT_CHARS = 6000;
const DEFAULT_BATCH_MAX_ITEMS = 8;
const DEFAULT_BATCH_MAX_CHARS = 12000;
const DEFAULT_BATCH_CONCURRENCY = 2;
const MAX_BATCH_CONCURRENCY = 3;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

function getEnvNumber(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getEnvConcurrency(name: string, fallback: number, max: number) {
  const value = getEnvNumber(name, fallback);
  return Math.min(Math.max(1, value), max);
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
    batchConcurrency: getEnvConcurrency(
      "OPENAI_TEXT_REVIEW_BATCH_CONCURRENCY",
      DEFAULT_BATCH_CONCURRENCY,
      MAX_BATCH_CONCURRENCY
    ),
  };
}

export function getTextReviewRequestTimeoutMs() {
  return getEnvNumber(
    "OPENAI_TEXT_REVIEW_REQUEST_TIMEOUT_MS",
    DEFAULT_REQUEST_TIMEOUT_MS
  );
}
