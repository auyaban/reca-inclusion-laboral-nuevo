import { afterEach, describe, expect, it, vi } from "vitest";
import {
  openActaTabWithBrowser,
  registerHubTabListenerWithBrowser,
  resolveActaTabUrl,
  returnToHubTabWithBrowser,
} from "@/lib/actaTabs";

function createFakeBroadcastChannelCtor() {
  const listeners = new Map<
    string,
    Set<(event: { data: unknown }) => void>
  >();

  return class FakeBroadcastChannel {
    name: string;

    constructor(name: string) {
      this.name = name;
      if (!listeners.has(name)) {
        listeners.set(name, new Set());
      }
    }

    postMessage(message: unknown) {
      for (const listener of listeners.get(this.name) ?? []) {
        listener({ data: message });
      }
    }

    addEventListener(
      _type: "message",
      listener: (event: { data: unknown }) => void
    ) {
      listeners.get(this.name)?.add(listener);
    }

    removeEventListener(
      _type: "message",
      listener: (event: { data: unknown }) => void
    ) {
      listeners.get(this.name)?.delete(listener);
    }

    close() {
      listeners.get(this.name)?.clear();
    }
  };
}

describe("resolveActaTabUrl", () => {
  it("accepts same-origin relative URLs", () => {
    expect(
      resolveActaTabUrl("/hub?panel=drafts", {
        location: {
          origin: "https://reca.example",
        },
      })
    ).toBe("https://reca.example/hub?panel=drafts");
  });

  it("accepts absolute https URLs", () => {
    expect(
      resolveActaTabUrl("https://drive.example/pdf", {
        location: {
          origin: "https://reca.example",
        },
      })
    ).toBe("https://drive.example/pdf");
  });

  it("rejects insecure or invalid URLs", () => {
    expect(
      resolveActaTabUrl("javascript:alert('xss')", {
        location: {
          origin: "https://reca.example",
        },
      })
    ).toBeNull();
    expect(
      resolveActaTabUrl("http://drive.example/pdf", {
        location: {
          origin: "https://reca.example",
        },
      })
    ).toBeNull();
  });
});

describe("openActaTabWithBrowser", () => {
  it("opens the target in a new tab when the browser allows it", () => {
    const open = vi.fn().mockReturnValue({ closed: false });

    const didOpen = openActaTabWithBrowser("https://sheet.example/1", {
      open,
      location: {
        origin: "https://reca.example",
      },
    });

    expect(didOpen).toBe(true);
    expect(open).toHaveBeenCalledWith(
      "https://sheet.example/1",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("returns false when the browser blocks the popup", () => {
    const open = vi.fn().mockReturnValue(null);

    const didOpen = openActaTabWithBrowser("/hub", {
      open,
      location: {
        origin: "https://reca.example",
      },
    });

    expect(didOpen).toBe(false);
    expect(open).toHaveBeenCalledWith(
      "https://reca.example/hub",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("returns false when the URL is invalid", () => {
    const open = vi.fn();

    const didOpen = openActaTabWithBrowser("javascript:alert('xss')", {
      open,
      location: {
        origin: "https://reca.example",
      },
    });

    expect(didOpen).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it("always uses the noopener and noreferrer features", () => {
    const open = vi.fn().mockReturnValue({});

    openActaTabWithBrowser("https://drive.example/pdf", {
      open,
      location: {
        origin: "https://reca.example",
      },
    });

    expect(open.mock.calls[0]?.[2]).toBe("noopener,noreferrer");
  });
});

describe("returnToHubTabWithBrowser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("focuses the registered hub tab and closes the current tab when possible", async () => {
    const BroadcastChannelCtor = createFakeBroadcastChannelCtor();
    const close = vi.fn();
    const focusHub = vi.fn();
    const focus = vi.fn();
    const hubBrowser = {
      focus: focusHub,
      location: {
        origin: "https://reca.example",
        href: "https://reca.example/hub",
      },
    };
    const cleanup = registerHubTabListenerWithBrowser(
      "/hub",
      hubBrowser,
      BroadcastChannelCtor
    );
    const browser = {
      close,
      setTimeout: vi.fn((callback: TimerHandler) => {
        if (typeof callback === "function") {
          Promise.resolve().then(callback);
        }

        return 1;
      }) as Window["setTimeout"],
      opener: {
        closed: true,
        focus,
        location: {
          href: "https://reca.example/formulario",
        },
      },
      location: {
        origin: "https://reca.example",
        href: "https://reca.example/finalizado",
      },
    };

    const didClose = await returnToHubTabWithBrowser(
      "/hub",
      browser,
      BroadcastChannelCtor
    );

    expect(didClose).toBe(true);
    expect(focusHub).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    cleanup();
  });

  it("falls back to same-tab navigation when no hub tab acknowledges the request", async () => {
    const BroadcastChannelCtor = createFakeBroadcastChannelCtor();
    const browser = {
      close: vi.fn(),
      setTimeout: vi.fn((callback: TimerHandler) => {
        if (typeof callback === "function") {
          callback();
        }

        return 1;
      }) as Window["setTimeout"],
      opener: null,
      location: {
        origin: "https://reca.example",
        href: "https://reca.example/finalizado",
      },
    };

    const didClose = await returnToHubTabWithBrowser(
      "/hub",
      browser,
      BroadcastChannelCtor
    );

    expect(didClose).toBe(false);
    expect(browser.close).not.toHaveBeenCalled();
    expect(browser.location.href).toBe("https://reca.example/hub");
  });
});
