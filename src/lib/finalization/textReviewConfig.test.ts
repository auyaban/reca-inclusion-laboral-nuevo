import { afterEach, describe, expect, it } from "vitest";
import {
  getTextReviewConfig,
  getTextReviewRequestTimeoutMs,
} from "@/lib/finalization/textReviewConfig";

const ORIGINAL_ENV = {
  OPENAI_TEXT_REVIEW_FUNCTION_NAME:
    process.env.OPENAI_TEXT_REVIEW_FUNCTION_NAME,
  OPENAI_TEXT_REVIEW_MODEL: process.env.OPENAI_TEXT_REVIEW_MODEL,
  OPENAI_TEXT_REVIEW_MAX_CHARS: process.env.OPENAI_TEXT_REVIEW_MAX_CHARS,
  OPENAI_TEXT_REVIEW_BATCH_MAX_ITEMS:
    process.env.OPENAI_TEXT_REVIEW_BATCH_MAX_ITEMS,
  OPENAI_TEXT_REVIEW_BATCH_MAX_CHARS:
    process.env.OPENAI_TEXT_REVIEW_BATCH_MAX_CHARS,
  OPENAI_TEXT_REVIEW_BATCH_CONCURRENCY:
    process.env.OPENAI_TEXT_REVIEW_BATCH_CONCURRENCY,
  OPENAI_TEXT_REVIEW_REQUEST_TIMEOUT_MS:
    process.env.OPENAI_TEXT_REVIEW_REQUEST_TIMEOUT_MS,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === "string") {
      process.env[key] = value;
      continue;
    }

    delete process.env[key];
  }
}

describe("textReviewConfig", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("returns documented defaults when env vars are missing", () => {
    restoreEnv();

    expect(getTextReviewConfig()).toEqual({
      functionName: "text-review-orthography",
      model: "gpt-4.1-nano",
      maxTextChars: 6000,
      maxBatchItems: 8,
      maxBatchChars: 12000,
      batchConcurrency: 2,
    });
    expect(getTextReviewRequestTimeoutMs()).toBe(15_000);
  });

  it("caps batch concurrency and keeps positive numeric envs only", () => {
    process.env.OPENAI_TEXT_REVIEW_BATCH_CONCURRENCY = "99";
    process.env.OPENAI_TEXT_REVIEW_REQUEST_TIMEOUT_MS = "-1";

    expect(getTextReviewConfig().batchConcurrency).toBe(3);
    expect(getTextReviewRequestTimeoutMs()).toBe(15_000);
  });
});
