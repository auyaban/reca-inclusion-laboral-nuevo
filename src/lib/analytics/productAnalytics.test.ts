// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { sendProductAnalyticsEvent } from "@/lib/analytics/productAnalytics";

function setSendBeacon(value: typeof navigator.sendBeacon | undefined) {
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value,
  });
}

describe("sendProductAnalyticsEvent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSendBeacon(undefined);
  });

  it("uses sendBeacon when available", () => {
    const sendBeaconMock = vi.fn(() => true);
    const fetchMock = vi.fn();
    setSendBeacon(sendBeaconMock);
    vi.stubGlobal("fetch", fetchMock);

    sendProductAnalyticsEvent({
      event: "hub_form_opened",
      properties: {
        form_id: "presentacion",
        source: "hub",
      },
    });

    expect(sendBeaconMock).toHaveBeenCalledOnce();
    expect(sendBeaconMock).toHaveBeenCalledWith(
      "/api/analytics/events",
      expect.any(Blob)
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to fetch keepalive when sendBeacon is unavailable", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    setSendBeacon(undefined);
    vi.stubGlobal("fetch", fetchMock);

    sendProductAnalyticsEvent({
      event: "drafts_panel_opened",
      properties: {
        source: "hub",
        draft_count: 2,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics/events",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        body: JSON.stringify({
          event: "drafts_panel_opened",
          properties: {
            source: "hub",
            draft_count: 2,
          },
        }),
      })
    );
  });

  it("does not throw when analytics delivery fails", () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network failed"));
    setSendBeacon(() => false);
    vi.stubGlobal("fetch", fetchMock);

    expect(() =>
      sendProductAnalyticsEvent({
        event: "hub_form_opened",
        properties: {
          form_id: "interprete-lsc",
          source: "hub",
        },
      })
    ).not.toThrow();
  });
});
