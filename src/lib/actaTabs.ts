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

type FocusHubBrowserLike = {
  focus?: () => void;
  location: Pick<Location, "origin" | "href">;
};

type BroadcastChannelMessageEventLike = {
  data: unknown;
};

type BroadcastChannelLike = {
  postMessage: (message: unknown) => void;
  addEventListener: (
    type: "message",
    listener: (event: BroadcastChannelMessageEventLike) => void
  ) => void;
  removeEventListener: (
    type: "message",
    listener: (event: BroadcastChannelMessageEventLike) => void
  ) => void;
  close: () => void;
};

type BroadcastChannelCtorLike = new (name: string) => BroadcastChannelLike;

const HUB_RETURN_CHANNEL_NAME = "reca-hub-return";
const HUB_RETURN_TIMEOUT_MS = 150;
const HUB_CLOSE_FALLBACK_MS = 60;

function getBroadcastChannelCtor() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }

  return window.BroadcastChannel as BroadcastChannelCtorLike;
}

function buildHubReturnRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `hub-return-${Date.now()}`;
}

function isHubFocusRequestMessage(
  value: unknown
): value is { type: "focus_hub"; requestId: string; hubUrl: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      "requestId" in value &&
      "hubUrl" in value &&
      (value as { type?: unknown }).type === "focus_hub" &&
      typeof (value as { requestId?: unknown }).requestId === "string" &&
      typeof (value as { hubUrl?: unknown }).hubUrl === "string"
  );
}

function isHubFocusAckMessage(
  value: unknown
): value is { type: "focus_hub_ack"; requestId: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      "requestId" in value &&
      (value as { type?: unknown }).type === "focus_hub_ack" &&
      typeof (value as { requestId?: unknown }).requestId === "string"
  );
}

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

export function registerHubTabListenerWithBrowser(
  hubPath: string,
  browser: FocusHubBrowserLike,
  BroadcastChannelCtor: BroadcastChannelCtorLike | null = getBroadcastChannelCtor()
) {
  const nextUrl = resolveActaTabUrl(hubPath, browser);
  if (!nextUrl || !BroadcastChannelCtor) {
    return () => {};
  }

  const channel = new BroadcastChannelCtor(HUB_RETURN_CHANNEL_NAME);
  const onMessage = (event: BroadcastChannelMessageEventLike) => {
    if (!isHubFocusRequestMessage(event.data) || event.data.hubUrl !== nextUrl) {
      return;
    }

    try {
      browser.focus?.();
    } catch {
      // ignore
    }

    if (browser.location.href !== nextUrl) {
      browser.location.href = nextUrl;
    }

    channel.postMessage({
      type: "focus_hub_ack",
      requestId: event.data.requestId,
    });
  };

  channel.addEventListener("message", onMessage);

  return () => {
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
}

export function registerHubTabListener(hubPath = "/hub") {
  if (typeof window === "undefined") {
    return () => {};
  }

  return registerHubTabListenerWithBrowser(hubPath, window);
}

export async function returnToHubTabWithBrowser(
  hubPath: string,
  browser: ReturnToHubBrowserLike,
  BroadcastChannelCtor: BroadcastChannelCtorLike | null = getBroadcastChannelCtor()
) {
  const nextUrl = resolveActaTabUrl(hubPath, browser);
  if (!nextUrl) {
    return false;
  }

  if (!BroadcastChannelCtor) {
    browser.location.href = nextUrl;
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const requestId = buildHubReturnRequestId();
    const channel = new BroadcastChannelCtor(HUB_RETURN_CHANNEL_NAME);
    let timeoutId: ReturnType<Window["setTimeout"]> | null = null;

    const cleanup = () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const onMessage = (event: BroadcastChannelMessageEventLike) => {
      if (!isHubFocusAckMessage(event.data) || event.data.requestId !== requestId) {
        return;
      }

      cleanup();
      browser.close();
      browser.setTimeout(() => {
        browser.location.href = nextUrl;
      }, HUB_CLOSE_FALLBACK_MS);
      resolve(true);
    };

    timeoutId = browser.setTimeout(() => {
      cleanup();
      browser.location.href = nextUrl;
      resolve(false);
    }, HUB_RETURN_TIMEOUT_MS);

    channel.addEventListener("message", onMessage);
    channel.postMessage({
      type: "focus_hub",
      requestId,
      hubUrl: nextUrl,
    });
  });
}

export async function returnToHubTab(hubPath = "/hub") {
  if (typeof window === "undefined") {
    return false;
  }

  return returnToHubTabWithBrowser(hubPath, window);
}
