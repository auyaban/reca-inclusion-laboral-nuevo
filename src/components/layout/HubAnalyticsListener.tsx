"use client";

import { useEffect } from "react";
import { sendProductAnalyticsEvent } from "@/lib/analytics/productAnalytics";

export default function HubAnalyticsListener() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const formLink = target.closest<HTMLElement>(
        '[data-analytics-event="hub_form_opened"][data-form-id]'
      );

      if (!formLink) {
        return;
      }

      const formId = formLink.dataset.formId;

      if (!formId) {
        return;
      }

      sendProductAnalyticsEvent({
        event: "hub_form_opened",
        properties: {
          form_id: formId,
          source: "hub",
        },
      });
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("auxclick", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("auxclick", handleClick);
    };
  }, []);

  return null;
}
