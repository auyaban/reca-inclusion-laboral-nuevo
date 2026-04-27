import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, getUserMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
}));

const { enforceAnalyticsEventsRateLimitMock } = vi.hoisted(() => ({
  enforceAnalyticsEventsRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/security/analyticsRateLimit", () => ({
  enforceAnalyticsEventsRateLimit: enforceAnalyticsEventsRateLimitMock,
}));

import { POST } from "@/app/api/analytics/events/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/analytics/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.POSTHOG_PROJECT_TOKEN;
    delete process.env.POSTHOG_HOST;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "test";

    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "private@example.com",
        },
      },
      error: null,
    });
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
    enforceAnalyticsEventsRateLimitMock.mockResolvedValue({
      allowed: true,
      backend: "memory",
      remaining: 59,
    });
  });

  it("returns 401 without an authenticated user", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(
      buildRequest({
        event: "hub_form_opened",
        properties: { form_id: "presentacion", source: "hub" },
      })
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(enforceAnalyticsEventsRateLimitMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the authenticated user exceeds the analytics rate limit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    enforceAnalyticsEventsRateLimitMock.mockResolvedValue({
      allowed: false,
      backend: "memory",
      error: "Demasiadas solicitudes de analytics.",
      status: 429,
      retryAfterSeconds: 30,
    });

    const response = await POST(
      buildRequest({
        event: "hub_form_opened",
        properties: { form_id: "presentacion", source: "hub" },
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for non-allowlisted events", async () => {
    const response = await POST(
      buildRequest({
        event: "profile_opened",
        properties: { source: "hub" },
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for disallowed properties", async () => {
    const response = await POST(
      buildRequest({
        event: "hub_form_opened",
        properties: {
          form_id: "presentacion",
          source: "hub",
          empresa_nit: "900123",
        },
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns a successful no-op when PostHog is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      buildRequest({
        event: "drafts_panel_opened",
        properties: { source: "hub", draft_count: 3 },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      captured: false,
      reason: "disabled",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("captures sanitized events with the authenticated user id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);
    process.env.POSTHOG_PROJECT_TOKEN = "ph-token";
    process.env.POSTHOG_HOST = "https://us.i.posthog.com/";

    const response = await POST(
      buildRequest({
        event: "hub_form_opened",
        properties: { form_id: "presentacion", source: "hub" },
      })
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://us.i.posthog.com/capture/",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      })
    );

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body).toEqual({
      api_key: "ph-token",
      event: "hub_form_opened",
      distinct_id: "user-1",
      properties: {
        form_id: "presentacion",
        source: "hub",
        app: "reca-inclusion-laboral",
        environment: "test",
      },
    });
    expect(JSON.stringify(body)).not.toContain("private@example.com");
  });
});
