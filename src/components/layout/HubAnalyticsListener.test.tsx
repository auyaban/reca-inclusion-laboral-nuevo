// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HubAnalyticsListener from "@/components/layout/HubAnalyticsListener";

const { sendProductAnalyticsEventMock } = vi.hoisted(() => ({
  sendProductAnalyticsEventMock: vi.fn(),
}));

vi.mock("@/lib/analytics/productAnalytics", () => ({
  sendProductAnalyticsEvent: sendProductAnalyticsEventMock,
}));

describe("HubAnalyticsListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("captures hub form clicks with only the form id", () => {
    render(
      <>
        <HubAnalyticsListener />
        <div
          data-analytics-event="hub_form_opened"
          data-form-id="presentacion"
        >
          <span>Abrir presentacion</span>
        </div>
      </>
    );

    fireEvent.click(screen.getByText("Abrir presentacion"));

    expect(sendProductAnalyticsEventMock).toHaveBeenCalledWith({
      event: "hub_form_opened",
      properties: {
        form_id: "presentacion",
        source: "hub",
      },
    });
  });

  it("captures middle-click form opens through auxclick", () => {
    render(
      <>
        <HubAnalyticsListener />
        <div
          data-analytics-event="hub_form_opened"
          data-form-id="interprete-lsc"
        >
          <span>Abrir interprete</span>
        </div>
      </>
    );

    fireEvent(
      screen.getByText("Abrir interprete"),
      new MouseEvent("auxclick", {
        bubbles: true,
        button: 1,
      })
    );

    expect(sendProductAnalyticsEventMock).toHaveBeenCalledWith({
      event: "hub_form_opened",
      properties: {
        form_id: "interprete-lsc",
        source: "hub",
      },
    });
  });

  it("ignores unrelated clicks", () => {
    render(
      <>
        <HubAnalyticsListener />
        <button type="button">Otro boton</button>
      </>
    );

    fireEvent.click(screen.getByText("Otro boton"));

    expect(sendProductAnalyticsEventMock).not.toHaveBeenCalled();
  });
});
