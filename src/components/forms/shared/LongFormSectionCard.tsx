"use client";

import type { ReactNode, RefObject } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type LongFormSectionStatus =
  | "active"
  | "completed"
  | "error"
  | "disabled"
  | "idle";

type LongFormSectionCardProps = {
  id: string;
  testId?: string;
  title: string;
  description?: string;
  status: LongFormSectionStatus;
  collapsed: boolean;
  onToggle?: () => void;
  children: ReactNode;
  sectionRef?: RefObject<HTMLElement | null>;
  onFocusCapture?: () => void;
};

export function LongFormSectionCard({
  id,
  testId,
  title,
  description,
  status,
  collapsed,
  onToggle,
  children,
  sectionRef,
  onFocusCapture,
}: LongFormSectionCardProps) {
  return (
    <section
      id={id}
      data-testid={testId}
      ref={sectionRef}
      onFocusCapture={onFocusCapture}
      className={cn(
        "scroll-mt-24 rounded-2xl border bg-white shadow-sm transition-colors",
        status === "active" && "border-reca shadow-md",
        status === "completed" && "border-green-200",
        status === "error" && "border-red-200",
        status === "disabled" && "border-gray-200 opacity-70",
        status === "idle" && "border-gray-200"
      )}
    >
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          ) : null}
        </div>

        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            {collapsed ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Expandir
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Colapsar
              </>
            )}
          </button>
        ) : null}
      </div>

      {!collapsed ? <div className="px-6 pb-6">{children}</div> : null}
    </section>
  );
}
