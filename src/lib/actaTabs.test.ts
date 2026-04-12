import { describe, expect, it, vi } from "vitest";
import { openActaTabWithBrowser } from "@/lib/actaTabs";

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
