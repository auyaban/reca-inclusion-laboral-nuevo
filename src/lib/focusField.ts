type FocusFieldOptions = {
  scroll?: boolean;
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
};

function escapeSelectorValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function focusFieldByName(
  fieldName: string,
  options: FocusFieldOptions = {}
) {
  if (typeof document === "undefined") {
    return false;
  }

  const element = document.querySelector<HTMLElement>(
    `[name="${escapeSelectorValue(fieldName)}"]`
  );

  if (!element) {
    return false;
  }

  if (options.scroll) {
    element.scrollIntoView({
      behavior: options.behavior ?? "smooth",
      block: options.block ?? "center",
    });
  }

  try {
    element.focus({ preventScroll: !options.scroll });
  } catch {
    element.focus();
  }

  return true;
}

export function focusFieldByNameAfterPaint(
  fieldName: string,
  options: FocusFieldOptions = {},
  frames = 2
) {
  if (typeof window === "undefined") {
    return;
  }

  let pendingFrames = Math.max(1, frames);
  const run = () => {
    pendingFrames -= 1;
    if (pendingFrames > 0) {
      window.requestAnimationFrame(run);
      return;
    }

    focusFieldByName(fieldName, options);
  };

  window.requestAnimationFrame(run);
}
