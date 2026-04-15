import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_MODEL =
  Deno.env.get("OPENAI_STT_MODEL") ?? "gpt-4o-mini-transcribe";
const DEFAULT_LANGUAGE = Deno.env.get("OPENAI_STT_LANGUAGE") ?? "es";
const CLEANUP_MODEL =
  Deno.env.get("OPENAI_STT_CLEANUP_MODEL") ?? "gpt-4.1-nano";
const MAX_AUDIO_MB = Number(Deno.env.get("DICTATION_MAX_AUDIO_MB") ?? "25");
const REQUESTS_PER_MINUTE = Number(Deno.env.get("DICTATION_RPM") ?? "12");
const AUDIO_MINUTES_PER_HOUR = Number(
  Deno.env.get("DICTATION_AUDIO_MIN_PER_HOUR") ?? "60"
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
};

const TRANSCRIPTION_PROMPT =
  "Transcribe en español conservando las palabras y el orden del hablante. " +
  "Puedes añadir puntuación básica, mayúsculas y saltos de párrafo cuando sea evidente, " +
  "pero no resumas, no reformules y no reemplaces vocabulario.";

const CLEANUP_PROMPT =
  "Recibirás una transcripción en español. Conserva las palabras del hablante y el orden del contenido. " +
  "Solo corrige tildes, ortografía evidente, puntuación, mayúsculas/minúsculas y separación en oraciones y párrafos. " +
  "No resumas, no reformules, no cambies el tono, no inventes información, no sustituyas palabras por sinónimos y no elimines contenido relevante. " +
  "Devuelve únicamente el texto final en texto plano.";

type RateState = {
  reqWindowStart: number;
  reqCount: number;
  minWindowStart: number;
  audioMinutes: number;
};

const rateByUser = new Map<string, RateState>();

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

async function resolveUserId(jwt: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase auth env no configurado.");
  }
  const resp = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (!resp.ok) {
    throw new Error(`JWT invalido (${resp.status})`);
  }
  const data = (await resp.json()) as { id?: string };
  const userId = String(data?.id ?? "").trim();
  if (!userId) {
    throw new Error("No se pudo resolver usuario desde JWT.");
  }
  return userId;
}

function estimateAudioMinutesFromAudioBytes(sizeBytes: number) {
  return Math.max(0, sizeBytes / 1920000);
}

function checkRateLimit(
  userKey: string,
  estimatedMinutes: number
): { ok: true } | { ok: false; reason: string } {
  const now = Date.now();
  const state = rateByUser.get(userKey) ?? {
    reqWindowStart: now,
    reqCount: 0,
    minWindowStart: now,
    audioMinutes: 0,
  };

  if (now - state.reqWindowStart >= 60_000) {
    state.reqWindowStart = now;
    state.reqCount = 0;
  }
  if (now - state.minWindowStart >= 3_600_000) {
    state.minWindowStart = now;
    state.audioMinutes = 0;
  }

  state.reqCount += 1;
  state.audioMinutes += estimatedMinutes;
  rateByUser.set(userKey, state);

  if (state.reqCount > REQUESTS_PER_MINUTE) {
    return { ok: false, reason: "Rate limit por minuto excedido." };
  }
  if (state.audioMinutes > AUDIO_MINUTES_PER_HOUR) {
    return { ok: false, reason: "Rate limit de minutos por hora excedido." };
  }
  return { ok: true };
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
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === "output_text" || part?.type === "text") {
        const text = String(part?.text ?? "").trim();
        if (text) chunks.push(text);
      }
    }
  }
  return chunks.join("\n").trim();
}

async function callOpenAIResponses(input: string, model: string) {
  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: CLEANUP_PROMPT,
        input,
      }),
    });
  } catch {
    throw new Error("No fue posible conectar con OpenAI.");
  }

  if (!upstream.ok) {
    let message = `OpenAI error ${upstream.status}`;
    try {
      const payloadErr = await upstream.json();
      const msg = payloadErr?.error?.message ?? payloadErr?.message;
      if (typeof msg === "string" && msg.trim()) {
        message = msg.trim();
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const payload = await upstream.json();
  const reviewedText = extractOutputText(payload);
  if (!reviewedText) {
    throw new Error("OpenAI no devolvió texto corregido.");
  }
  return reviewedText;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json(405, {
      ok: false,
      error: { code: "method_not_allowed", message: "Use POST." },
    });
  }
  if (!OPENAI_API_KEY) {
    return json(500, {
      ok: false,
      error: { code: "missing_openai_key", message: "OPENAI_API_KEY no configurada." },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, {
      ok: false,
      error: { code: "missing_auth", message: "JWT requerido." },
    });
  }

  const jwt = authHeader.slice(7).trim();
  let userKey = "";
  try {
    userKey = await resolveUserId(jwt);
  } catch (err) {
    return json(401, {
      ok: false,
      error: {
        code: "invalid_auth",
        message: String((err as Error)?.message || "JWT invalido."),
      },
    });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return json(400, {
      ok: false,
      error: { code: "invalid_content_type", message: "Se requiere multipart/form-data." },
    });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json(400, {
      ok: false,
      error: { code: "invalid_form", message: "Formulario invalido." },
    });
  }

  const audio = formData.get("audio_file");
  if (!(audio instanceof File)) {
    return json(400, {
      ok: false,
      error: { code: "missing_audio", message: "audio_file es obligatorio." },
    });
  }
  if (!audio.size) {
    return json(400, {
      ok: false,
      error: { code: "empty_audio", message: "El audio esta vacio." },
    });
  }

  const maxBytes = MAX_AUDIO_MB * 1024 * 1024;
  if (audio.size > maxBytes) {
    return json(413, {
      ok: false,
      error: { code: "audio_too_large", message: `Audio supera ${MAX_AUDIO_MB}MB.` },
    });
  }

  const estimatedMinutes = estimateAudioMinutesFromAudioBytes(audio.size);
  const rl = checkRateLimit(userKey, estimatedMinutes);
  if (!rl.ok) {
    return json(429, {
      ok: false,
      error: { code: "rate_limited", message: rl.reason },
    });
  }

  const language = String(formData.get("language") ?? DEFAULT_LANGUAGE).trim() || DEFAULT_LANGUAGE;

  const openaiForm = new FormData();
  openaiForm.set("model", OPENAI_MODEL);
  openaiForm.set("language", language);
  openaiForm.set("response_format", "json");
  openaiForm.set("prompt", TRANSCRIPTION_PROMPT);
  openaiForm.set("file", audio, audio.name || "dictation.wav");

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: openaiForm,
    });
  } catch {
    return json(502, {
      ok: false,
      error: { code: "openai_unreachable", message: "No fue posible conectar con OpenAI." },
    });
  }

  if (!upstream.ok) {
    let message = `OpenAI error ${upstream.status}`;
    try {
      const payloadErr = await upstream.json();
      const msg = payloadErr?.error?.message ?? payloadErr?.message;
      if (typeof msg === "string" && msg.trim()) message = msg.trim();
    } catch {
      // ignore parse errors
    }
    return json(502, { ok: false, error: { code: "openai_error", message } });
  }

  let data: { text?: string };
  try {
    data = await upstream.json();
  } catch {
    return json(502, {
      ok: false,
      error: { code: "invalid_openai_response", message: "Respuesta de OpenAI invalida." },
    });
  }

  const textRaw = String(data?.text ?? "");
  const transcribedText = textRaw
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!transcribedText) {
    return json(422, {
      ok: false,
      error: { code: "empty_transcription", message: "OpenAI no devolvio texto." },
    });
  }

  let finalText = transcribedText;
  let cleanupApplied = false;
  const cleanupModel = CLEANUP_MODEL.trim();

  if (cleanupModel && cleanupModel.toLowerCase() !== "none") {
    try {
      const cleanedText = await callOpenAIResponses(transcribedText, cleanupModel);
      const normalizedCleanedText = cleanedText
        .replace(/\s+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (normalizedCleanedText) {
        finalText = normalizedCleanedText;
        cleanupApplied = true;
      }
    } catch (cleanupError) {
      console.warn("[dictate-transcribe.cleanup] fallback_to_raw", {
        model: cleanupModel,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
      });
    }
  }

  return json(200, {
    ok: true,
    text: finalText,
    usage: {
      duration_seconds: null,
      model: OPENAI_MODEL,
      transcribe_model: OPENAI_MODEL,
      cleanup_model: cleanupModel || null,
      cleanup_applied: cleanupApplied,
    },
  });
});
