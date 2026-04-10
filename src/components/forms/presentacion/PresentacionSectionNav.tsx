"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PresentacionSectionStatus } from "./PresentacionSectionCard";

export type PresentacionSectionNavItem = {
  id: string;
  label: string;
  shortLabel?: string;
  status: PresentacionSectionStatus;
};

type PresentacionSectionNavProps = {
  items: PresentacionSectionNavItem[];
  activeSectionId: string;
  onSelect: (id: string) => void;
};

function getStatusClasses(status: PresentacionSectionStatus, active: boolean) {
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

export function PresentacionSectionNav({
  items,
  activeSectionId,
  onSelect,
}: PresentacionSectionNavProps) {
  const asideRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [offsetY, setOffsetY] = useState(0);

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

  return (
    <>
      <div className="mb-6 overflow-x-auto lg:hidden">
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
        </div>
      </aside>
    </>
  );
}
