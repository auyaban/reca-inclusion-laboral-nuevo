"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BackofficeBadge } from "@/components/backoffice";
import { cn } from "@/lib/utils";

type LifecycleCollapsibleProps = {
  title: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
  description?: string;
  testId?: string;
  tone?: "neutral" | "reca" | "info" | "warning" | "success";
  variant?: "section" | "timeline" | "subtle";
};

const VARIANT_CLASSNAMES: Record<
  NonNullable<LifecycleCollapsibleProps["variant"]>,
  string
> = {
  section: "border-gray-200 bg-white",
  timeline: "border-reca-200 bg-white",
  subtle: "border-gray-200 bg-gray-50",
};

export default function LifecycleCollapsible({
  title,
  count,
  children,
  defaultOpen = false,
  description,
  testId,
  tone,
  variant = "section",
}: LifecycleCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  const resolvedTone = tone ?? (count > 0 ? "reca" : "neutral");

  return (
    <section
      className={cn(
        "rounded-xl border shadow-sm transition-colors",
        VARIANT_CLASSNAMES[variant],
        open ? "ring-1 ring-reca-100" : "hover:border-gray-300"
      )}
      data-testid={testId}
    >
      <button
        aria-controls={contentId}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reca focus-visible:ring-offset-2"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs font-medium text-gray-600">
              {description}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <BackofficeBadge tone={resolvedTone}>{count}</BackofficeBadge>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 text-gray-600 transition-transform",
              open && "rotate-180 text-reca"
            )}
          />
        </span>
      </button>
      <div
        className="border-t border-gray-200 px-4 py-4"
        hidden={!open}
        id={contentId}
      >
        {children}
      </div>
    </section>
  );
}
