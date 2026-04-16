"use client";

export type LongFormHydrationIntent =
  | "new_form"
  | "silent_restore"
  | "explicit_restore"
  | "post_finalize";

export type LongFormStoredViewState<TSectionId extends string = string> = {
  activeSectionId: TSectionId;
  collapsedSections: Record<TSectionId, boolean>;
  scrollY: number;
};

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function buildLongFormViewStateStorageKey(slug: string, routeKey: string) {
  return `reca:long-form:view:${slug}:${routeKey}`;
}

export function saveLongFormViewState<TSectionId extends string>({
  slug,
  routeKey,
  viewState,
}: {
  slug: string;
  routeKey: string;
  viewState: LongFormStoredViewState<TSectionId>;
}) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(
    buildLongFormViewStateStorageKey(slug, routeKey),
    JSON.stringify(viewState)
  );
}

export function loadLongFormViewState<TSectionId extends string>({
  slug,
  routeKey,
}: {
  slug: string;
  routeKey: string;
}) {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(
    buildLongFormViewStateStorageKey(slug, routeKey)
  );
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const activeSectionId = parsed.activeSectionId;
    const collapsedSections = parsed.collapsedSections;
    const scrollY = parsed.scrollY;

    if (
      typeof activeSectionId !== "string" ||
      !isRecord(collapsedSections) ||
      typeof scrollY !== "number" ||
      Number.isNaN(scrollY)
    ) {
      return null;
    }

    return {
      activeSectionId: activeSectionId as TSectionId,
      collapsedSections: collapsedSections as Record<TSectionId, boolean>,
      scrollY,
    } satisfies LongFormStoredViewState<TSectionId>;
  } catch {
    return null;
  }
}

export function clearLongFormViewState({
  slug,
  routeKey,
}: {
  slug: string;
  routeKey: string;
}) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(buildLongFormViewStateStorageKey(slug, routeKey));
}

export function restoreLongFormScroll(options: {
  scrollY?: number | null;
  sectionElement?: HTMLElement | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (typeof options.scrollY === "number") {
        window.scrollTo({ top: options.scrollY, behavior: "auto" });
        return;
      }

      options.sectionElement?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });
  });
}
