import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAnalyticsEventsRateLimit } from "@/lib/security/analyticsRateLimit";
import { createClient } from "@/lib/supabase/server";

const analyticsEventSchema = z.discriminatedUnion("event", [
  z
    .object({
      event: z.literal("hub_form_opened"),
      properties: z
        .object({
          form_id: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
          source: z.literal("hub"),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      event: z.literal("drafts_panel_opened"),
      properties: z
        .object({
          source: z.literal("hub"),
          draft_count: z.number().int().min(0).max(1000),
        })
        .strict(),
    })
    .strict(),
]);

function getPostHogCaptureUrl() {
  const host = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
  return `${host.replace(/\/+$/, "")}/capture/`;
}

function getEnvironment() {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rateLimitDecision = await enforceAnalyticsEventsRateLimit(user.id);
  if (!rateLimitDecision.allowed) {
    return NextResponse.json(
      { error: rateLimitDecision.error },
      {
        status: rateLimitDecision.status,
        headers: {
          "Retry-After": String(rateLimitDecision.retryAfterSeconds),
        },
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = analyticsEventSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const apiKey = process.env.POSTHOG_PROJECT_TOKEN;

  if (!apiKey) {
    return NextResponse.json({ ok: true, captured: false, reason: "disabled" });
  }

  const eventPayload = {
    api_key: apiKey,
    event: parsedBody.data.event,
    distinct_id: user.id,
    properties: {
      ...parsedBody.data.properties,
      app: "reca-inclusion-laboral",
      environment: getEnvironment(),
    },
  };

  try {
    const response = await fetch(getPostHogCaptureUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn("[api/analytics/events] PostHog capture failed", {
        status: response.status,
      });
      return NextResponse.json({ ok: true, captured: false }, { status: 202 });
    }
  } catch (captureError) {
    console.warn("[api/analytics/events] PostHog capture failed", captureError);
    return NextResponse.json({ ok: true, captured: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true, captured: true });
}
