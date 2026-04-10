export type DraftsChangedDetail = {
  localChanged?: boolean;
  remoteChanged?: boolean;
};

const DRAFTS_CHANGED_EVENT = "reca:drafts-changed";

export function emitDraftsChanged(detail: DraftsChangedDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<DraftsChangedDetail>(DRAFTS_CHANGED_EVENT, {
      detail,
    })
  );
}

export function subscribeDraftsChanged(
  listener: (detail: DraftsChangedDetail) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<DraftsChangedDetail>;
    listener(customEvent.detail ?? {});
  };

  window.addEventListener(DRAFTS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(DRAFTS_CHANGED_EVENT, handler);
}
