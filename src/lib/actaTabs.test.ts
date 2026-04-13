import { afterEach, describe, expect, it, vi } from "vitest";
import {
  openActaTabWithBrowser,
  resolveActaTabUrl,
  returnToHubTabWithBrowser,
} from "@/lib/actaTabs";

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

  it("reuses the opener tab and closes the current tab when possible", () => {
    const close = vi.fn();
    const focus = vi.fn();
    const browser = {
      close,
      setTimeout: vi.fn(),
      opener: {
        closed: false,
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

    const didClose = returnToHubTabWithBrowser("/hub", browser);

    expect(didClose).toBe(true);
    expect(browser.opener.location.href).toBe("https://reca.example/hub");
    expect(focus).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(browser.location.href).toBe("https://reca.example/finalizado");
  });

  it("falls back to same-tab navigation when there is no opener", () => {
    const browser = {
      close: vi.fn(),
      setTimeout: vi.fn(),
      opener: null,
      location: {
        origin: "https://reca.example",
        href: "https://reca.example/finalizado",
      },
    };

    const didClose = returnToHubTabWithBrowser("/hub", browser);

    expect(didClose).toBe(false);
    expect(browser.close).not.toHaveBeenCalled();
    expect(browser.location.href).toBe("https://reca.example/hub");
  });
});
