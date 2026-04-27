"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { LongFormSectionStatus } from "./LongFormSectionCard";

export type LongFormSectionNavLeafItem = {
  type?: "item";
  id: string;
  label: string;
  shortLabel?: string;
  status: LongFormSectionStatus;
  metaLabel?: string;
  metaTone?: "warning" | "muted" | "info";
};

export type LongFormSectionNavGroupItem = {
  type: "group";
  id: string;
  label: string;
  shortLabel?: string;
  metaLabel?: string;
  metaTone?: "warning" | "muted" | "info";
  children: LongFormSectionNavLeafItem[];
};

export type LongFormSectionNavItem =
  | LongFormSectionNavLeafItem
  | LongFormSectionNavGroupItem;

type LongFormSectionNavProps = {
  items: LongFormSectionNavItem[];
  activeSectionId: string;
  onSelect: (id: string) => void;
  draftStatus?: ReactNode;
  initialAutoExpandGroups?: boolean;
  autoExpandOnActiveChange?: boolean;
  autoExpandActiveGroups?: boolean;
};

function getStatusClasses(status: LongFormSectionStatus, active: boolean) {
  if (active) {
    return "border-reca bg-reca text-white";
  }

  if (status === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "completed") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "disabled") {
    return "border-gray-200 bg-gray-50 text-gray-400";
  }

  return "border-gray-200 bg-white text-gray-600";
}

function isGroupItem(
  item: LongFormSectionNavItem
): item is LongFormSectionNavGroupItem {
  return item.type === "group";
}

function isGroupActive(
  item: LongFormSectionNavGroupItem,
  activeSectionId: string
) {
  return item.children.some((child) => child.id === activeSectionId);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getNumericMarker(value?: string) {
  const match = value?.trim().match(/^(\d+(?:\.\d+)*)(?:\b|\.|\s)/);
  return match?.[1] ?? null;
}

function getNavMarker({
  label,
  shortLabel,
  index,
  parentMarker,
}: {
  label: string;
  shortLabel?: string;
  index: number;
  parentMarker?: string;
}) {
  return (
    getNumericMarker(shortLabel) ??
    getNumericMarker(label) ??
    (parentMarker ? `${parentMarker}.${index + 1}` : String(index + 1))
  );
}

function getNavDisplayLabel(label: string, shortLabel?: string) {
  let next = label
    .trim()
    .replace(/^\d+(?:\.\d+)*\s*[\.\-–—:]?\s*/, "")
    .trim();

  if (shortLabel && !getNumericMarker(shortLabel)) {
    const shortLabelPrefix = new RegExp(
      `^${escapeRegExp(shortLabel.trim())}\\s*[-–—:]?\\s*`,
      "i"
    );
    const withoutShortLabel = next.replace(shortLabelPrefix, "").trim();
    if (withoutShortLabel) {
      next = withoutShortLabel;
    }
  }

  return next || label.trim();
}

function findGroupIdForSection(
  items: LongFormSectionNavItem[],
  sectionId: string
) {
  return (
    items.find(
      (item): item is LongFormSectionNavGroupItem =>
        isGroupItem(item) && isGroupActive(item, sectionId)
    )?.id ?? null
  );
}

function deriveGroupStatus(
  item: LongFormSectionNavGroupItem,
  activeSectionId: string
): LongFormSectionStatus {
  const childStatuses = item.children.map((child) => child.status);

  if (childStatuses.every((status) => status === "disabled")) {
    return "disabled";
  }

  if (childStatuses.every((status) => status === "completed")) {
    return "completed";
  }

  if (
    !isGroupActive(item, activeSectionId) &&
    childStatuses.some((status) => status === "error")
  ) {
    return "error";
  }

  return "idle";
}

function getInitialExpandedGroupIds(
  items: LongFormSectionNavItem[],
  activeSectionId: string,
  autoExpandActiveGroups: boolean
) {
  if (!autoExpandActiveGroups) {
    return new Set<string>();
  }

  return new Set(
    items
      .filter(isGroupItem)
      .filter((item) => isGroupActive(item, activeSectionId))
      .map((item) => item.id)
  );
}

type NavButtonProps = {
  label: string;
  active: boolean;
  status: LongFormSectionStatus;
  onClick: () => void;
  iconLabel: string;
  metaLabel?: string;
  metaTone?: "warning" | "muted" | "info";
  testId?: string;
  className?: string;
  ariaExpanded?: boolean;
  trailingChevron?: boolean;
};

function getMetaClasses(tone: "warning" | "muted" | "info" = "muted") {
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (tone === "info") {
    return "border-reca-200 bg-reca-50 text-reca";
  }

  return "border-gray-200 bg-gray-50 text-gray-500";
}

function NavButton({
  label,
  active,
  status,
  onClick,
  iconLabel,
  metaLabel,
  metaTone = "muted",
  testId,
  className,
  ariaExpanded,
  trailingChevron = false,
}: NavButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
        getStatusClasses(status, active),
        className
      )}
    >
      <span
        className={cn(
          "flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-full border px-2 text-xs font-bold",
          active ? "border-white/40 bg-white/15 text-white" : "border-current/20"
        )}
      >
        {iconLabel}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {metaLabel ? (
          <span
            className={cn(
              "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              active ? "border-white/30 bg-white/10 text-white" : getMetaClasses(metaTone)
            )}
          >
            {metaLabel}
          </span>
        ) : null}
      </span>
      {trailingChevron ? (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            ariaExpanded ? "rotate-180" : undefined
          )}
        />
      ) : null}
    </button>
  );
}

export function LongFormSectionNav({
  items,
  activeSectionId,
  onSelect,
  draftStatus,
  initialAutoExpandGroups,
  autoExpandOnActiveChange,
  autoExpandActiveGroups = true,
}: LongFormSectionNavProps) {
  const shouldAutoExpandInitially =
    initialAutoExpandGroups ?? autoExpandActiveGroups;
  const shouldAutoExpandOnActiveChange =
    autoExpandOnActiveChange ?? autoExpandActiveGroups;
  const asideRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollerRef = useRef<HTMLDivElement | null>(null);
  const previousActiveSectionIdRef = useRef(activeSectionId);
  const [offsetY, setOffsetY] = useState(0);
  const [showMobileRightFade, setShowMobileRightFade] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() =>
    getInitialExpandedGroupIds(items, activeSectionId, shouldAutoExpandInitially)
  );

  useEffect(() => {
    const previousActiveSectionId = previousActiveSectionIdRef.current;
    const activeSectionChanged =
      previousActiveSectionId !== activeSectionId;
    previousActiveSectionIdRef.current = activeSectionId;
    const previousActiveGroupId = findGroupIdForSection(
      items,
      previousActiveSectionId
    );
    const activeGroupId = findGroupIdForSection(items, activeSectionId);
    const activeGroupChanged = previousActiveGroupId !== activeGroupId;

    setExpandedGroupIds((current) => {
      const knownGroupIds = new Set(
        items.filter(isGroupItem).map((item) => item.id)
      );
      const next = new Set(
        [...current].filter((groupId) => knownGroupIds.has(groupId))
      );

      if (
        shouldAutoExpandOnActiveChange &&
        activeSectionChanged &&
        activeGroupChanged
      ) {
        for (const item of items) {
          if (isGroupItem(item) && isGroupActive(item, activeSectionId)) {
            next.add(item.id);
          }
        }
      }

      if (
        next.size === current.size &&
        [...next].every((groupId) => current.has(groupId))
      ) {
        return current;
      }

      return next;
    });
  }, [activeSectionId, items, shouldAutoExpandOnActiveChange]);

  const expandedGroups = useMemo(
    () =>
      items.filter(
        (item): item is LongFormSectionNavGroupItem =>
          isGroupItem(item) && expandedGroupIds.has(item.id)
      ),
    [expandedGroupIds, items]
  );

  function toggleGroup(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  useEffect(() => {
    function updatePanelOffset() {
      if (window.innerWidth < 1024 || !asideRef.current || !panelRef.current) {
        setOffsetY(0);
        return;
      }

      const aside = asideRef.current;
      const panel = panelRef.current;
      const asideRect = aside.getBoundingClientRect();
      const asideTop = asideRect.top + window.scrollY;
      const availableSpace = Math.max(0, aside.offsetHeight - panel.offsetHeight);
      const desiredOffset = Math.max(0, window.scrollY - asideTop + 96);

      setOffsetY(Math.min(desiredOffset, availableSpace));
    }

    updatePanelOffset();
    window.addEventListener("scroll", updatePanelOffset, { passive: true });
    window.addEventListener("resize", updatePanelOffset);

    return () => {
      window.removeEventListener("scroll", updatePanelOffset);
      window.removeEventListener("resize", updatePanelOffset);
    };
  }, []);

  useEffect(() => {
    if (!mobileScrollerRef.current) {
      setShowMobileRightFade(false);
      return;
    }

    function updateMobileOverflowState() {
      const scroller = mobileScrollerRef.current;
      if (!scroller) {
        setShowMobileRightFade(false);
        return;
      }

      if (window.innerWidth >= 1024) {
        setShowMobileRightFade(false);
        return;
      }

      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      const hasRightOverflow =
        maxScrollLeft > 4 && scroller.scrollLeft < maxScrollLeft - 4;
      setShowMobileRightFade(hasRightOverflow);
    }

    updateMobileOverflowState();
    const scroller = mobileScrollerRef.current;
    if (!scroller) {
      return;
    }

    scroller.addEventListener("scroll", updateMobileOverflowState, {
      passive: true,
    });
    window.addEventListener("resize", updateMobileOverflowState);

    return () => {
      scroller.removeEventListener("scroll", updateMobileOverflowState);
      window.removeEventListener("resize", updateMobileOverflowState);
    };
  }, [activeSectionId, items.length]);

  return (
    <>
      <div className="mb-6 lg:hidden">
        <div className="relative">
          <div
            ref={mobileScrollerRef}
            className="overflow-x-auto pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex min-w-max gap-2 pb-1">
              {items.map((item) => {
                if (isGroupItem(item)) {
                  const active = isGroupActive(item, activeSectionId);
                  const status = deriveGroupStatus(item, activeSectionId);
                  const expanded = expandedGroupIds.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`long-form-nav-mobile-group-${item.id}`}
                      aria-expanded={expanded}
                      onClick={() => toggleGroup(item.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                        getStatusClasses(status, active)
                      )}
                    >
                      <span>{item.shortLabel ?? item.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform",
                          expanded ? "rotate-180" : undefined
                        )}
                      />
                    </button>
                  );
                }

                const active = item.id === activeSectionId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`long-form-nav-mobile-item-${item.id}`}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                      getStatusClasses(item.status, active)
                    )}
                  >
                    <span>{item.shortLabel ?? item.label}</span>
                    {item.metaLabel ? (
                      <span
                        className={cn(
                          "ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          active
                            ? "border-white/30 bg-white/10 text-white"
                            : getMetaClasses(item.metaTone)
                        )}
                      >
                        {item.metaLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {showMobileRightFade ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-50 via-gray-50/95 to-transparent"
            />
          ) : null}
        </div>

        {expandedGroups.length ? (
          <div className="mt-2 space-y-2">
            {expandedGroups.map((group) => (
              <div
                key={group.id}
                data-testid={`long-form-nav-mobile-group-children-${group.id}`}
                className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex min-w-max gap-2 pb-1">
                  {group.children.map((child) => {
                    const active = child.id === activeSectionId;

                    return (
                      <button
                        key={child.id}
                        type="button"
                        data-testid={`long-form-nav-mobile-child-${child.id}`}
                        onClick={() => onSelect(child.id)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                        getStatusClasses(child.status, active)
                      )}
                    >
                        <span>{child.shortLabel ?? child.label}</span>
                        {child.metaLabel ? (
                          <span
                            className={cn(
                              "ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              active
                                ? "border-white/30 bg-white/10 text-white"
                                : getMetaClasses(child.metaTone)
                            )}
                          >
                            {child.metaLabel}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {draftStatus ? <div className="mt-3">{draftStatus}</div> : null}
      </div>

      <aside ref={asideRef} className="relative hidden h-full lg:block">
        <div
          ref={panelRef}
          style={{ transform: `translateY(${offsetY}px)` }}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-transform duration-150"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
            Navegación
          </p>
          <div className="space-y-2">
            {items.map((item, index) => {
              if (isGroupItem(item)) {
                const active = isGroupActive(item, activeSectionId);
                const status = deriveGroupStatus(item, activeSectionId);
                const expanded = expandedGroupIds.has(item.id);
                const marker = getNavMarker({
                  label: item.label,
                  shortLabel: item.shortLabel,
                  index,
                });

                return (
                  <div key={item.id} className="space-y-2">
                    <NavButton
                      label={getNavDisplayLabel(item.label, item.shortLabel)}
                      active={active}
                      status={status}
                      onClick={() => toggleGroup(item.id)}
                      iconLabel={marker}
                      metaLabel={item.metaLabel}
                      metaTone={item.metaTone}
                      testId={`long-form-nav-desktop-group-${item.id}`}
                      ariaExpanded={expanded}
                      trailingChevron
                    />

                    {expanded ? (
                      <div
                        data-testid={`long-form-nav-desktop-group-children-${item.id}`}
                        className="ml-5 space-y-2 border-l border-gray-100 pl-4"
                      >
                        {item.children.map((child, childIndex) => {
                          const childActive = child.id === activeSectionId;

                          return (
                            <NavButton
                              key={child.id}
                              label={getNavDisplayLabel(
                                child.label,
                                child.shortLabel
                              )}
                              active={childActive}
                              status={child.status}
                              onClick={() => onSelect(child.id)}
                              iconLabel={getNavMarker({
                                label: child.label,
                                shortLabel: child.shortLabel,
                                index: childIndex,
                                parentMarker: marker,
                              })}
                              metaLabel={child.metaLabel}
                              metaTone={child.metaTone}
                              testId={`long-form-nav-desktop-child-${child.id}`}
                              className="py-2.5"
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              const active = item.id === activeSectionId;

              return (
                <NavButton
                  key={item.id}
                  label={getNavDisplayLabel(item.label, item.shortLabel)}
                  active={active}
                  status={item.status}
                  onClick={() => onSelect(item.id)}
                  iconLabel={getNavMarker({
                    label: item.label,
                    shortLabel: item.shortLabel,
                    index,
                  })}
                  metaLabel={item.metaLabel}
                  metaTone={item.metaTone}
                  testId={`long-form-nav-desktop-item-${item.id}`}
                />
              );
            })}
          </div>
          {draftStatus ? (
            <div className="mt-4 border-t border-gray-100 pt-4">{draftStatus}</div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
