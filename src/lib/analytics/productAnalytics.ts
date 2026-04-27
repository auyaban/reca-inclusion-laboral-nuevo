type HubFormOpenedEvent = {
  event: "hub_form_opened";
  properties: {
    form_id: string;
    source: "hub";
  };
};

type DraftsPanelOpenedEvent = {
  event: "drafts_panel_opened";
  properties: {
    source: "hub";
    draft_count: number;
  };
};

export type ProductAnalyticsEvent =
  | HubFormOpenedEvent
  | DraftsPanelOpenedEvent;

const ANALYTICS_ENDPOINT = "/api/analytics/events";

export function sendProductAnalyticsEvent(event: ProductAnalyticsEvent) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = JSON.stringify(event);

  try {
    if (navigator.sendBeacon) {
      const body = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(ANALYTICS_ENDPOINT, body)) {
        return;
      }
    }

    void fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Product analytics must never interrupt the user workflow.
  }
}
