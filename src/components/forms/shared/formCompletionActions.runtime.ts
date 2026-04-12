import type { FormCompletionLinks } from "./FormCompletionActions";
import { openActaTabWithBrowser } from "@/lib/actaTabs";

export type CompletionActionMode = "both" | "sheet" | "pdf";

const POPUP_BLOCKED_MESSAGE =
  "El navegador bloqueo la apertura del acta. Permite popups o usa los botones individuales.";

export type CompletionBrowserLike = {
  open: Window["open"];
  close: Window["close"];
  setTimeout: Window["setTimeout"];
  opener: Window["opener"];
  location: Pick<Location, "origin" | "assign" | "replace">;
};

export type CompletionActionResult = {
  error: string | null;
};

export function closeCompletedTab(browser: CompletionBrowserLike) {
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
}

export function openCompletionAction(
  mode: CompletionActionMode,
  links: FormCompletionLinks | null,
  browser: CompletionBrowserLike
) {
  if (!links) {
    return { error: null } satisfies CompletionActionResult;
  }

  if (mode === "both") {
    if (!links.sheetLink || !links.pdfLink) {
      return { error: null } satisfies CompletionActionResult;
    }

    const didOpenSheet = openActaTabWithBrowser(links.sheetLink, browser);
    if (!didOpenSheet) {
      return {
        error: POPUP_BLOCKED_MESSAGE,
      } satisfies CompletionActionResult;
    }

    browser.location.replace(links.pdfLink);
    return { error: null } satisfies CompletionActionResult;
  }

  const target = mode === "sheet" ? links.sheetLink : links.pdfLink;
  if (!target) {
    return { error: null } satisfies CompletionActionResult;
  }

  const didOpenTarget = openActaTabWithBrowser(target, browser);
  if (didOpenTarget) {
    closeCompletedTab(browser);
  } else {
    browser.location.assign(target);
  }

  return { error: null } satisfies CompletionActionResult;
}
