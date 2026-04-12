"use client";

export function getActaTabLinkProps(url: string) {
  return {
    href: url,
    target: "_blank",
  } as const;
}

export function openActaTab(url: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const nextUrl = new URL(url, window.location.origin).toString();
  const nextTab = window.open(nextUrl, "_blank");

  if (nextTab) {
    return true;
  }

  return false;
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
