import type { FormCompletionLinks } from "./FormCompletionActions";
import {
  closeActaTabWithBrowser,
  openActaTabWithBrowser,
  resolveActaTabUrl,
  type ActaTabBrowserLike,
  type ClosableActaTabBrowserLike,
} from "@/lib/actaTabs";

export type CompletionActionMode = "both" | "sheet" | "pdf";
export type CompletionActionTarget = "sheet" | "pdf";
export type CompletionActionFailureReason = "popup_blocked" | "invalid_url";

const POPUP_BLOCKED_MESSAGE =
  "No pudimos abrir el recurso. Revisa el bloqueador de popups o intenta de nuevo.";
const INVALID_URL_MESSAGE =
  "No pudimos abrir el recurso porque el enlace no es válido.";
const NOT_CLOSABLE_MESSAGE =
  "El recurso se abrió, pero esta pestaña no se pudo cerrar automáticamente. Puedes cerrarla manualmente.";

export type CompletionBrowserLike = ActaTabBrowserLike &
  ClosableActaTabBrowserLike;

export type CompletionActionFailure = {
  target: CompletionActionTarget;
  reason: CompletionActionFailureReason;
};

export type CompletionActionResult = {
  state:
    | "idle"
    | "completed"
    | "opened_but_not_closable"
    | "partial"
    | "failed";
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

const TARGET_LABELS: Record<CompletionActionTarget, string> = {
  sheet: "el acta",
  pdf: "el PDF",
};

function buildIdleResult(): CompletionActionResult {
  return {
    state: "idle",
    message: null,
    openedTargets: [],
    failedTargets: [],
  };
}

function getTargetLabel(target: CompletionActionTarget) {
  return TARGET_LABELS[target];
}

function formatTargetList(targets: CompletionActionTarget[]) {
  if (targets.length === 0) {
    return "";
  }

  if (targets.length === 1) {
    return getTargetLabel(targets[0]);
  }

  return `${getTargetLabel(targets[0])} y ${getTargetLabel(targets[1])}`;
}

function formatFailureReason(reason: CompletionActionFailureReason) {
  return reason === "invalid_url"
    ? "porque el enlace no es válido"
    : "por un bloqueo del navegador";
}

function buildFailedMessage(failedTargets: CompletionActionFailure[]) {
  if (failedTargets.length === 0) {
    return null;
  }

  if (failedTargets.length === 1) {
    return failedTargets[0].reason === "invalid_url"
      ? INVALID_URL_MESSAGE
      : POPUP_BLOCKED_MESSAGE;
  }

  const allInvalid = failedTargets.every(
    (failure) => failure.reason === "invalid_url"
  );
  if (allInvalid) {
    return "No pudimos abrir el acta ni el PDF porque los enlaces no son válidos.";
  }

  const allBlocked = failedTargets.every(
    (failure) => failure.reason === "popup_blocked"
  );
  if (allBlocked) {
    return "No pudimos abrir el acta ni el PDF. Revisa el bloqueador de popups o intenta de nuevo.";
  }

  const [firstFailure, secondFailure] = failedTargets;
  return `No pudimos abrir ${getTargetLabel(firstFailure.target)} ${formatFailureReason(firstFailure.reason)} ni ${getTargetLabel(secondFailure.target)} ${formatFailureReason(secondFailure.reason)}.`;
}

function buildPartialMessage(
  openedTargets: CompletionActionTarget[],
  failedTargets: CompletionActionFailure[]
) {
  if (openedTargets.length === 0 || failedTargets.length === 0) {
    return null;
  }

  const openedText = formatTargetList(openedTargets);
  if (failedTargets.length === 1) {
    const [failure] = failedTargets;
    if (failure.reason === "popup_blocked") {
      return `Abrimos ${openedText}, pero no pudimos abrir ${getTargetLabel(failure.target)}. Revisa el bloqueador de popups o intenta de nuevo.`;
    }

    return `Abrimos ${openedText}, pero no pudimos abrir ${getTargetLabel(failure.target)} porque el enlace no es válido.`;
  }

  const allInvalid = failedTargets.every(
    (failure) => failure.reason === "invalid_url"
  );
  if (allInvalid) {
    return `Abrimos ${openedText}, pero no pudimos abrir ${formatTargetList(
      failedTargets.map((failure) => failure.target)
    )} porque los enlaces no son válidos.`;
  }

  const allBlocked = failedTargets.every(
    (failure) => failure.reason === "popup_blocked"
  );
  if (allBlocked) {
    return `Abrimos ${openedText}, pero no pudimos abrir ${formatTargetList(
      failedTargets.map((failure) => failure.target)
    )}. Revisa el bloqueador de popups o intenta de nuevo.`;
  }

  const [firstFailure, secondFailure] = failedTargets;
  return `Abrimos ${openedText}, pero no pudimos abrir ${getTargetLabel(firstFailure.target)} ${formatFailureReason(firstFailure.reason)} ni ${getTargetLabel(secondFailure.target)} ${formatFailureReason(secondFailure.reason)}.`;
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

function buildSuccessResult(
  openedTargets: CompletionActionTarget[],
  browser: CompletionBrowserLike
): CompletionActionResult {
  if (closeActaTabWithBrowser(browser)) {
    return {
      state: "completed",
      message: null,
      openedTargets,
      failedTargets: [],
    };
  }

  return {
    state: "opened_but_not_closable",
    message: NOT_CLOSABLE_MESSAGE,
    openedTargets,
    failedTargets: [],
  };
}

function buildResultFromAttempts(
  attempts: AttemptTargetResult[],
  browser: CompletionBrowserLike
): CompletionActionResult {
  const openedTargets = attempts
    .filter((attempt): attempt is Extract<AttemptTargetResult, { opened: true }> => attempt.opened)
    .map((attempt) => attempt.target);
  const failedTargets = attempts
    .filter((attempt): attempt is Extract<AttemptTargetResult, { opened: false }> => !attempt.opened)
    .map((attempt) => ({
      target: attempt.target,
      reason: attempt.reason,
    }));

  if (openedTargets.length > 0 && failedTargets.length === 0) {
    return buildSuccessResult(openedTargets, browser);
  }

  if (openedTargets.length > 0) {
    return {
      state: "partial",
      message: buildPartialMessage(openedTargets, failedTargets),
      openedTargets,
      failedTargets,
    };
  }

  return {
    state: "failed",
    message: buildFailedMessage(failedTargets),
    openedTargets,
    failedTargets,
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

  if (mode === "both") {
    if (!links.sheetLink || !links.pdfLink) {
      return buildIdleResult();
    }

    return buildResultFromAttempts(
      [
        attemptOpenTarget("sheet", links.sheetLink, browser),
        attemptOpenTarget("pdf", links.pdfLink, browser),
      ],
      browser
    );
  }

  const target = mode === "sheet" ? links.sheetLink : links.pdfLink;
  const targetName = mode === "sheet" ? "sheet" : "pdf";
  if (!target) {
    return buildIdleResult();
  }

  return buildResultFromAttempts(
    [attemptOpenTarget(targetName, target, browser)],
    browser
  );
}
