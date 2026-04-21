import type { FormCompletionLinks } from "./FormCompletionActions";
import {
  openActaTabWithBrowser,
  resolveActaTabUrl,
  type ActaTabBrowserLike,
} from "@/lib/actaTabs";

export type CompletionActionMode = "sheet" | "pdf";
export type CompletionActionTarget = "sheet" | "pdf";
export type CompletionActionFailureReason = "popup_blocked" | "invalid_url";

const POPUP_BLOCKED_MESSAGE =
  "No pudimos abrir el recurso. Revisa el bloqueador de popups o intenta de nuevo.";
const INVALID_URL_MESSAGE =
  "No pudimos abrir el recurso porque el enlace no es válido.";

export type CompletionBrowserLike = ActaTabBrowserLike;

export type CompletionActionFailure = {
  target: CompletionActionTarget;
  reason: CompletionActionFailureReason;
};

export type CompletionActionResult = {
  state: "idle" | "completed" | "failed";
  message: string | null;
  openedTargets: CompletionActionTarget[];
  failedTargets: CompletionActionFailure[];
};

type AttemptTargetResult =
  | {
      opened: true;
      target: CompletionActionTarget;
    }
  | {
      opened: false;
      target: CompletionActionTarget;
      reason: CompletionActionFailureReason;
    };

function buildIdleResult(): CompletionActionResult {
  return {
    state: "idle",
    message: null,
    openedTargets: [],
    failedTargets: [],
  };
}

function buildFailedMessage(reason: CompletionActionFailureReason) {
  return reason === "invalid_url" ? INVALID_URL_MESSAGE : POPUP_BLOCKED_MESSAGE;
}

function attemptOpenTarget(
  target: CompletionActionTarget,
  url: string,
  browser: CompletionBrowserLike
): AttemptTargetResult {
  if (!resolveActaTabUrl(url, browser)) {
    return {
      opened: false,
      target,
      reason: "invalid_url",
    };
  }

  if (!openActaTabWithBrowser(url, browser)) {
    return {
      opened: false,
      target,
      reason: "popup_blocked",
    };
  }

  return {
    opened: true,
    target,
  };
}

function buildResultFromAttempt(
  attempt: AttemptTargetResult
): CompletionActionResult {
  if (attempt.opened) {
    return {
      state: "completed",
      message: null,
      openedTargets: [attempt.target],
      failedTargets: [],
    };
  }

  return {
    state: "failed",
    message: buildFailedMessage(attempt.reason),
    openedTargets: [],
    failedTargets: [
      {
        target: attempt.target,
        reason: attempt.reason,
      },
    ],
  };
}

export function openCompletionAction(
  mode: CompletionActionMode,
  links: FormCompletionLinks | null,
  browser: CompletionBrowserLike
) {
  if (!links) {
    return buildIdleResult();
  }

  const target = mode === "sheet" ? links.sheetLink : links.pdfLink;
  const targetName = mode === "sheet" ? "sheet" : "pdf";
  if (!target) {
    return buildIdleResult();
  }

  return buildResultFromAttempt(
    attemptOpenTarget(targetName, target, browser)
  );
}
