"use client";

type ActaTabBrowserLike = {
  open: Window["open"];
  location: Pick<Location, "origin">;
};

export function getActaTabLinkProps(url: string) {
  return {
    href: url,
    target: "_blank",
  } as const;
}

export function openActaTabWithBrowser(url: string, browser: ActaTabBrowserLike) {
  const nextUrl = new URL(url, browser.location.origin).toString();
  const nextTab = browser.open(nextUrl, "_blank", "noopener,noreferrer");
  return Boolean(nextTab);
}

export function openActaTab(url: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return openActaTabWithBrowser(url, window);
}

export function returnToHubTab(hubPath = "/hub") {
  if (typeof window === "undefined") {
    return false;
  }

  const nextUrl = new URL(hubPath, window.location.origin).toString();

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.location.href = nextUrl;
      window.opener.focus();
      window.close();
      return true;
    } catch {
      // Si el navegador bloquea focus/close, caemos al fallback local.
    }
  }

  window.location.href = nextUrl;
  return false;
}
