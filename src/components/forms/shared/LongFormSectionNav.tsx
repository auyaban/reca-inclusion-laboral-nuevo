"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { LongFormSectionStatus } from "./LongFormSectionCard";

export type LongFormSectionNavItem = {
  id: string;
  label: string;
  shortLabel?: string;
  status: LongFormSectionStatus;
};

type LongFormSectionNavProps = {
  items: LongFormSectionNavItem[];
  activeSectionId: string;
  onSelect: (id: string) => void;
  draftStatus?: ReactNode;
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

export function LongFormSectionNav({
  items,
  activeSectionId,
  onSelect,
  draftStatus,
}: LongFormSectionNavProps) {
  const asideRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollerRef = useRef<HTMLDivElement | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [showMobileRightFade, setShowMobileRightFade] = useState(false);

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
                const active = item.id === activeSectionId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                      getStatusClasses(item.status, active)
                    )}
                  >
                    {item.shortLabel ?? item.label}
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
              const active = item.id === activeSectionId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    getStatusClasses(item.status, active)
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                      active
                        ? "border-white/40 bg-white/15 text-white"
                        : "border-current/20"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
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
