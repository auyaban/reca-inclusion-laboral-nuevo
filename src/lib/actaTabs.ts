"use client";

export function getActaTabLinkProps(url: string) {
  return {
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
  } as const;
}

export function openActaTab(url: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const nextUrl = new URL(url, window.location.origin).toString();
  const nextTab = window.open(nextUrl, "_blank", "noopener,noreferrer");

  if (nextTab) {
    nextTab.opener = null;
    return true;
  }

  return false;
}
