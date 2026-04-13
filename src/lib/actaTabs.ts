"use client";

const ABSOLUTE_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export type ActaTabBrowserLike = {
  open: Window["open"];
  location: Pick<Location, "origin">;
};

export type ActaTabOpenerLike = {
  closed: boolean;
  focus: () => void;
  location: {
    href: string;
  };
};

export type ClosableActaTabBrowserLike = {
  close: Window["close"];
  setTimeout: Window["setTimeout"];
  opener: ActaTabOpenerLike | null;
};

export type ReturnToHubBrowserLike = ClosableActaTabBrowserLike & {
  location: Pick<Location, "origin" | "href">;
};

export function getActaTabLinkProps(url: string) {
  return {
    href: url,
    target: "_blank",
  } as const;
}

export function resolveActaTabUrl(
  url: string,
  browser: Pick<ActaTabBrowserLike, "location">
) {
  const nextValue = url.trim();
  if (!nextValue) {
    return null;
  }

  try {
    if (!ABSOLUTE_SCHEME_PATTERN.test(nextValue) && !nextValue.startsWith("//")) {
      const resolvedUrl = new URL(nextValue, browser.location.origin);
      return resolvedUrl.origin === browser.location.origin
        ? resolvedUrl.toString()
        : null;
    }

    const resolvedUrl = new URL(nextValue);
    return resolvedUrl.protocol === "https:" ? resolvedUrl.toString() : null;
  } catch {
    return null;
  }
}

export function openActaTabWithBrowser(url: string, browser: ActaTabBrowserLike) {
  const nextUrl = resolveActaTabUrl(url, browser);
  if (!nextUrl) {
    return false;
  }

  const nextTab = browser.open(nextUrl, "_blank", "noopener,noreferrer");
  return Boolean(nextTab);
}

export function openActaTab(url: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return openActaTabWithBrowser(url, window);
}

export function canCloseActaTab(browser: Pick<ClosableActaTabBrowserLike, "opener">) {
  return Boolean(browser.opener && !browser.opener.closed);
}

export function closeActaTabWithBrowser(browser: ClosableActaTabBrowserLike) {
  if (!canCloseActaTab(browser)) {
    return false;
  }

  browser.setTimeout(() => {
    if (browser.opener && !browser.opener.closed) {
      try {
        browser.opener.focus();
      } catch {
        // ignore
      }
    }

    browser.close();
  }, 50);

  return true;
}

export function returnToHubTabWithBrowser(
  hubPath: string,
  browser: ReturnToHubBrowserLike
) {
  const nextUrl = resolveActaTabUrl(hubPath, browser);
  if (!nextUrl) {
    return false;
  }

  if (canCloseActaTab(browser) && browser.opener) {
    try {
      browser.opener.location.href = nextUrl;
      browser.opener.focus();
      browser.close();
      return true;
    } catch {
      // Si el navegador bloquea focus/close, caemos al fallback local.
    }
  }

  browser.location.href = nextUrl;
  return false;
}

export function returnToHubTab(hubPath = "/hub") {
  if (typeof window === "undefined") {
    return false;
  }

  return returnToHubTabWithBrowser(hubPath, window);
}
