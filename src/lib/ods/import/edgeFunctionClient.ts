const EDGE_FUNCTION_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extract-acta-ods`
    : "";

const EDGE_FUNCTION_TIMEOUT_MS = 230_000; // 230s

export type EdgeFunctionRequest = {
  text: string;
};

export type EdgeFunctionResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

export class EdgeFunctionTimeoutError extends Error {
  constructor() {
    super("Edge Function timeout (230s)");
    this.name = "EdgeFunctionTimeoutError";
  }
}

export class EdgeFunctionHttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "EdgeFunctionHttpError";
  }
}

export async function callExtractActaEdgeFunction(
  request: EdgeFunctionRequest,
  options?: { signal?: AbortSignal },
): Promise<EdgeFunctionResponse> {
  if (!EDGE_FUNCTION_URL) {
    throw new Error("Edge Function URL not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);

  const externalSignal = options?.signal;
  externalSignal?.addEventListener("abort", () => controller.abort());

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new EdgeFunctionHttpError(
        `Edge Function returned ${response.status}: ${errorText || response.statusText}`,
        response.status,
      );
    }

    const data = (await response.json()) as EdgeFunctionResponse;
    return data;
  } catch (error) {
    if (error instanceof EdgeFunctionHttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      if (externalSignal?.aborted) throw error;
      throw new EdgeFunctionTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
