import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseFunctionUrl } from "@/lib/supabase/functions";

describe("getSupabaseFunctionUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds the full edge function URL from the configured Supabase base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo-project.supabase.co");

    expect(getSupabaseFunctionUrl("dictate-transcribe")).toBe(
      "https://demo-project.supabase.co/functions/v1/dictate-transcribe"
    );
  });

  it("throws a clear error when the Supabase URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(() => getSupabaseFunctionUrl("dictate-transcribe")).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
    );
  });
});
