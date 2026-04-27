import { describe, expect, it } from "vitest";
import { filterKnownClientSentryNoiseEvent } from "@/lib/observability/sentryNoiseFilter";

describe("sentry noise filter", () => {
  it("drops injected Firefox extension noise", () => {
    const event = {
      exception: {
        values: [
          {
            type: "TypeError",
            value:
              "undefined is not an object (evaluating 'window.__firefox__.reader')",
          },
        ],
      },
    };

    expect(filterKnownClientSentryNoiseEvent(event as never)).toBeNull();
  });

  it("drops injected ethereum extension noise", () => {
    const event = {
      exception: {
        values: [
          {
            type: "TypeError",
            value:
              "undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')",
          },
        ],
      },
    };

    expect(filterKnownClientSentryNoiseEvent(event as never)).toBeNull();
  });

  it("keeps first-party application errors", () => {
    const event = {
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Cannot read properties of undefined (reading 'map')",
          },
        ],
      },
    };

    expect(filterKnownClientSentryNoiseEvent(event as never)).toBe(event);
  });
});
